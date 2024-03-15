const URL_PREFIX = '/virtual/platform-modules/';

const REPLACEMENTS = [
  [
    /^@salesforce\/label\/([^?]+)/,
    (specifierSubString) => `export default ${JSON.stringify(specifierSubString)};`,
  ],
  [/^@salesforce\/client\/formFactor/, () => `export default 'Large';`],
];

export const IMPORT_META_ENV_URL = '/virtual/import-meta-env.js';

export default () => ({
  name: 'virt-platform-modules',
  resolveImport({ source }) {
    for (const [pattern] of REPLACEMENTS) {
      if (pattern.test(source)) {
        return `${URL_PREFIX}${source}`;
      }
    }
  },
  serve(context) {
    if (context.path.startsWith(URL_PREFIX)) {
      const originalImportSpecifier = context.path.slice(URL_PREFIX.length);
      for (const [pattern, virtModuleGenerator] of REPLACEMENTS) {
        const match = originalImportSpecifier.match(pattern);
        if (match) {
          const [_, ...submatches] = match;
          return {
            body: virtModuleGenerator(...submatches),
            type: 'js',
          };
        }
      }
      throw new Error(
        `Implementation error: cannot find virtual module generator for '${originalImportSpecifier}'`,
      );
    }
  },
});
