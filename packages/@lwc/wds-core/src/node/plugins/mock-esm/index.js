import { resolve as pathResolve, dirname } from 'node:path';
import { makeMockControllerHandler } from './controller.js';
import { makeMockedModuleHandler } from './mock-resolved.js';
import { makeMockStubHandler } from './mock-stub.js';
import { makeMockImportResolver } from './resolve/mock-import.js';
import { makeNonexistentMockedModuleResolver } from './resolve/nonexistent-mocked-module.js';

function makeRecursiveResolve(allPlugins) {
  const resolvers = allPlugins
    .filter((plugin) => plugin.name !== 'mock-esm')
    .map((plugin) => plugin?.resolveImport?.bind?.(plugin))
    .filter(Boolean);

  return async function resolveImport({ source, context }) {
    let resolvedImport = pathResolve(dirname(context.request.url), source);
    let importExists = true;

    try {
      for (const resolveImport of resolvers) {
        const resolved = await resolveImport({ source, context });
        if (resolved) {
          return {
            resolvedImport: pathResolve(dirname(context.request.url), resolved?.id ?? resolved),
            importExists: true,
          };
        }
      }
    } catch (err) {
      importExists = false;
      if (source[0] !== '.' && source[0] !== '.') {
        resolvedImport = source;
      }
    }

    return {
      resolvedImport,
      importExists,
    };
  };
}

export default ({ rootDir }) => {
  const mockedModules = new Map();

  let resolveMockImport;
  const resolveNonexistentMockedModule = makeNonexistentMockedModuleResolver({ mockedModules });
  const serveMockController = makeMockControllerHandler({ mockedModules, rootDir });
  const serveMockStub = makeMockStubHandler({ mockedModules });
  const serveMockedModule = makeMockedModuleHandler({ mockedModules });

  return {
    name: 'mock-esm',

    serverStart({ config }) {
      if (!config.plugins) {
        throw new Error(
          'Implementation error: expected plugins to be passed to mock-esm serverStart',
        );
      }
      const recursiveResolve = makeRecursiveResolve(config.plugins);
      resolveMockImport = makeMockImportResolver({ mockedModules, recursiveResolve });
    },

    async serve(context) {
      const { path, query } = context;
      const body =
        serveMockController(path, query) ?? serveMockedModule(path, query) ?? serveMockStub(path);
      return body ? { body, type: 'text/javascript' } : undefined;
    },

    async resolveImport({ source, context }) {
      return (
        (await resolveMockImport({ source, context })) ??
        (await resolveNonexistentMockedModule({ source, context }))
      );
    },
  };
};
