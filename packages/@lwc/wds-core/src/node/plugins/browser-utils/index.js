import captureElement from './capture-element.js';

export default ({ getBrowserHandles }) => {
  return {
    name: 'browser-utils',
    injectWebSocket: true,

    serverStart({ webSockets }) {
      webSockets.on('message', async ({ webSocket, data }) => {
        if (!data.type.startsWith('uplift-')) {
          return;
        }
        const { browser, page } = getBrowserHandles();

        if (data.type === 'uplift-capture-element') {
          return captureElement({
            browser,
            data,
            page,
            webSocket,
          });
        }
      });
    },
  };
};
