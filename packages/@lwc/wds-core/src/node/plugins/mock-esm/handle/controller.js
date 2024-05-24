import { relative as pathRelative, resolve as pathResolve } from 'node:path';
import { stringify as qsStringify } from 'node:querystring';
import resolveSync from 'resolve/sync.js';
import { toolkitSrcPath } from '../../../util.js';
import { MOCK_CONTROLLER_PREFIX, MOCK_STUB_PREFIX } from '../const.js';

const LEXER_ABS_PATH = resolveSync('es-module-lexer/dist/lexer.asm.js', {
  baseDir: toolkitSrcPath,
});
const BROWSER_SSR_ABS_PATH = pathResolve(toolkitSrcPath, './browser/ssr/index.js');

const relFromRoot = (absPath) => (rootDir) => pathRelative(rootDir, absPath);
const lexerAbsUrl = relFromRoot(LEXER_ABS_PATH);
const browserSsrUrl = relFromRoot(BROWSER_SSR_ABS_PATH);

const buildMockController = (resolvedOrUnresolvedImport, exportedNames, rootDir, query) => `
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
