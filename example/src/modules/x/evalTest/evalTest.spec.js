import { expect, renderToMarkup } from '@lwc/test-runner';
import mockDep from 'mock{default,counter,override}:@salesforce/foo/dep';
const componentPath = import.meta.resolve('./evalTest.js');
describe('<x-has-mocked-internals>', () => {
  it('eval test', async () => {
    await mockDep(`
      export let counter = 0;
      export async function override(startingVal = 0) {
        counter = startingVal;
      }
    `);

    await mockDep.eval(`
      exports.counter = 1;
    `);

    // even though this is called still the counter value in not update as the counter reference inside the override func is not considered in scope of mock.
    await mockDep.eval(`
       await exports.override(100);
    `);

    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="counter">1</div>`);

    // const sum = await mockDep.eval(`
    //   return counter + _wrappedCounter.value;
    // `);
    // console.log(sum);
  });
});
