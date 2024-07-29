import { assert, chai } from '@open-wc/testing';
import { querySelectorDeep } from 'query-selector-shadow-dom';

// Define the custom matcher
chai.use((_chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'toHaveTextContent', function (expectedText) {
    const el = utils.flag(this, 'object');
    const textContent = el.textContent || '';

    assert(
      textContent.includes(expectedText),
      `Expected element to have text content "${expectedText}", but it was "${textContent}"`,
    );
  });
});

export { chai };
