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

describe('<x-contextparent>', () => {
  it('renders', async () => {
    const parentEl = document.createElement('div');
    document.body.appendChild(parentEl);
    const el = await clientSideRender(parentEl, componentPath, {});
  });
});
