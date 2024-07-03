import mockDep from 'mock{default,changeme}:./mocked-dependency.js';
// '@salesforce/foo' is not installed and will not resolve without being mocked
import 'mock{default}:@salesforce/foo';
import {
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorDeep,
  renderToMarkup,
} from '@lwc/test-runner';

const componentPath = import.meta.resolve('./hasMockedInternals.js');

describe('<x-has-mocked-internals>', () => {
  beforeEach(async () => {
    await mockDep.reset();
  });

  it('can render with a mocked dependency', async () => {
    await mockDep(`
      export const changeme = 'new value';
    `);
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="changeme">new value</div>`);
    // ...
  });

  it('can render with an unmocked dependency', async () => {
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="changeme">unmocked value</div>`);
    // ...
  });

  it('renders with mocked value in both SSR and CSR', async () => {
    await mockDep.eval(`
      exports.changeme = 'new value';
    `);
    const markup = await renderToMarkup(componentPath, {});
    const el = await insertMarkupIntoDom(markup);
    const hydratedWithSsrDOM = await hydrateElement(el, componentPath);
    // Ensure hydration occurred without validation errors.
    expect(hydratedWithSsrDOM).to.be.true;
    // Make assertions about post-hydrated DOM.
    expect(querySelectorDeep('div#changeme')).to.have.text('new value');
  });

  // it('works succesfully with partial mocks', async () => {
  //   const markup = await renderToMarkup(componentPath, {});
  //   const el = await insertMarkupIntoDom(markup);
  //   const hydratedWithSsrDOM = await hydrateElement(el, componentPath);
  //   // Ensure hydration occurred without validation errors.
  //   expect(hydratedWithSsrDOM).to.be.true;
  //   // Make assertions about post-hydrated DOM.
  //   expect(querySelectorDeep('div#changeme')).to.have.text('unmocked value'); //unmocked export changeme retains its values
  // });
});
