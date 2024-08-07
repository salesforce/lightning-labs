import mockWire from 'mock{myWireAdapter}:@salesforce/foo/myWireAdapter';
import { expect, renderToMarkup, wireMockUtil } from '@lwc/test-runner';

const componentPath = import.meta.resolve('./wireMock.js');
await wireMockUtil(mockWire, 'myWireAdapter');
describe('<x-has-mocked-internals>', () => {
  it('wireMockTest', async () => {
    const updateCode = `
      const data = {
          userId: 1,
          id: 1,
          title: 'Wire Mock Success1',
          completed: false
        };
        exports.myWireAdapter.emit(data);
    `;
    await mockWire.eval(updateCode);
    const data1 = { userId: 1, id: 1, title: 'Wire Mock Success1', completed: false };
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="todo">Wire Mock Success1</div>`);
  });

  it('wireMockTest1', async () => {
    const updateCode = `
      const data = {
          userId: 1,
          id: 1,
          title: 'Wire Mock Success2',
          completed: false
        };
      exports.myWireAdapter.emit(data);
    `;
    await mockWire.eval(updateCode);
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="todo">Wire Mock Success2</div>`);
  });
});
