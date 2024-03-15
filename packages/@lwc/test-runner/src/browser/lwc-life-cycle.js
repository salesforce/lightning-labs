import { assert, chai } from '@open-wc/testing';

async function errorInConnectedCallbackAssertion(utils, self, message) {
  let syncError;
  let asyncError;
  const obj = utils.flag(self, 'object');

  if (typeof obj !== 'function') {
    throw new Error(`Expected a function, received: ${obj}`);
  }

  const listener = (errorEvent) => {
    errorEvent.preventDefault();
    asyncError = errorEvent.error.message;
  };
  window.addEventListener('error', listener);

  try {
    await obj();
  } catch (err) {
    syncError = err;
  } finally {
    window.removeEventListener('error', listener);
  }

  const finalError = syncError || asyncError;
  assert.equal(finalError.message, message, `Expected to throw ${message}`);
}

chai.use((_chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'throwInConnectedCallback', function (message) {
    errorInConnectedCallbackAssertion(utils, this, message);
  });
  utils.addMethod(chai.Assertion.prototype, 'throwErrorInConnectedCallback', function (message) {
    errorInConnectedCallbackAssertion(utils, this, message);
  });
});
