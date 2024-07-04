import {
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorDeep,
  renderToMarkup,
} from '@lwc/test-runner';

const componentPath = import.meta.resolve('./parent.js');

describe('<x-parent>', () => {
  it('renders to SSR & hydrates successfully', async () => {
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

  it('throws an error in connected callback when SSRd', async () => {
    await expect(async () => {
      await renderToMarkup(componentPath, { throwError: true });
    }).to.throwErrorInConnectedCallback('When do I get called?');
  });

  it('SSRs correctly', async () => {
    const props = {};
    // This assertion is roughly equivalent to everything seen in the above test:
    //   it('renders to SSR & hydrates successfully')
    await expect(componentPath, props).to.SSRCorrectly();
  });

  // it('checks that SSR and CSR are visually the same ', async () => {
  //   const props = {};
  //   // Pixel-by-pixel comparison is done here to ensure visual sameness.
  //   await expect(componentPath, props).to.be.visuallyIdenticalInCSRandSSR();
  // });

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
