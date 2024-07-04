import { startTestRunner } from '@web/test-runner';
import minimist from 'minimist';

import { IMPORT_META_ENV_URL, getConfig, getLwcConfig } from '@lwc/wds-core/node';

const cwd = process.cwd();

export async function main() {
  if (!getLwcConfig(cwd)) {
    console.error('You must execute playground from a directory with LWC config.');
    process.exit(1);
  }

  const args = minimist(process.argv.slice(2));
  const [testGlobPattern] = args._;
  const { debug, open, watch, quiet, root: explicitRootDir, modulesDir } = args;

  const devServerconfig = getConfig({
    explicitRootDir,
    modulesDir,
    watch: !!(watch & !debug),
  });

  const testRunnerHtml = (testRunnerImport, _config) => {
    return `
      <html>
        <head>
        <script type="module">
          import "${IMPORT_META_ENV_URL}";
          window.lwcRuntimeFlags = window.lwcRuntimeFlags || {};
          window.lwcRuntimeFlags.ENABLE_LIGHT_DOM_COMPONENTS = true;
          console.log("custom HTML page");
        </script>
        </head>
        <body>
          <script type="module">
            import '${testRunnerImport}';
          </script>
          <div id="mount"></div>
        </body>
      </html>
    `;
  };

  await startTestRunner({
    config: {
      ...devServerconfig,
      manual: !!debug,
      open: !!(open && debug),
      testRunnerHtml,
      browserLogs: quiet ? false : true,
      testFramework: {
        config: {
          timeout: 20000, // Timeout in milliseconds (example: 10000 ms = 10 seconds)
        },
      },
      groups: [
        {
          name: 'test-lwcs',
          files: testGlobPattern,
        },
      ],
    },
    readCliArgs: false,
    readFileConfig: false,
    autoExitProcess: true,
  });
}
