import mockWire from 'mock{myWireAdapter}:@salesforce/foo/myWireAdapter';
import { expect, renderToMarkup, wireMockUtil } from '@lwc/test-runner';

const componentPath = import.meta.resolve('./wireMock.js');

describe('<x-has-mocked-internals>', () => {
  it('wireMockTest', async () => {
    const wireController = await wireMockUtil(mockWire);
    const data = { userId: 1, id: 1, title: 'Wire Mock Success', completed: false };
    await wireController.setWireValue('myWireAdapter', data);
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="todo">Wire Mock Success</div>`);
  });
});
