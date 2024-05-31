import { relative as pathRelative, resolve as pathResolve } from 'node:path';
import { stringify as qsStringify } from 'node:querystring';
import resolveSync from 'resolve/sync.js';
import { toolkitSrcPath } from '../../../util.js';
import { MOCK_CONTROLLER_PREFIX, MOCK_STUB_PREFIX } from '../const.js';

const LEXER_ABS_PATH = resolveSync('es-module-lexer/dist/lexer.asm.js', {
  baseDir: toolkitSrcPath,
});
const ESPRIMA_ABS_PATH = resolveSync('escodegen/escodegen.js', {
  baseDir: toolkitSrcPath,
});
const BROWSER_SSR_ABS_PATH = pathResolve(toolkitSrcPath, './browser/ssr/index.js');
const relFromRoot = (absPath) => (rootDir) => pathRelative(rootDir, absPath);
const lexerAbsUrl = relFromRoot(LEXER_ABS_PATH);
const esprimaAbsUrl = relFromRoot(ESPRIMA_ABS_PATH);
const browserSsrUrl = relFromRoot(BROWSER_SSR_ABS_PATH);
// I passed the original content of the mocked file here so while mocking instead of mocking with
// moduleCode { which causes the issue in partial mocking as it only tracks mocked values } we merge the code
// from original content and mockedCode which would have all the exports from original module code and update
// values of mocks updated in partial mocking
/* I thought of doing it in two ways
1. Create a mergeExports func in util file where I you pass orignal content of module and mocked code and 
it outputs a merged code.I have written that func in util.js but not able to successfully import and use it in the script below.
2. To implemeent the mergeExports func in the script below only and for that I would need to import esprima and codegen.
*/
const buildMockController = (
  resolvedOrUnresolvedImport,
  exportedNames,
  rootDir,
  query,
  importExists,
  content,
) => `
import { parse as parseEsm } from '/${lexerAbsUrl(rootDir)}';
import { __mock__ } from '${resolvedOrUnresolvedImport}${query}';
import { mock as mockSSR, resetMock as resetMockSSR } from '/${browserSsrUrl(rootDir)}${query}';

const canonicalExportedNames = new Set([${exportedNames.map((name) => `'${name}'`).join(', ')}]);

function assertHasSameExports(newExportsArr) {
  if (!newExportsArr.every(el => canonicalExportedNames.has(el))) { 
    throw new Error(
      'Cannot define mock module ("${resolvedOrUnresolvedImport}") with non-subset exported values.\\n' +
      'Canonical exports: ' + [...canonicalExportedNames].join(',') + '\\n' +
      'Provided exports: ' + newExportsArr.join(',') + '\\n'
    );
  }
}

export default async function mockModule(moduleCode) {
  const originalModuleCode = "${content}";
  const [, _originalExports] = parseEsm(originalModuleCode);
  const originalExportedNames = _originalExports.map(exp => exp.n);
  const [, _exports] = parseEsm(moduleCode);
  const exportedNames = _exports.map(exp => exp.n);
  assertHasSameExports(exportedNames);
  const dataUri = 'data:text/javascript,' + encodeURIComponent(moduleCode);
  await __mock__.useImport(dataUri);
  await mockSSR('${resolvedOrUnresolvedImport}', dataUri);
}
mockModule.reset = async () => {
  __mock__.resetAll();
  await resetMockSSR('${resolvedOrUnresolvedImport}');
};
`;

export const makeMockControllerHandler =
  ({ mockedModules, rootDir }) =>
  (pathname, queryParams) => {
    if (!pathname.startsWith(MOCK_CONTROLLER_PREFIX)) {
      return;
    }

    const resolvedOrRelativeImport = pathname.substring(MOCK_CONTROLLER_PREFIX.length);
    const mockedModuleEntry = mockedModules.get(resolvedOrRelativeImport);
    if (!mockedModuleEntry) {
      throw new Error(`Unable to find mock entry for "${resolvedOrRelativeImport}"`);
    }
    const { exportedNames, importExists } = mockedModuleEntry;
    const queryString = Object.keys(queryParams).length ? `?${qsStringify(queryParams)}` : '';
    return buildMockController(
      importExists ? resolvedOrRelativeImport : `${MOCK_STUB_PREFIX}${resolvedOrRelativeImport}`,
      exportedNames,
      rootDir,
      queryString,
    );
  };
