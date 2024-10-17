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

describe('<x-contextparent>', () => {
  it('renders', async () => {
    const parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
    const el = await clientSideRender(parentEl, componentPath, {});

    const contextParent = querySelectorDeep('x-context-parent', el);
    console.log('contextParent', contextParent);
    const contextChild = querySelectorDeep('x-context-child', el);
    console.log('contextChild', contextChild);

    const childContent = querySelectorDeep('.child-content', el);
    expect(childContent.innerText).to.include('parentFoo');

    contextParent.parentState.value.updateName('newFoo');
    await freshRender();
    expect(childContent.innerText).to.include('newFoo');
  });
});
