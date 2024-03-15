import { getRequestFilePath } from '@web/dev-server-core';

import { compiledFiles } from './compile.js';

function transformJs(source) {
  return `${source.replace(
    /\bexport default _registerComponent\(/,
    'let __def__ = _registerComponent(',
  )}
if (import.meta.hot) {
  import.meta.hot.accept(module => {
    __def__ = module.default;
  });
}
export default __def__;`;
}

function transformHtml(source) {
  return source.replace(
    /\bexport default registerTemplate\(tmpl\);/,
    `
let __def__ = registerTemplate(tmpl);
export default __def__;

if (import.meta.hot) {
  import.meta.hot.accept(module => {
    __def__ = module.default;
  });
}
    `,
  );
}

function transformCss(source) {
  return source.replace(
    /\bexport default (\[[^\]]+\]);/,
    (_, exportedExpr) => `
let __def__ = ${exportedExpr};
export default __def__;

if (import.meta.hot) {
  import.meta.hot.accept(module => {
    __def__ = module.default;
  });
}
    `,
  );
}

export default ({ rootDir }) => ({
  name: 'lwc-hmr',

  transform(context) {
    if (compiledFiles.has(context.url) && !context.url.includes('env=ssr')) {
      const filePath = getRequestFilePath(context.url, rootDir);

      if (filePath.endsWith('.css')) {
        return { body: transformCss(context.body) };
      }
      if (filePath.endsWith('.html')) {
        return { body: transformHtml(context.body) };
      }
      if (filePath.endsWith('.js')) {
        return { body: transformJs(context.body) };
      }
      throw new Error('Implementation error: LWC-compiled file has unknown type.');
    }
  },
});
