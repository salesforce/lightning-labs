import * as fs from 'node:fs';
import * as path from 'node:path';

import { transformSync } from '@lwc/compiler';
import { getRequestFilePath } from '@web/dev-server-core';

import { resolvedModules } from './resolve-module.js';

const COMPONENT_JS_PATTERN = /\/\w+\/(\w+)\/\1\.[jt]s$/;
export const VIRTUAL_CSS_EMPTY = '/virtual/empty.css';
export const VIRTUAL_TEMPLATE_EMPTY = '/virtual/empty.html';

const VIRTUAL_CONTENT = new Map(
  Object.entries({
    [VIRTUAL_CSS_EMPTY]: {
      body: '',
      type: 'js',
    },
    [VIRTUAL_TEMPLATE_EMPTY]: {
      body: `import { registerTemplate } from "lwc";
function tmpl() {
  return [];
  /*LWC compiler vX.X.X*/
}
export default registerTemplate(tmpl);
tmpl.stylesheets = [];`,
      type: 'js',
    },
  }),
);

export const compiledFiles = new Set();
const componentDirs = new Set();

function isWithinModuleDir(moduleDirs, filePath) {
  return !!moduleDirs.find((moduleDir) => filePath.startsWith(moduleDir));
}

function isComponentJavascript(filePath, moduleDirs) {
  const matchesComponentJsPattern = COMPONENT_JS_PATTERN.test(filePath);
  return isWithinModuleDir(moduleDirs, filePath) && matchesComponentJsPattern;
}

function isComponentHtmlOrCss(filePath, componentDirname) {
  return (
    componentDirs.has(componentDirname) && (filePath.endsWith('.css') || filePath.endsWith('.html'))
  );
}

export default ({ rootDir, moduleDirs }) => ({
  name: 'lwc-compile',

  serve(context) {
    return VIRTUAL_CONTENT.get(context.path);
  },

  resolveImport({ source, context, code, column, line }) {
    const filePath = getRequestFilePath(context.url, rootDir);
    const isRelativeImport = source.startsWith('.');
    const resolvedImport = path.resolve(path.dirname(filePath), source);

    if (isRelativeImport && !fs.existsSync(resolvedImport)) {
      if (filePath.endsWith('.css')) {
        return VIRTUAL_CSS_EMPTY;
      }
      if (filePath.endsWith('.html')) {
        return VIRTUAL_TEMPLATE_EMPTY;
      }
    }
  },

  transform(context) {
    const filePath = getRequestFilePath(context.url, rootDir);

    const componentDirname = path.dirname(filePath);
    const moduleResolution = resolvedModules.get(filePath);

    if (
      !isComponentJavascript(filePath, moduleDirs) &&
      !isComponentHtmlOrCss(filePath, componentDirname)
    ) {
      return context.body;
    }

    componentDirs.add(componentDirname);

    const filename = path.basename(moduleResolution?.resolvedImport ?? filePath);
    const [namespace, name] = componentDirname.split(path.sep).slice(-2);

    const transformOptions = {
      namespace,
      name,
      // TODO: handle scopedStyles
      scopedStyles: false,
      // Enable template expression in playground UI but not elsewhere.
      experimentalComplexExpressions: filePath.includes('wds-playground/src/browser/ui/pg/'),
    };

    const { code, warnings: diagnostics } = transformSync(context.body, filename, transformOptions);

    if (diagnostics?.length) {
      throw new Error(`Sure did not work! ${JSON.stringify(diagnostics, null, 2)}`);
    }

    compiledFiles.add(context.url);

    return {
      body: code,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
      },
    };
  },
});
