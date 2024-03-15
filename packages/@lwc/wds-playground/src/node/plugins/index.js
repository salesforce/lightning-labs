import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import resolveSync from 'resolve/sync.js';
import { resolveToAbsUrl } from '@lwc/wds-core/node';
import indexHtmlPlugin from './index-html.js';

const cwd = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getIndexHtmlPlugin(componentSpecifier, componentMetadata, rootDir) {
  // The `resolve-module` plugin usually takes care of resolving a component specifier to the
  // component's path. However, we need to explicitly determine the path here because:
  //   1) the virtual index HTML, which we are generating dynamically, does not
  //      get transformed with the resolveImport hook, and
  //   2) inside the SSR Worker, it is imported again using dynamic import.
  const componentUrl = resolveToAbsUrl(componentSpecifier, `${cwd}/foo`, rootDir, cwd);
  const moduleMainUrl = `/${path.relative(
    rootDir,
    path.resolve(__dirname, '../../browser/main.js'),
  )}`;
  const shoelaceBaseUrl = `/${path.relative(
    rootDir,
    path.dirname(
      resolveSync('@shoelace-style/shoelace/dist/shoelace.js', {
        basedir: __dirname,
      }),
    ),
  )}`;

  return indexHtmlPlugin({
    componentUrl,
    moduleMainUrl,
    shoelaceBaseUrl,
    componentMetadata,
  });
}
