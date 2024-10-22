import {
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorDeep,
  renderToMarkup,
  clientSideRender,
} from '@lwc/test-runner';

const componentPath = import.meta.resolve('./contextRoot.js');

// globalThis.lwcRuntimeFlags.ENABLE_EXPERIMENTAL_SIGNALS = true;

// TODO: shouldn't we be able to await Promise.resolve() / microtask?
const freshRender = () => new Promise((resolve) => window.requestAnimationFrame(resolve));

describe('context', () => {
  const parentEl = document.querySelector('#mount');

  beforeEach(() => {
    parentEl.innerHTML = '';
  });

  it('is provided to children reactively', async () => {
    const el = await clientSideRender(parentEl, componentPath, {});

    const contextParent = querySelectorDeep('x-context-parent', el);

    const childContent = querySelectorDeep('.child-content', el);
    expect(childContent.innerText).to.include('parentFoo');

    contextParent.parentState.value.updateName('newFoo');
    await freshRender();
    expect(childContent.innerText).to.include('newFoo');
  });

  it('is not provided to children without provider in the ancestor chain', async () => {
    const el = await clientSideRender(parentEl, componentPath, {});

    const contextParent = querySelectorDeep('x-context-parent', el);

    const childContent = querySelectorDeep('.lonely-child-content', el);
    expect(childContent.innerText).to.include('not available');

    contextParent.parentState.value.updateName('newFoo');
    await freshRender();
    expect(childContent.innerText).to.include('not available');
  });

  it('updates multiple children when context changes', async () => {
    const el = await clientSideRender(parentEl, componentPath, {});

    const contextParent = querySelectorDeep('x-context-parent', el);
    const childContent = querySelectorDeep('.child-content');
    const childSiblingContent = querySelectorDeep('.child-content-sibling');

    expect(childContent.innerText).to.include('parentFoo');
    expect(childSiblingContent.innerText).to.include('parentFoo');

    contextParent.parentState.value.updateName('newFoo');
    await freshRender();

    expect(childContent.innerText).to.include('newFoo');
    expect(childSiblingContent.innerText).to.include('newFoo');
  });
});
