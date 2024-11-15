import { querySelectorAllDeep, querySelectorDeep } from 'query-selector-shadow-dom';
import { helpers } from '@lwc/wds-core/browser';
import { expect } from './expect.js';
import sinon from 'sinon';
import './layout-shifts.js';
import './lwc-life-cycle.js';
import './mutations.js';
import './shadow.js';
import './ssr-correctly.js';
import './visually-identical.js';
import './to-have-text-content.js';

const {
  clientSideRender,
  hydrateElement,
  insertMarkupIntoDom,
  renderToMarkup,
  wireMockUtil,
  setHooks,
} = helpers;

export {
  clientSideRender,
  expect,
  hydrateElement,
  insertMarkupIntoDom,
  querySelectorAllDeep,
  querySelectorDeep,
  renderToMarkup,
  wireMockUtil,
  setHooks,
  sinon,
};
