import { GENERATED_MODULE_COMMENT, MOCK_STUB_PREFIX } from '../const.js';
import { hasDefault, withoutDefault } from '../util.js';

export const buildMockForUnresolved = (exportedNames) => `
${GENERATED_MODULE_COMMENT}
const exportObjects = new Map();
${withoutDefault(exportedNames)
  .map(
    (name) => `exportObjects.set('${name}', null);
  export let ${name} = null;`,
  )
  .join('\n')}
${
  hasDefault(exportedNames)
    ? `
exportObjects.set('default', null);
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
  .map((name) => `  ${name}: (val) => { ${name} = val; exportObjects.set('${name}', val); },`)
  .join('\n')}
  },
  set(key, val) {
    if (key === 'default') {
      if (__hasDefault__) {
        __liveDefault__ = val;
        exportObjects.set('default', val);
      }
    } else {
      __mock__.__setters__[key](val);
    }
  },
  reset(key) {
    if (key === 'default') {
      if (__hasDefault__) {
        exportObjects.set('default', null);
        __liveDefault__ = null;
      }
    } else {
      __mock__.__setters__[key](null);
      exportObjects.set(key, null);
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
  async update(exportName,code){
      if (exportName === 'default') {
        const updatedCode = code.replace(/\{exportName\}/g, '__liveDefault__');
        const executeCode = new Function( '__liveDefault__',updatedCode);
        const obj = exportObjects.get(exportName); 
        executeCode(obj);
      }
      else {
        const updatedCode = code.replace(/\{exportName\}/g, exportName);
        const executeCode = new Function(exportName,updatedCode);
        const obj = exportObjects.get(exportName); 
        executeCode(obj);
      }   
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
