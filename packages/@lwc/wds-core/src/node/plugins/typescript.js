import { getRequestFilePath } from '@web/dev-server-core';
import { transform } from 'sucrase';

export default ({ rootDir }) => ({
  name: 'typescript',

  transform(context) {
    const filePath = getRequestFilePath(context.url, rootDir);
    if (filePath.endsWith('.ts')) {
      const { code } = transform(context.body, {
        filePath,
        transforms: ['typescript'],
        disableESTransforms: true,
        keepUnusedImports: true,
        preserveDynamicImport: true,
        injectCreateRequireForImportRequire: false,
        enableLegacyTypeScriptModuleInterop: false,
        enableLegacyBabel5ModuleInterop: false,
      });

      return {
        body: code,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
        },
      };
    }
  },
});
