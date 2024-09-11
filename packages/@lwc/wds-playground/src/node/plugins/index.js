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
  const componentPath = resolveToAbsUrl(componentSpecifier, path.join(cwd, 'foo'), rootDir, cwd);

  // Normalize the component URL
  const componentUrl = `/${path.relative(rootDir, componentPath).replace(/\\/g, '/')}`;

  // Resolve the module's main URL relative to rootDir
  const moduleMainPath = path.resolve(__dirname, '../../browser/main.js');

  const moduleMainUrl = `/${path.relative(rootDir, moduleMainPath).replace(/\\/g, '/')}`;

  // Resolve the Shoelace base URL
  const shoelacePath = resolveSync('@shoelace-style/shoelace/dist/shoelace.js', {
    basedir: __dirname,
  });
  const shoelaceDir = path.dirname(shoelacePath);
  const relativeShoelacePath = path.relative(rootDir, shoelaceDir);
  const shoelaceBaseUrl = `/${relativeShoelacePath.replace(/\\/g, '/')}`;

  return indexHtmlPlugin({
    componentUrl,
    moduleMainUrl,
    shoelaceBaseUrl,
    componentMetadata,
  });
}
