import { assert, chai } from '@open-wc/testing';
import { querySelectorDeep } from 'query-selector-shadow-dom';

chai.use((_chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'haveShadowChild', function (selector) {
    const el = utils.flag(this, 'object');
    const deepChild = querySelectorDeep(selector, el);
    assert(
      deepChild !== null,
      `Expected <${el.tagName.toLowerCase()}> to have deep child matching selector "${selector}"`,
    );
  });
});
