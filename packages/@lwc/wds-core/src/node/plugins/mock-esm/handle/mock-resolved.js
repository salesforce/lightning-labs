import { buildMockForUnresolved } from './mock-stub.js';
import { getUnmockedUri, hasDefault, withoutDefault } from '../util.js';
import { GENERATED_MODULE_COMMENT, UNMOCKED_ANNOTATION } from '../const.js';

const buildMockForResolved = (absPathToUnmockedOriginal, exportedNames) => `
import * as __original__ from '${absPathToUnmockedOriginal}';

${GENERATED_MODULE_COMMENT}
const exportObjects = new Map();
${withoutDefault(exportedNames)
  .map(
    (name) => `exportObjects.set('${name}', __original__['${name}']);
  export let ${name} = __original__['${name}'];`,
  )
  .join('\n')}
${
  hasDefault(exportedNames)
    ? `
exportObjects.set('default',  __original__.default);
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
        __liveDefault__ = __original__.default;
        exportObjects.set('default', __original__.default);
      }
    } else {
      __mock__.__setters__[key](__original__[key]);
      exportObjects.set('default', __original__[key]);
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
      if(newExports[name]){
        __mock__.__setters__[name](newExports[name]);
      }  
    });
    if (__hasDefault__ && newExports.default) {
      __liveDefault__ = newExports.default;
    }
  },
  async update(exportName,code){
      const updatedCode = code.replace(/\{exportName\}/g, exportName);
      const executeCode = new Function(exportName,updatedCode);
      const obj = exportObjects.get(exportName); 
      executeCode(obj);
  },
};
`;

export const makeMockedModuleHandler =
  ({ mockedModules }) =>
  (pathname, queryParams) => {
    if (!mockedModules.has(pathname)) {
      return;
    }
    // If the URL is annotated with `unmocked=1`, this passes through to the original
    // source code. This allows the mocked version to access the stub or the actual,
    // unmocked exports.
    if (queryParams[UNMOCKED_ANNOTATION]) {
      return;
    }
    const { exportedNames, importExists } = mockedModules.get(pathname);

    // If the `mock!` syntax is used, this handler will be active for the resolved
    // path. However, the developer has indicated in their import statement that
    // they do not want to use the exports from the real, unmocked module as the
    // mocks initial exports.
    //
    // If this is the case, the mock should be treated as a "stub", similar to if
    // the originally imported module could not be found.
    return importExists
      ? buildMockForResolved(getUnmockedUri(pathname, queryParams), exportedNames)
      : buildMockForUnresolved(exportedNames);
  };
