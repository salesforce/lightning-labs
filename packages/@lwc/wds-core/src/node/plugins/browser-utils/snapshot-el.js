export default () => {
  return {
    name: 'el-snapshot',
    async executeCommand({ command, session, payload }) {
      if (command === 'el-snapshot') {
        const page = session.browser.getPage(session.id);
        const elHandle = await page.evaluateHandle(
          `globalThis.__ELEMENTS_FOR_CAPTURE__.get(${payload.id})`,
        );
        const el = elHandle.asElement();

        if (!el) {
          throw new Error('Browser could not find the expected element.');
        }
        const image = await el.screenshot({
          encoding: 'base64',
          optimizeForSpeed: true,
        });

        return {
          image,
          id: payload.id,
        };
      }
    },
  };
};
