import { executeServerCommand } from '@web/test-runner-commands';

const INSIDE_TEST_RUNNER = !!(new URL(window.location.href).searchParams.get('wtr-session-id'));

let nextRequestId = 0;
const elementsForCapture = (globalThis.__ELEMENTS_FOR_CAPTURE__ = new Map());
const responseCallbacks = new Map();

const webSocket = window.__WEB_SOCKET__;

webSocket?.addEventListener('message', async (ev) => {
  const { type, payload } = JSON.parse(ev.data);

  if (type !== 'uplift-capture-element-response') {
    return;
  }
  ev.stopImmediatePropagation();

  const { requestId, image: imageBase64 } = payload;

  const image = Uint8Array.from(atob(imageBase64), (charByteStr) => charByteStr.charCodeAt(0));

  const resolveCaptureRequest = responseCallbacks.get(requestId);
  if (!resolveCaptureRequest) {
    return console.error(
      `Could not find response callback for element capture request #${requestId}`,
    );
  }

  resolveCaptureRequest(image);
});

async function captureElementInPlayground(el) {
  const requestId = nextRequestId++;
  elementsForCapture.set(requestId, el);
  webSocket.send(
    JSON.stringify({
      type: 'uplift-capture-element',
      requestId,
    }),
  );
  const imageUint8Arr = await new Promise((resolve) => responseCallbacks.set(requestId, resolve));
  elementsForCapture.delete(requestId);
  responseCallbacks.delete(requestId);
  return imageUint8Arr;
}

async function captureElementInTest(el) {
  const requestId = nextRequestId++;
  elementsForCapture.set(requestId, el);

  try {
    const result = await executeServerCommand('el-snapshot', {
      id: String(requestId),
      tagName: el.tagName,
    });

    if (!result) {
      throw new Error('Failed to get a shapshot of the given element.');
    }

    return result;
  } finally {
    elementsForCapture.delete(requestId);
  }
}

export const captureElement = INSIDE_TEST_RUNNER ? captureElementInTest : captureElementInPlayground;
