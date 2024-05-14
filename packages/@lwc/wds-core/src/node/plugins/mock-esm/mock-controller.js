import { relative as pathRelative, resolve as pathResolve } from 'node:path';
import resolveSync from 'resolve/sync.js';
import { toolkitSrcPath } from '../../util.js';

const LEXER_ABS_PATH = resolveSync('es-module-lexer/dist/lexer.asm.js', {
  baseDir: toolkitSrcPath,
});
const BROWSER_SSR_ABS_PATH = pathResolve(toolkitSrcPath, './browser/ssr/index.js');

const relFromRoot = (absPath) => (rootDir) => pathRelative(rootDir, absPath);
const lexerAbsUrl = relFromRoot(LEXER_ABS_PATH);
const browserSsrUrl = relFromRoot(BROWSER_SSR_ABS_PATH);

export const buildMockController = (resolvedOrUnresolvedImport, exportedNames, rootDir, query) => `
import { parse as parseEsm } from '/${lexerAbsUrl(rootDir)}';
import { __mock__ } from '${resolvedOrUnresolvedImport}${query}';
import { mock as mockSSR, resetMock as resetMockSSR } from '/${browserSsrUrl(rootDir)}${query}';

const canonicalExportedNames = new Set([${exportedNames.map((name) => `'${name}'`).join(', ')}]);

function assertHasSameExports(newExportsArr) {
  if (
    newExportsArr.length !== canonicalExportedNames.size ||
    !newExportsArr.every(el => canonicalExportedNames.has(el))
  ) { 
    throw new Error('Cannot define mock module with inequivalent exported values.');
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
