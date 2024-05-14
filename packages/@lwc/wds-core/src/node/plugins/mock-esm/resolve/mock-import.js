import { MOCK_CONTROLLER_PREFIX } from '../const.js';

const MOCK_IMPORT_PATTERN = /mock(\{ *([a-zA-Z0-9_]+( *, *)?)+\ *}):(.+)/;

function parseExports(curlyWrappedNames) {
  return curlyWrappedNames
    .slice(1, -1)
    .split(',')
    .map((name) => name.trim());
}

export const makeMockImportResolver =
  ({ mockedModules, recursiveResolve }) =>
  async ({ source, context }) => {
    const match = MOCK_IMPORT_PATTERN.exec(source);
    if (!match) {
      return;
    }
    const [, curlyWrappedNames, , , verbatimImport] = match;
    const exportedNames = parseExports(curlyWrappedNames);

    // perhaps we will need to synchronously set something
    // in mockedModules, in case the test file immediately
    // imports the nonexisted mocked file right after the
    // mock: import, in the same file. I don't think web test
    // runner will wait for the previous import to resolve
    // before taking a look at the next one

    const { resolvedImport, importExists } = await recursiveResolve({
      source: verbatimImport,
      context,
    });

    const mockControllerPath = `${MOCK_CONTROLLER_PREFIX}${resolvedImport}`;
    mockedModules.set(resolvedImport, {
      mockControllerPath,
      exportedNames,
      importExists,
    });

    return mockControllerPath;
  };
