import { GENERATED_MODULE_COMMENT, MOCK_STUB_PREFIX } from '../const.js';
import { hasDefault, withoutDefault } from '../util.js';

export const buildMockForUnresolved = (exportedNames) => `
${GENERATED_MODULE_COMMENT}
${withoutDefault(exportedNames)
  .map((name) => `export let ${name} = null;`)
  .join('\n')}
${
  hasDefault(exportedNames)
    ? `

let __liveDefault__ = null;
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
  .map((name) => `  ${name}: (val) => { ${name} = val; },`)
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
        __liveDefault__ = null;
      }
    } else {
      __mock__.__setters__[key](null);
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
    if (__hasDefault__) {
      __liveDefault__ = newExports.default;
    }
  },

  async eval(code) {
    const AsyncFunction = async function () {}.constructor;
    // Create a proxy to intercept assignments and update module variables
    const handler = {
      set(target, prop, value) {
        if (prop in __mock__.__setters__) {
          __mock__.__setters__[prop](value);
          return true;
        }
        return false;
      },
      get(target, prop) {
        if (prop in __mock__.__setters__) {
          return target[prop];
        }
        return undefined;
      }
    };

    const exportsProxy = new Proxy({ ${withoutDefault(exportedNames).join(',')} }, handler);

    const executeCode = new AsyncFunction('exports', code);
    return executeCode(exportsProxy);
  },
};
`;

export const makeMockStubHandler =
  ({ mockedModules }) =>
  (pathname) => {
    const isMock = pathname.startsWith(MOCK_STUB_PREFIX);
    if (!isMock) {
      return;
    }
    const mockPath = pathname.slice(MOCK_STUB_PREFIX.length);
    if (!mockedModules.has(mockPath)) {
      throw new Error(`Implementation error: cannot find mock entry for ${pathname}`);
    }

    const { exportedNames } = mockedModules.get(mockPath);

    return buildMockForUnresolved(exportedNames);
  };
