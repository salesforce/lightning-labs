export default async function captureElement({ page, webSocket, data }) {
  const { requestId } = data;
  const elHandle = await page.evaluateHandle(
    `globalThis.__ELEMENTS_FOR_CAPTURE__.get(${requestId})`,
  );
  const el = elHandle.asElement();
  if (!el) {
    throw new Error('Browser could not find the expected element.');
  }
  const image = await el.screenshot({
    encoding: 'base64',
    optimizeForSpeed: true,
  });

  const payload = {
    image,
    requestId,
  };

  webSocket.send(
    JSON.stringify({
      type: 'uplift-capture-element-response',
      payload,
    }),
  );
}
