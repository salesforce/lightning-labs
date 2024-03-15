import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectBundleMetadata } from '@lwc/metadata';
import { startDevServer } from '@web/dev-server';
import { Launcher } from 'chrome-launcher';
import minimist from 'minimist';
import { launch as puppeteerCoreLaunch } from 'puppeteer-core';
import { getConfig, getLwcConfig, resolveToAbsPath } from '@lwc/wds-core/node';
import { getIndexHtmlPlugin } from './node/plugins/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const COMPONENT_SPECIFIER = /^[a-zA-Z0-9_]+[\/-][a-zA-Z0-9][a-zA-Z0-9_-]+$/;

async function getComponentMetadata(componentSpecifier) {
  const [namespace, name] = componentSpecifier.split('/');
  const { entry: componentAbsPath } = resolveToAbsPath(
    componentSpecifier,
    path.join(cwd, 'foo.js'),
    cwd,
    [],
  );
  const source = await fs.readFile(componentAbsPath, 'utf8');
  const metadata = collectBundleMetadata({
    type: 'platform',
    name,
    namespace,
    namespaceMapping: {},
    files: [
      {
        fileName: `${namespace}/${name}/${name}.js`,
        source,
      },
    ],
  });

  return metadata.files[0];
}

async function launchBrowser({ port, devtools }) {
  const executablePath = Launcher.getFirstInstallation();
  if (!executablePath) {
    throw new Error('Could not find local installation of Chrome.');
  }

  try {
    const browser = await puppeteerCoreLaunch({
      executablePath,
      headless: false,
      devtools,
      defaultViewport: null,
      args: ['--start-maximized'],
    });

    const browserCxt = browser.defaultBrowserContext();
    const pages = await browserCxt.pages();
    const page = pages[0];
    page.goto(`http://localhost:${port}/`);

    return { browser, page };
  } catch (err) {
    console.error(`Failed to launch local browser installed at ${executablePath}`);
    throw err;
  }
}

export async function main() {
  if (!getLwcConfig(cwd)) {
    console.error('You must execute playground from a directory with LWC config.');
    process.exit(1);
  }

  const args = minimist(process.argv.slice(2));
  let [componentSpecifier] = args._;
  if (!COMPONENT_SPECIFIER.test(componentSpecifier)) {
    console.log(componentSpecifier, COMPONENT_SPECIFIER.test(componentSpecifier));
    console.error('You must indicate which component to render as the first positional argument.');
    process.exit(1);
  }
  let { open, root: explicitRootDir, devtools = false, locale, modulesDir } = args;
  componentSpecifier = componentSpecifier
    .replace('-', '/')
    .replaceAll(/-./g, ([_dash, nextChar]) => nextChar.toUpperCase());
  const componentMetadata = await getComponentMetadata(componentSpecifier);

  let handles = {
    browser: null,
    page: null,
  };

  modulesDir = [
    path.resolve(__dirname, './browser/ui'),
    // coerce <string | string[] | undefined> into <string[] | undefined[]>
    ...[modulesDir].flat(),
  ].filter(Boolean);

  const getUniquePlugins = ({ rootDir }) => [
    getIndexHtmlPlugin(componentSpecifier, componentMetadata, rootDir),
  ];

  const config = getConfig({
    componentSpecifier,
    componentMetadata,
    enableHmr: true,
    explicitRootDir,
    modulesDir,
    open,
    getBrowserHandles: () => handles,
    locale,
    getUniquePlugins,
  });

  await startDevServer({
    config,
    readCliArgs: false,
    readFileConfig: false,
  });

  if (open) {
    handles = await launchBrowser({
      port: config.port,
      devtools,
    });
  }
}
