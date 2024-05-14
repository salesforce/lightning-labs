import { resolve as pathResolve, dirname } from 'node:path';
import { stringify as qsStringify } from 'node:querystring';
import { makeMockControllerHandler } from './controller.js';
import { makeMockStubHandler } from './mock-stub.js';
import { MOCK_CONTROLLER_PREFIX, MOCK_STUB_PREFIX } from './const.js';
import { hasDefault, withoutDefault } from './util.js';

const MOCK_IMPORT_PATTERN = /mock(\{ *([a-zA-Z0-9_]+( *, *)?)+\ *}):(.+)/;
const UNMOCKED_ANNOTATION = 'unmocked';

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

const buildMockForResolved = (absPathToUnmockedOriginal, exportedNames, queryString) => `
import * as __original__ from '${absPathToUnmockedOriginal}${queryString}';

${withoutDefault(exportedNames)
  .map((name) => `export let ${name} = __original__['${name}'];`)
  .join('\n')}
${
  hasDefault(exportedNames)
    ? `
let __liveDefault__ = __original__.default;
const __hasDefault__ = true;
export { __liveDefault__ as default };
`
    : `
const __hasDefault__ = false;
`
}

export const __mock__ = {
  __setters__: {
${withoutDefault(exportedNames)
  .map((name) => `    ${name}: (val) => { ${name} = val; },`)
  .join('\n')}
  },
  set(key, val) {
    if (key === 'default') {
      if (__hasDefault__) {
        __liveDefault__ = val;
      }
    } else {
      __mock__.__setters__[key](val);
    }
  },
  reset(key) {
    if (key === 'default') {
      if (__hasDefault__) {
        __liveDefault__ = __original__.default;
      }
    } else {
      __mock__.__setters__[key](__original__[key]);
    }
  },
  resetAll() {
    Object.keys(__mock__.__setters__).forEach(name => {
      __mock__.reset(name);
    });
  },
  async useImport(importUrl) {
    const newExports = await import(importUrl);
    Object.keys(__mock__.__setters__).forEach(name => {
      __mock__.__setters__[name](newExports[name]);
    });
  },
};
`;

function getUnmockedUri(absoluteUrl, queryParams) {
  const newParams = {
    ...queryParams,
    [UNMOCKED_ANNOTATION]: '1',
  };
  return `${absoluteUrl}?${qsStringify(newParams)}`;
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

  const serveMockedModule = (pathname, queryParams) => {
    if (!mockedModules.has(pathname)) {
      return;
    }
    // If the URL is annotated with `unmocked=1`, this passes through to the original
    // source code. This allows the mocked version to access the stub or the actual,
    // unmocked exports.
    if (queryParams[UNMOCKED_ANNOTATION]) {
      return;
    }
    const { exportedNames } = mockedModules.get(pathname);

    const queryString = Object.keys(queryParams).length ? `?${qsStringify(queryParams)}` : '';

    return buildMockForResolved(getUnmockedUri(pathname, queryParams), exportedNames, queryString);
  };

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
