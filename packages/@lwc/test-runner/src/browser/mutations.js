import { collectAllElementsDeep } from 'query-selector-shadow-dom';

import { assert, chai } from '@open-wc/testing';
import { getElementName, helpers } from '@lwc/wds-core/browser';

const { hydrateElement, insertMarkupIntoDom, renderToMarkup } = helpers;

function setupMutationObserverOnAllElements(doc) {
  const observedMutations = new Map();
  const config = {
    attributes: true,
    childList: true,
    subtree: true,
  };
  let allElements = collectAllElementsDeep('body *', doc);

  const mutationCallback = (mutationList) => {
    for (const mutation of mutationList) {
      const record = {
        type: mutation.type,
      };

      if (mutation.addedNodes.length > 0) {
        record.addedNodes = [];
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.outerHTML) {
            record.addedNodes.push(addedNode.outerHTML);
          } else {
            record.addedNodes.push(addedNode.textContent);
          }
        }
      }

      if (mutation.removedNodes.length > 0) {
        record.removedNodes = [];
        for (const removedNode of mutation.removedNodes) {
          if (removedNode.outerHTML) {
            record.removedNodes.push(removedNode.outerHTML);
          } else {
            record.removedNodes.push(removedNode.textContent);
          }
        }
      }

      if (mutation.oldValue) {
        record.oldValue = mutation.oldValue;
      }

      const records = observedMutations.get(mutation.target) || [];
      records.push(record);
      observedMutations.set(mutation.target, records);
    }
  };

  const mutationObserver = new MutationObserver(mutationCallback);

  // Iterate through all elements
  // to gather elements inside shadow DOM
  // and attaches mutation observer to *all* the elements
  while (allElements.length > 0) {
    const element = allElements.shift();

    if (element.shadowRoot) {
      const allElementsInsideShadowRoot = collectAllElementsDeep('*', element.shadowRoot);
      allElements = allElements.concat(allElementsInsideShadowRoot);
    }

    mutationObserver.observe(element, config);
  }

  // Any observed mutation will be added to the map
  // with target node as the key
  return {
    disconnectObserver: mutationObserver.disconnect.bind(mutationObserver),
    observedMutations,
  };
}

chai.use((_chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'notMakeDomMutationsDuringSSR', async function () {
    const componentPath = utils.flag(this, 'object');
    const props = utils.flag(this, 'message');

    const markup = await renderToMarkup(componentPath, props);
    const el = await insertMarkupIntoDom(markup);

    const { observedMutations, disconnectObserver } = setupMutationObserverOnAllElements(document);

    await hydrateElement(el, componentPath, props);

    let errorMessage = '';

    if (observedMutations.size > 0) {
      for (const [target, mutationRecords] of observedMutations.entries()) {
        const identifier = getElementName(target);
        errorMessage += `Observed following mutations for element: ${identifier}`;
        for (const mutationRecord of mutationRecords) {
          errorMessage += `\n${JSON.stringify(mutationRecord, null, 2)}`;
        }
      }
    }

    disconnectObserver();

    assert.equal(
      observedMutations.size,
      0,
      `Expected hydration not to mutate component's DOM but instead \n${errorMessage}`,
    );
  });
});
