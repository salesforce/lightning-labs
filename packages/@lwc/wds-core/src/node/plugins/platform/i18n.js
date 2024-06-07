import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import resolveSync from 'resolve/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default ({ rootDir, locale }) => ({
  name: 'ecosystem-i18n',
  resolveImport({ source }) {
    if (source.startsWith('@salesforce/i18n/')) {
      try {
        const moduleAbsPath = resolveSync(
          path.join('@salesforce/i18n/dist', locale, source.slice(17)),
          { basedir: __dirname },
        );
        return `/${path.relative(rootDir, moduleAbsPath)}`;
      } finally {
        // Why the try/finally here? It turns out that the `@salesforce/i18n`
        // reference implementation is incomplete and does not include everything
        // that is present when imported on the Salesforce platform. Consequently,
        // We can't assume that the above `resolveSync` will actually succeed.
        //
        // Therefore we need to return undefined from this function.
      }
    }
  },
});
