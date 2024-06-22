import { expect } from '@open-wc/testing';
import { querySelectorAllDeep, querySelectorDeep } from 'query-selector-shadow-dom';
import { helpers } from '@lwc/wds-core/browser';

import './layout-shifts.js';
import './lwc-life-cycle.js';
import './mutations.js';
import './shadow.js';
import './ssr-correctly.js';
import './visually-identical.js';

const { clientSideRender, hydrateElement, insertMarkupIntoDom, renderToMarkup, wireMockUtil } =
  helpers;

export {
  clientSideRender,
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorAllDeep,
  querySelectorDeep,
  renderToMarkup,
  wireMockUtil,
};
