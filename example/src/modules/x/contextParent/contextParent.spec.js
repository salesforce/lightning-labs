import {
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorDeep,
  renderToMarkup,
  clientSideRender,
} from '@lwc/test-runner';

const componentPath = import.meta.resolve('./contextParent.js');

globalThis.lwcRuntimeFlags.ENABLE_EXPERIMENTAL_SIGNALS = true;

describe('<x-parent>', () => {
  it('renders', async () => {
    const parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
    const el = await clientSideRender(parentEl, componentPath, {}, true);
  });
});
