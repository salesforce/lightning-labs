import { assert, chai } from '@open-wc/testing';
import { helpers } from '@lwc/wds-core/browser';

const { hydrateElement, insertMarkupIntoDom, renderToMarkup } = helpers;

chai.use((_chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'SSRCorrectly', async function () {
    const componentPath = utils.flag(this, 'object');
    const props = utils.flag(this, 'message');

    const markup = await renderToMarkup(componentPath, props);
    const el = await insertMarkupIntoDom(markup);
    const hydratedWithSsrDOM = await hydrateElement(el, componentPath, props);

    assert(
      hydratedWithSsrDOM === true,
      `Expected component at "${componentPath}" to hydrate without validation errors`,
    );
  });
});
