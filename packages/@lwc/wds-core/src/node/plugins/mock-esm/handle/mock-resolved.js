import { getUnmockedUri, hasDefault, withoutDefault } from '../util.js';
import { GENERATED_MODULE_COMMENT, UNMOCKED_ANNOTATION } from '../const.js';

const buildMockForResolved = (absPathToUnmockedOriginal, exportedNames) => `
import * as __original__ from '${absPathToUnmockedOriginal}';

${GENERATED_MODULE_COMMENT}

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
    const { exportedNames } = mockedModules.get(pathname);

    return buildMockForResolved(getUnmockedUri(pathname, queryParams), exportedNames);
  };
