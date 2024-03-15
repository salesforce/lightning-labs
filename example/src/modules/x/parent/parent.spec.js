import {
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorDeep,
  renderToMarkup,
} from '@lwc/test-runner';

const componentPath = import.meta.resolve('./parent.js');

describe('<x-parent>', () => {
  it('does a thing', async () => {
    const markup = await renderToMarkup(componentPath, {});
    // Make assertions about raw HTML markup.
    expect(markup).to.contain('</x-parent>');

    const el = await insertMarkupIntoDom(markup);
    // Make assertions about pre-hydrated DOM.
    expect(el).to.haveShadowChild('p.child-content');

    const hydratedWithSsrDOM = await hydrateElement(el, componentPath);
    // Ensure hydration occurred without validation errors.
    expect(hydratedWithSsrDOM).to.be.true;
    // Make assertions about post-hydrated DOM.
    expect(querySelectorDeep('p.child-content')).to.have.text('Message: hey howdy!');
  });

  it('throws an error in connected callback', async () => {
    await expect(async () => {
      await renderToMarkup(componentPath, { throwError: true });
    }).to.throwErrorInConnectedCallback('When do I get called?');
  });

  it('SSR correctly', async () => {
    const props = {};
    await expect(componentPath, props).to.SSRCorrectly();
  });

  it('checks that SSR and CSR are visually the same ', async () => {
    const props = {};
    await expect(componentPath, props).to.be.visuallyIdenticalInCSRandSSR();
  });

  it('has no layout shifts', async () => {
    const props = {
      shiftLayout: false,
    };
    await expect(componentPath, props).to.have.noLayoutShifts();
  });

  it('makes no DOM mutations', async () => {
    const props = {
      mutateDOM: false,
    };
    await expect(componentPath, props).to.notMakeDomMutationsDuringSSR();
  });
});
