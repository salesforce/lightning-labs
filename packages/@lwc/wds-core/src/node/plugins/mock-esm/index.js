import { resolve as pathResolve, dirname } from 'node:path';
import { makeMockControllerHandler } from './controller.js';
import { makeMockedModuleHandler } from './mock-resolved.js';
import { makeMockStubHandler } from './mock-stub.js';
import { MOCK_CONTROLLER_PREFIX, MOCK_STUB_PREFIX } from './const.js';

const MOCK_IMPORT_PATTERN = /mock(\{ *([a-zA-Z0-9_]+( *, *)?)+\ *}):(.+)/;

function parseExports(curlyWrappedNames) {
  return curlyWrappedNames
    .slice(1, -1)
    .split(',')
    .map((name) => name.trim());
}

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

  let recursiveResolve;

  const resolveMockImport = async ({ source, context }) => {
    const match = MOCK_IMPORT_PATTERN.exec(source);
    if (!match) {
      return;
    }
    const [, curlyWrappedNames, , , verbatimImport] = match;
    const exportedNames = parseExports(curlyWrappedNames);

    // perhaps we will need to synchronously set something
    // in mockedModules, in case the test file immediately
    // imports the nonexisted mocked file right after the
    // mock: import, in the same file. I don't think web test
    // runner will wait for the previous import to resolve
    // before taking a look at the next one

    const { resolvedImport, importExists } = await recursiveResolve({
      source: verbatimImport,
      context,
    });

    const mockControllerPath = `${MOCK_CONTROLLER_PREFIX}${resolvedImport}`;
    mockedModules.set(resolvedImport, {
      mockControllerPath,
      exportedNames,
      importExists,
    });

    return mockControllerPath;
  };

  const resolveNonexistentMockedModule = async ({ source, context }) => {
    if (!mockedModules.has(source)) {
      return;
    }
    const { importExists } = mockedModules.get(source);
    if (importExists) {
      return;
    }

    return `${MOCK_STUB_PREFIX}${source}`;
  };

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
      recursiveResolve = makeRecursiveResolve(config.plugins);
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
