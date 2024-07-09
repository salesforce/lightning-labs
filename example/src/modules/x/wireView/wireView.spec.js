import {
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorDeep,
  renderToMarkup,
} from '@lwc/test-runner';

const componentPath = import.meta.resolve('./wireView.js');

describe('<x-wire-view>', () => {
  it('renders to SSR & hydrates successfully', async () => {
    const markup = await renderToMarkup(componentPath, {});
    // Make assertions about raw HTML markup.
    expect(markup).to.contain('</x-wire-view>');

    const el = await insertMarkupIntoDom(markup);
    // Make assertions about pre-hydrated DOM.
    const hydratedWithSsrDOM = await hydrateElement(el, componentPath);
    // Ensure hydration occurred without validation errors.
    expect(hydratedWithSsrDOM).to.be.true;
    // Make assertions about post-hydrated DOM.
    expect(querySelectorDeep('#currentTime')).to.have.text('');

    await Promise.resolve();

    // Make assertions about post-update DOM.
    expect(querySelectorDeep('#currentTime')).to.have.text(new Date().toString());

    expect(querySelectorDeep('#tagName')).to.have.text('x-wire-view');
  });
});
