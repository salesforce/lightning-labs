import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import resolveSync from 'resolve/sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default ({ rootDir, locale }) => ({
  name: 'ecosystem-i18n',
  resolveImport({ source }) {
    if (source.startsWith('@salesforce/i18n/')) {
      const moduleAbsPath = resolveSync(
        path.join('@salesforce/i18n/dist', locale, source.slice(17)),
        { basedir: __dirname },
      );
      return `/${path.relative(rootDir, moduleAbsPath)}`;
    }
  },
});
