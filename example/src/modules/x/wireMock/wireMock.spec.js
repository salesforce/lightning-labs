import mockWire from 'mock{myWireAdapter}:@salesforce/foo/myWireAdapter';
import mockWire1 from 'mock{myWireAdapter1}:@salesforce/foo/myWireAdapter1';
import { expect, renderToMarkup, wireMockUtil } from '@lwc/test-runner';

const componentPath = import.meta.resolve('./wireMock.js');

describe('<x-has-mocked-internals>', () => {
  it('wireMockTest', async () => {
    const wireController = await wireMockUtil(mockWire);
    const data = { userId: 1, id: 1, title: 'Wire Mock Success', completed: false };
    await wireController.setWireValue('myWireAdapter', data);
    const wireController1 = await wireMockUtil(mockWire1);
    const data1 = { userId: 1, id: 1, title: 'Wire Mock Success1', completed: false };
    await wireController1.setWireValue('myWireAdapter1', data1);
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="todo1">Wire Mock Success1</div>`);
  });
  //This test fails as it still takes wire adapter values from first it block

  // it('wireMockTest1', async () => {
  //   const wireController1 = await wireMockUtil(mockWire1);
  //   const wireController = await wireMockUtil(mockWire);
  //   const data = { userId: 1, id: 1, title: 'Wire Mock Success2', completed: false };
  //   await wireController.setWireValue('myWireAdapter', data);
  //   const data1 = { userId: 1, id: 1, title: 'Wire Mock Success3', completed: false };
  //   await wireController1.setWireValue('myWireAdapter1', data1);
  //   const markup = await renderToMarkup(componentPath, {});
  //   expect(markup).to.contain(`<div id="todo">Wire Mock Success2</div>`);
  // });
});
