import mockDep from 'mock{default,changeme}:./mocked-dependency.js';

// // Uncommenting the following import currently produces an error, but the behavior
// // should be allowed. If a test author wants to define mocks for only some of the
// // exports, they should be allowed to do so. However, because {default,changeme} was
// // specified in the import above, the Node.js host process currently cannot handle
// // another mock (in a separate test file, or this one) that specifies different mocked
// // exports.
import mockDepAlt from 'mock{default}:./mocked-dependency.js';

// // Uncommenting the following import currently produces an error, and *it should continue
// // to produce an error*. `mocked-dependency.js` is a real file with real exports. It does
// // not have an export named `invalid`. Therefore, it should not be permitted for a test
// // author to try to mock an export that is known to be invalid.
// import mockDepAlt from 'mock{default,invalid}:./mocked-dependency.js';

// '@salesforce/foo' is not installed and will not resolve without being mocked
import 'mock{default}:@salesforce/foo';

// Uncommenting the following import also produces an error. In this case, the module
// `@salesforce/foo` cannot be resolved on the filesystem. Because of this, the valid exports
// cannot be statically determined. And because the valid exports cannot be determined,
// the test author should be allowed to mock whatever exports they specify, even if different
// exports are defined for `@salesforce/foo` in a separate mock declaration (like above);
//
// It will never be possible to actually uncomment this import, because of how ES modules
// work under the hood. Once an ES module is defined and its exports are known, that cannot
// be changed in a single JavaScript runtime environment. However, it should be possible
// to add this import in another `*.spec.js` file, because `@salesforce/foo` will be imported
// in a unique and distince JavaScript runtime environment. The Node.js host server should
// allow for this pattern to be used.
import 'mock{otherExport}:@salesforce/foo';

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
      export default 'bar';
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
    await mockDep(`
      export default 'bar';
      export const changeme = 'new value';
    `);
    const markup = await renderToMarkup(componentPath, {});
    const el = await insertMarkupIntoDom(markup);
    const hydratedWithSsrDOM = await hydrateElement(el, componentPath);
    // Ensure hydration occurred without validation errors.
    expect(hydratedWithSsrDOM).to.be.true;
    // Make assertions about post-hydrated DOM.
    expect(querySelectorDeep('div#changeme')).to.have.text('new value');
  });
});
