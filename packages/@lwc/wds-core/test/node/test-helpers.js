import assert from 'node:assert/strict';
import net from 'node:net';
import { DevServer } from '@web/dev-server-core';

/** @type Logger */
const mockLogger = {
  ...console,
  debug() {
    // no debug
  },
  logSyntaxError(error) {
    console.error(error);
  },
};

/** @param {Partial<DevServerCoreConfig>} config */
async function createTestServer(config, _mockLogger = mockLogger) {
  if (!config.rootDir) {
    throw new Error('A rootDir must be configured.');
  }

  const hostname = 'localhost';

  const getRandomPort = async () => {
    const server = net.createServer();
    await new Promise((resolve) => server.listen(0, hostname, resolve));
    const address = server.address();
    await new Promise((resolve) => server.close(resolve));
    return address.port;
  };

  const port = await getRandomPort();

  const server = new DevServer({ hostname, ...config, rootDir: config.rootDir, port }, _mockLogger);

  await server.start();

  const url = new URL('http://localhost');
  url.protocol = config.http2 ? 'https' : 'http';
  url.port = port.toString();
  return { server, port, host: url.toString().slice(0, -1) };
}

/**
 * @import { DevServerCoreConfig } from '@web/dev-server-core';
 */

/**
 * @param {Partial<DevServerCoreConfig>} config
 */
export const createServer = async (config) => {
  const { server, host } = await createTestServer(config, console);

  /** @param {string} path */
  const expectPath = async (path) => {
    const url = new URL(path, host);
    const response = await fetch(url);
    assert.equal(response.status, 200, `Failed to fetch ${url}: ${response.status}`);
    return response;
  };

  /** @param {string} path @param {string} expected */
  const expectText = async (path) => {
    const response = await expectPath(path);
    return await response.text();
  };

  return {
    async stop() {
      await server.stop();
    },
    expectPath,
    expectText,
  };
};
