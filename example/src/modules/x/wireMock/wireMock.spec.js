import mockWire from 'mock{myWireAdapter}:@salesforce/foo/myWireAdapter';
import { expect, renderToMarkup, wireMockUtil } from '@lwc/test-runner';

const componentPath = import.meta.resolve('./wireMock.js');

describe('<x-has-mocked-internals>', () => {
  it('wireMockTest', async () => {
    const wireController = await wireMockUtil(mockWire);
    await wireController.setWireValue('myWireAdapter', 'new value');
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="todo">data</div>`);
  });
});
