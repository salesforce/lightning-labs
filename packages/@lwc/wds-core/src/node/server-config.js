import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hmrPlugin } from '@web/dev-server-hmr';
import resolveSync from 'resolve/sync.js';

import { cwd, getLwcConfig, getRootDir } from './util.js';

import aliasPlugin from './plugins/alias.js';
import browserUtilsPlugin from './plugins/browser-utils/index.js';
import envPlugin from './plugins/env.js';
import importFlagPlugin from './plugins/import-flag.js';
import lwcPlugins from './plugins/lwc/index.js';
import mockEsmPlugin from './plugins/mock-esm/index.js';
import platformPlugin from './plugins/platform/index.js';
import repairUtf8Plugin from './plugins/repair-utf8.js';
import shadowGlobalsPlugin from './plugins/shadow-globals.js';
import snapshotElPlugin from './plugins/browser-utils/snapshot-el.js';
import typescriptPlugin from './plugins/typescript.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getModuleDirs(lwcConfig, manuallyAddedDirs) {
  const { modules: moduleConfigEntries } = lwcConfig;
  if (!moduleConfigEntries) {
    console.error('You must specify where to find modules in your LWC config.');
    process.exit(1);
  }

  const moduleDirs = moduleConfigEntries.map((moduleConfigEntry) => {
    const { name, path: modulePath, dir, npm } = moduleConfigEntry;

    if (dir) {
      return path.resolve(cwd, dir) + path.sep;
    }
    if (npm) {
      return (
        path.dirname(resolveSync(`${npm}${path.sep}package.json`, { basedir: cwd })) + path.sep
      );
    }
    if (name && modulePath) {
      // In contrast to the above, this returns the directory in which an actual
      // module lives. This is fine, however, as the moduleDirs entries are only
      // used to detect whether an imported JS file is an LWC.
      return path.dirname(path.resolve(cwd, modulePath)) + path.sep;
    }

    throw new Error(`Invalid module config: ${JSON.stringify(moduleConfigEntry, null, 2)}`);
  });

  if (manuallyAddedDirs) {
    // manuallyAddedDirs can be either String or String[]
    if (typeof manuallyAddedDirs === 'string') {
      moduleDirs.unshift(path.resolve(cwd, manuallyAddedDirs) + path.sep);
    } else if (Array.isArray(manuallyAddedDirs)) {
      for (const relDir of manuallyAddedDirs) {
        moduleDirs.unshift(path.resolve(cwd, relDir) + path.sep);
      }
    }
  }

  return moduleDirs;
}

export function getConfig(options = {}) {
  let {
    componentSpecifier,
    open = false,
    watch = null,
    port = 1337,
    componentMetadata = null,
    enableHmr = false,
    explicitRootDir,
    getBrowserHandles,
    locale = 'en-US',
    modulesDir,
    getUniquePlugins = null,
  } = options;

  const isPlayground = !!componentSpecifier;

  // We have our own reload implementation in the dev server, but want to use the default
  // watch behavior when debugging tests.
  watch = watch ?? !componentSpecifier;

  const lwcConfig = getLwcConfig(cwd);
  if (!cwd || !lwcConfig) {
    console.error('You must execute playground from a directory with LWC config.');
    process.exit(1);
  }

  const moduleDirs = getModuleDirs(lwcConfig, modulesDir);

  // If the LWC config resolves module references by NPM package, that resolution
  // might fall higher up that the current working directory on the filesystem.
  // The root directory, unless explicitly provided, should encapsulate 1) the uplift
  // components, 2) cwd where the lwc.config.json is found, and 3) all module
  // directories.
  const rootDir = explicitRootDir
    ? path.resolve(cwd, explicitRootDir)
    : getRootDir([...moduleDirs, cwd, __dirname]);

  let elementCapturePlugin;
  if (isPlayground && open) {
    if (open) {
      elementCapturePlugin = browserUtilsPlugin({ getBrowserHandles });
    }
  } else {
    elementCapturePlugin = snapshotElPlugin();
  }

  const plugins = [
    // This plugin needs to do its transforms before other plugins get a chance.
    repairUtf8Plugin(),
    mockEsmPlugin({ rootDir }),
    typescriptPlugin({ rootDir }),
    importFlagPlugin(),
    shadowGlobalsPlugin(),
    ...(getUniquePlugins?.({ rootDir }) ?? []),
    aliasPlugin([
      [/^@browser\//, `/${path.relative(rootDir, path.resolve(__dirname, '../browser'))}/`],
    ]),
    ...platformPlugin({
      locale,
      rootDir,
    }),
    envPlugin(),
    ...lwcPlugins({
      moduleDirs,
      isTestEnv: !componentSpecifier,
      rootDir,
      cwd,
      enableHmr,
    }),
    elementCapturePlugin,
    enableHmr && hmrPlugin(),
  ].filter(Boolean);

  return {
    rootDir,
    port,
    open: open && !isPlayground,
    watch,
    plugins,
    nodeResolve: true,
  };
}
