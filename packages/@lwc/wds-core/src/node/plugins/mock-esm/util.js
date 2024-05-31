import { stringify as qsStringify } from 'node:querystring';
import { UNMOCKED_ANNOTATION } from './const.js';
import esprima from 'esprima';
import escodegen from 'escodegen';
export const withoutDefault = (strings) => strings.filter((el) => el !== 'default');
export const hasDefault = (strings) => strings.includes('default');

export function getUnmockedUri(absoluteUrl, queryParams) {
  const newParams = {
    ...queryParams,
    [UNMOCKED_ANNOTATION]: '1',
  };
  return `${absoluteUrl}?${qsStringify(newParams)}`;
}

export function splitFirst(str, separator) {
  const [first, ...rest] = str.split(separator);
  return rest.length ? [first, rest.join(separator)] : [first];
}

export function getQueryString(url) {
  const [, newQueryStr] = splitFirst(url, '?');
  return newQueryStr ? `?${newQueryStr}` : '';
}

export function borrowQueryString(urlWithQueryStr, urlNeedsQueryStr) {
  if (urlNeedsQueryStr.includes('?')) {
    // The query string is already included in the URL; it need not be added.
    return urlNeedsQueryStr;
  }
  return `${urlNeedsQueryStr}${getQueryString(urlWithQueryStr)}`;
}
/* Function to create a merged code from orignal module code and mocked module code
i.e lets say original content is ->
"export default 'foo';
export const changeme = 'unmocked value';""

mocked content is ->
"export const changeme = 'new';""

merged Module code is ->
"export default 'foo';
export const changeme = 'new';""
*/

export function mergeExports(originalCode, mockCode) {
  const originalAst = esprima.parseModule(originalCode);
  const mockAst = esprima.parseModule(mockCode);
  const originalExports = {};
  const mockExports = {};

  // Helper function to extract exports from AST
  function extractExports(ast, exportsObj) {
    for (const node of ast.body) {
      if (node.type === 'ExportDefaultDeclaration') {
        exportsObj.default = node.declaration;
      } else if (node.type === 'ExportNamedDeclaration') {
        for (const decl of node.declaration.declarations) {
          exportsObj[decl.id.name] = decl.init;
        }
      }
    }
  }

  extractExports(originalAst, originalExports);
  extractExports(mockAst, mockExports);

  // Merge the exports: update the original exports with the mocked ones
  for (const key of Object.keys(mockExports)) {
    originalExports[key] = mockExports[key];
  }

  // Create a new AST for the merged exports
  const mergedAst = {
    type: 'Program',
    body: [],
    sourceType: 'module',
  };

  // Add merged exports to the new AST
  if (originalExports.default) {
    mergedAst.body.push({
      type: 'ExportDefaultDeclaration',
      declaration: originalExports.default,
    });
  }
  for (const key of Object.keys(originalExports)) {
    if (key !== 'default') {
      mergedAst.body.push({
        type: 'ExportNamedDeclaration',
        declaration: {
          type: 'VariableDeclaration',
          declarations: [
            {
              type: 'VariableDeclarator',
              id: { type: 'Identifier', name: key },
              init: originalExports[key],
            },
          ],
          kind: 'const',
        },
      });
    }
  }

  const mergedCode = escodegen.generate(mergedAst);
  return mergedCode;
}

export const withoutQs = (url) => splitFirst(url, '?')[0];
export const onlyQs = (url) => splitFirst(url, '?')[1];
