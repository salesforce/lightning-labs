import { IMPORT_META_ENV_URL } from '@lwc/wds-core/node';

const genHtml = ({
  componentUrl,
  moduleMainUrl,
  shoelaceBaseUrl,
  componentMetadata,
  webSocketImport,
}) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"
    />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <style>
      body {
        margin: 0;
      }
    </style>
    <title>Uplift Playground</title>
  </head>
  <body>
  </body>
  <script type="module">
    import "${IMPORT_META_ENV_URL}"
    window.lwcRuntimeFlags = window.lwcRuntimeFlags || {};
    window.lwcRuntimeFlags.ENABLE_LIGHT_DOM_COMPONENTS = true;
  </script>
  <script type="module">
    import { setBasePath } from '${shoelaceBaseUrl}/utilities/base-path.js';
    import { webSocket } from '${webSocketImport}';

    window.__WEB_SOCKET__ = webSocket;

    setBasePath('${shoelaceBaseUrl}');

    globalThis.fileChangeSubscribers = new Set();
    webSocket.addEventListener('message', async e => {
      try {
        const message = JSON.parse(e.data);
        if (message.type === 'fileChange') {
          [...globalThis.fileChangeSubscribers].forEach(cb => cb(message.path));
        } else if (message.type === 'hmr:reload') {
          // Because this is not true HMR, the dev-server plugin will try to reload
          // the page if we don't prevent that behavior.
          e.stopImmediatePropagation();
        }
      } finally {}
    });

  </script>
  <script type="module">
    import main from '${moduleMainUrl}';
    main('${componentUrl}', ${JSON.stringify(componentMetadata)}).catch(console.error);
  </script>
</html>
`;

export default ({ componentUrl, moduleMainUrl, shoelaceBaseUrl, componentMetadata }) => {
  let webSocketImport = null;

  return {
    name: 'index-html',
    injectWebSocket: true,

    serve(context) {
      if (context.path === '/') {
        return genHtml({
          componentUrl,
          moduleMainUrl,
          shoelaceBaseUrl,
          componentMetadata,
          webSocketImport,
        });
      }
    },

    serverStart({ webSockets, fileWatcher }) {
      webSocketImport = webSockets.webSocketImport;
      fileWatcher.on('change', (path) => {
        webSockets.send(JSON.stringify({ type: 'fileChange', path }));
      });
    },
  };
};
