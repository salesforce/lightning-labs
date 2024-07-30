import test from 'node:test';
import { createServer } from './test-helpers.js';

test('works with implicit html', async () => {
  const cwd = `${import.meta.dirname}/fixtures/basic`;
  process.chdir(cwd);
  const { getConfig } = await import('../../src/node/index.js');
  const config = getConfig({
    explicitRootDir: '.',
  });
  const server = await createServer(config);
  const stem = '/src/modules/x/withImplicitHtml/withImplicitHtml';

  const expected = [
    [`${stem}.js`, 'import _tmpl from "./withImplicitHtml.html";'],
    [`${stem}.html`, 'With Implicit l'],
  ];

  try {
    await Promise.all(
      expected.map(([path, expectedContent]) => server.expectText(path, expectedContent)),
    );
  } finally {
    server.stop();
  }
});

test('works with implicit css', async () => {
  const cwd = `${import.meta.dirname}/fixtures/basic`;
  process.chdir(cwd);
  const { getConfig } = await import('../../src/node/index.js');
  const config = getConfig({
    explicitRootDir: '.',
  });
  const server = await createServer(config);

  const stem = '/src/modules/x/withImplicitCss/withImplicitCss';

  const expected = [
    [`${stem}.js`, 'import _tmpl from "./withImplicitCss.html";'],
    [`${stem}.html`, 'import _implicitStylesheets from "./withImplicitCss.css";'],
    [`${stem}.css`, 'export default [stylesheet];'],
  ];

  try {
    await Promise.all(
      expected.map(([path, expectedContent]) => server.expectText(path, expectedContent)),
    );
  } finally {
    server.stop();
  }
});
