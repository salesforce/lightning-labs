import * as fs from 'node:fs';
import * as path from 'node:path';

import { transformSync } from '@lwc/compiler';
import { getRequestFilePath } from '@web/dev-server-core';

import { resolvedModules } from './resolve-module.js';
import { GENERATED_MODULE_COMMENT } from '../mock-esm/const.js';

const COMPONENT_JS_PATTERN = /\/\w+\/(\w+)\/\1\.[jt]s$/;
const COMPONENT_CSS_PATTERN = /\/\w+\/(\w+)\/\1\.css$/;
const COMPONENT_HTML_PATTERN = /\/\w+\/(\w+)\/\1\.html$/;
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

function isGeneratedMockModule(content) {
  return content.includes(GENERATED_MODULE_COMMENT);
}

function isComponentHtmlOrCss(filePath, componentDirname) {
  // If a component has multiple templates, the filepath won't follow the typical naming
  // convention for LWCs. Detecting an HTML or CSS file within a known LWC component
  // directory is a strong enough proxy for "this is LWC CSS" or "this is an LWC template".
  if (
    componentDirs.has(componentDirname) &&
    (filePath.endsWith('.css') || filePath.endsWith('.html'))
  ) {
    return true;
  }
  // On the other hand, sometimes HTML and CSS is sometimes pulled in in unexpected ways.
  // If it matches the expected pattern, an HTML file should be treated as LWC template.
  if (filePath.endsWith('.html') && COMPONENT_HTML_PATTERN.test(filePath)) {
    return true;
  }
  if (filePath.endsWith('.css') && COMPONENT_CSS_PATTERN.test(filePath)) {
    return true;
  }
  return false;
}

function stripQueryString(filePath) {
  const qidx = filePath.indexOf('?');
  return qidx === -1 ? filePath : filePath.slice(0, qidx);
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
    const filePath = stripQueryString(getRequestFilePath(context.url, rootDir));

    const componentDirname = path.dirname(filePath);
    const moduleResolution = resolvedModules.get(filePath);

    if (
      (!isComponentJavascript(filePath, moduleDirs) &&
        !isComponentHtmlOrCss(filePath, componentDirname)) ||
      isGeneratedMockModule(context.body)
    ) {
      return context.body;
    }

    componentDirs.add(componentDirname);

    const filename = stripQueryString(path.basename(moduleResolution?.resolvedImport ?? filePath));
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
      console.error(`LWC compiled with warnings: ${JSON.stringify(diagnostics, null, 2)}`);
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
