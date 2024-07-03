import { GENERATED_MODULE_COMMENT, MOCK_STUB_PREFIX } from '../const.js';
import { hasDefault, withoutDefault } from '../util.js';

export const buildMockForUnresolved = (exportedNames) => `
${GENERATED_MODULE_COMMENT}
${withoutDefault(exportedNames)
  .map(
    (name) => `
  export let ${name} = null;`,
  )
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

  // The problem is that the updates to the variables inside the async excuteCode func are not happening in scope of this module i.e the changes inside the functoin
  // does not reflect any change in module exports for this module
  // One way to fix this is to run __mock__.setter for all exports of the file after the code is executed and update this module exports with the updated values
  // inside the async executeCode func

  // async eval(code){
  //       const AsyncFunction = async function () {}.constructor;
  //       const setter = ${withoutDefault(exportedNames).length > 0} ? '${withoutDefault(
    exportedNames,
  )
    .map((name) => `__mock__.__setters__.${name}(${name});`)
    .join(' ')}' : '';
  //       const updatedCode = code;
  //       const executeCode = new AsyncFunction(
  //         ${[
    ...withoutDefault(exportedNames).map((name) => `'${name}'`),
    `'__mock__'`,
    'updatedCode',
  ].join(', ')}
  //       );
  //       return executeCode(${withoutDefault(exportedNames).join(', ')},__mock__); 
  // },


  // This is the second way to do this i.e to build a proxy handles that assures all the changes inside the codetoexecute func are reflected in the original module exports from this 
  // file .One downside is that in this case inside eval you will use exports.counter to reference the export values
  // await mockDep.eval(
  //    exports.counter = 1;
  //  );


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


  // Also both of them fails in the condition where a exported value lets say counter for a mock is updated inside another exported func 
  // which is override in our case as the inside func counter reference is not in scope of this module and cannot be even handled by both of 
  // these above two ways. 
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
