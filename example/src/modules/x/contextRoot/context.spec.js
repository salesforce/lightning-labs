import { expect, querySelectorDeep, clientSideRender } from '@lwc/test-runner';

const componentPath = import.meta.resolve('./contextRoot.js');

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

  it('nested children can access context reactively', async () => {
    const el = await clientSideRender(parentEl, componentPath, {});
    const contextParent = querySelectorDeep('x-context-parent', el);
    const grandChildContent = querySelectorDeep('.grand-child-content-parent');

    expect(grandChildContent.innerText).to.include('parentFoo');

    contextParent.parentState.value.updateName('newFoo');
    await freshRender();

    expect(grandChildContent.innerText).to.include('newFoo');
  });

  it('nested children can access context from multiple parents', async () => {
    const el = await clientSideRender(parentEl, componentPath, {});
    const grandChildContentParent = querySelectorDeep('.grand-child-content-parent');
    const grandChildContentChild = querySelectorDeep('.grand-child-content-child');

    expect(grandChildContentParent.innerText).to.include('parentFoo');
    expect(grandChildContentChild.innerText).to.include('bar');
  });

  it('disconnecting child remove it subscriptions to parent state context', async () => {
    const el = await clientSideRender(parentEl, componentPath, {});
    const contextParent = querySelectorDeep('x-context-parent');

    // 1. <x-context-parent>
    // 2. <x-context-child>
    // 3. <x-context-grand-child>
    expect(contextParent.parentState.subscribers.size).toBe(3);

    // 1. <x-context-parent>
    // grand child is nested within context child
    // both of them should unsubscribe after removing child
    contextParent.showChild = false;
    await freshRender();

    expect(contextParent.parentState.subscribers.size).toBe(1);
  });
});
