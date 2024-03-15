import * as path from 'node:path';

import { resolveModule } from '@lwc/module-resolver';

import { getRequestFilePath } from '@web/dev-server-core';

export const resolvedModules = new Map();
const MODULE_IMPORT_PATTERN = /^(\w+)\/(\w+)$/;

export function resolveToAbsPath(importSpecifier, importerAbsPath, cwd, moduleDirs) {
  let result;
  try {
    result = resolveModule(importSpecifier, importerAbsPath, {
      modules: moduleDirs?.map((dir) => ({ dir })),
      rootDir: cwd,
    });
  } catch (err) {
    if (err.code === 'NO_LWC_MODULE_FOUND') {
      console.error(`The requested moduled cannot be found: '${importSpecifier}'`);
    } else if (err.code === 'LWC_CONFIG_ERROR') {
      console.error(`The requested module can't be resolved due to an invalid configuration`, err);
    }
    throw err;
  }
  return result;
}

export function resolveToAbsUrl(importSpecifier, importerAbsPath, rootDir, cwd, moduleDirs) {
  if (!MODULE_IMPORT_PATTERN.test(importSpecifier)) {
    return;
  }
  const componentAbsPath = resolveToAbsPath(importSpecifier, importerAbsPath, cwd, moduleDirs);
  if (!componentAbsPath) {
    return;
  }

  const resolvedImport = `/${path.relative(rootDir, componentAbsPath.entry)}`;

  resolvedModules.set(componentAbsPath.entry, {
    resolvedImport,
    importSpecifier,
  });

  return resolvedImport;
}

export default ({ cwd, rootDir, moduleDirs }) => ({
  name: 'lwc-resolve-module',
  resolveImport({ source, context, code, column, line }) {
    const filePath = getRequestFilePath(context.url, rootDir);
    return resolveToAbsUrl(source, filePath, rootDir, cwd, moduleDirs);
  },
});
