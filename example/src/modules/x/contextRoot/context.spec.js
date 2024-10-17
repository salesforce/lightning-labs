import {
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorDeep,
  renderToMarkup,
  clientSideRender,
} from '@lwc/test-runner';

const componentPath = import.meta.resolve('./contextRoot.js');

globalThis.lwcRuntimeFlags.ENABLE_EXPERIMENTAL_SIGNALS = true;

// TODO: shouldn't we be able to await Promise.resolve() / microtask?
const freshRender = () => new Promise((resolve) => window.requestAnimationFrame(resolve));

describe('context', () => {
  beforeEach(() => {
    const parentEl = document.querySelector('#mount');
    parentEl.innerHTML = '';
  });

  it('is provided to children reactively', async () => {
    // const parentEl = document.createElement('div');
    const parentEl = document.querySelector('#mount');
    // document.body.appendChild(parentEl);
    const el = await clientSideRender(parentEl, componentPath, {});

    const contextParent = querySelectorDeep('x-context-parent', el);

    const childContent = querySelectorDeep('.child-content', el);
    expect(childContent.innerText).to.include('parentFoo');

    contextParent.parentState.value.updateName('newFoo');
    await freshRender();
    expect(childContent.innerText).to.include('newFoo');
  });

  it('is not provided to children without provider in the ancestor chain', async () => {
    const parentEl = document.querySelector('#mount');
    const el = await clientSideRender(parentEl, componentPath, {});

    const contextParent = querySelectorDeep('x-context-parent', el);

    const childContent = querySelectorDeep('.lonely-child-content', el);
    expect(childContent.innerText).to.include('not available');

    contextParent.parentState.value.updateName('newFoo');
    await freshRender();
    expect(childContent.innerText).to.include('not available');
  });
});
