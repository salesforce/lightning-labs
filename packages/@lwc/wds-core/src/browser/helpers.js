import { createElement, hasMismatch, hydrateComponent } from '@lwc/engine-dom';
// import fs from 'node:fs';
// import path from 'node:path';
import { determineTagName } from './shared.js';
import * as ssr from './ssr/index.js';

const thisUrl = new URL(import.meta.url);
// code from wire-service-jest-util.es.js
const wireJestUtil = `class TestWireAdapterTemplate {
    static emit(value, filterFn) {
        let instances = Array.from(this._wireInstances);
        if (typeof filterFn === 'function') {
            instances = instances.filter((instance) => filterFn(instance.getConfig()));
        }
        instances.forEach((instance) => instance.emit(value));
    }
    static getLastConfig() {
        return this._lastConfig;
    }
    constructor(dataCallback) {
        this.config = {};
        this._dataCallback = dataCallback;
        this.constructor._wireInstances.add(this);
    }
    update(config) {
        this.config = config;
        this.constructor._lastConfig = config;
    }
    connect() {
        this.constructor._lastConfig = {};
        this.constructor._wireInstances.add(this);
    }
    disconnect() {
        this.constructor._wireInstances.delete(this);
    }
    emit(value) {
        this._dataCallback(value);
    }
    getConfig() {
        return this.config;
    }
}
TestWireAdapterTemplate._lastConfig = null;
TestWireAdapterTemplate._wireInstances = new Set();
function buildTestWireAdapter() {
    var _a;
    return _a = class TestWireAdapter extends TestWireAdapterTemplate {
        },
        _a._lastConfig = null,
        _a._wireInstances = new Set(),
        _a;
}

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
function buildErrorObject$1({ body, status, statusText, }) {
    if (status && (status < 400 || status > 599)) {
        throw new Error("'status' must be >= 400 or <= 599");
    }
    body = body || {
        message: 'An internal server error has occurred',
    };
    status = status || 400;
    statusText = statusText || 'Bad Request';
    return {
        body,
        ok: false,
        status,
        statusText,
    };
}
class ApexTestWireAdapterTemplate extends TestWireAdapterTemplate {
    static emit(value, filterFn) {
        super.emit({ data: value, error: undefined }, filterFn);
    }
    static emitError(errorOptions, filterFn) {
        const err = buildErrorObject$1(errorOptions || {});
        super.emit({ data: undefined, error: err }, filterFn);
    }
    static error(body, status, statusText) {
        const err = buildErrorObject$1({ body, status, statusText });
        super.emit({ data: undefined, error: err });
    }
    constructor(dataCallback) {
        super(dataCallback);
        this.emit({ data: undefined, error: undefined });
    }
}
function buildApexTestWireAdapter() {
    var _a;
    return _a = class ApexTestWireAdapter extends ApexTestWireAdapterTemplate {
        },
        _a._lastConfig = null,
        _a._wireInstances = new Set(),
        _a;
}

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
function buildErrorObject({ body, status, statusText, }) {
    if (status && (status < 400 || status > 599)) {
        throw new Error("'status' must be >= 400 or <= 599");
    }
    body = body || [
        {
            errorCode: 'NOT_FOUND',
            message: 'The requested resource does not exist',
        },
    ];
    status = status || 404;
    statusText = statusText || 'NOT_FOUND';
    return {
        body,
        ok: false,
        status,
        statusText,
    };
}
class LdsTestWireAdapterTemplate extends TestWireAdapterTemplate {
    static emit(value, filterFn) {
        super.emit({ data: value, error: undefined }, filterFn);
    }
    static emitError(errorOptions, filterFn) {
        const err = buildErrorObject(errorOptions || {});
        super.emit({ data: undefined, error: err }, filterFn);
    }
    static error(body, status, statusText) {
        const err = buildErrorObject({ body, status, statusText });
        super.emit({ data: undefined, error: err });
    }
    constructor(dataCallback) {
        super(dataCallback);
        this.emit({ data: undefined, error: undefined });
    }
}
function buildLdsTestWireAdapter() {
    var _a;
    return _a = class LdsTestWireAdapter extends LdsTestWireAdapterTemplate {
        },
        _a._lastConfig = null,
        _a._wireInstances = new Set(),
        _a;
}

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
// Provides temporary backward compatibility for wire-protocol reform (lwc > 1.5.0). This code
// should be removed once all adapters are migrated to the the API.
const wireAdaptersRegistryHack = globalThis.wireAdaptersRegistryHack || new Map();
function deprecatedRegisterAdapter(adapterId, TestWireAdapter) {
    const eventTargetToAdapterMap = new WeakMap();
    const spy = {
        createInstance(wiredEventTarget) {
            eventTargetToAdapterMap.set(wiredEventTarget, new TestWireAdapter((data) => wiredEventTarget.emit(data)));
        },
        connect(wiredEventTarget) {
            const wireInstance = eventTargetToAdapterMap.get(wiredEventTarget);
            if (wireInstance) {
                wireInstance.connect();
            }
        },
        update(wiredEventTarget, config) {
            const wireInstance = eventTargetToAdapterMap.get(wiredEventTarget);
            if (wireInstance) {
                wireInstance.update(config);
            }
        },
        disconnect(wiredEventTarget) {
            const wireInstance = eventTargetToAdapterMap.get(wiredEventTarget);
            if (wireInstance) {
                wireInstance.disconnect();
            }
        },
    };
    const relatedAdapter = wireAdaptersRegistryHack.get(adapterId);
    if (relatedAdapter) {
        relatedAdapter.adapter.spyAdapter(spy);
    }
}

/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const MIGRATION_LINK = 'https://github.com/salesforce/wire-service-jest-util/blob/master/docs/migrating-from-version-2.x-to-3.x.md';
const knownAdapterMocks = new WeakSet();
function getMigrationMessageFor(registerFnName) {
    return \`\${registerFnName} is deprecated. More details: \${MIGRATION_LINK}\`;
}
function validateAdapterId(adapterId) {
    if (!adapterId) {
        throw new Error('No adapter specified');
    }
}
function isWireAdapterMock(adapter) {
    return knownAdapterMocks.has(adapter);
}
/**
 * @deprecated
 */
function registerLdsTestWireAdapter(identifier) {
    validateAdapterId(identifier);
    console.warn(getMigrationMessageFor('registerLdsTestWireAdapter'));
    if (!isWireAdapterMock(identifier)) {
        const spy = buildLdsTestWireAdapter();
        deprecatedRegisterAdapter(identifier, spy);
        return spy;
    }
    return identifier;
}
/**
 * @deprecated
 */
function registerApexTestWireAdapter(identifier) {
    validateAdapterId(identifier);
    console.warn(getMigrationMessageFor('registerApexTestWireAdapter'));
    if (!isWireAdapterMock(identifier)) {
        const spy = buildApexTestWireAdapter();
        deprecatedRegisterAdapter(identifier, spy);
        return spy;
    }
    return identifier;
}
/**
 * @deprecated
 */
function registerTestWireAdapter(identifier) {
    validateAdapterId(identifier);
    console.warn(getMigrationMessageFor('registerTestWireAdapter'));
    if (!isWireAdapterMock(identifier)) {
        const testAdapter = buildTestWireAdapter();
        deprecatedRegisterAdapter(identifier, testAdapter);
        return testAdapter;
    }
    return identifier;
}
// found no other way to omit these private properties
function createWireAdapterMock(TestWireAdapter, fn) {
    let testAdapter = TestWireAdapter;
    if (typeof fn === 'function') {
        Object.defineProperty(fn, 'adapter', { value: TestWireAdapter });
        Object.setPrototypeOf(fn, TestWireAdapter);
        // @ts-ignore
        testAdapter = fn;
    }
    knownAdapterMocks.add(testAdapter);
    return testAdapter;
}
function createApexTestWireAdapter(fn) {
    return createWireAdapterMock(buildApexTestWireAdapter(), fn);
}
function createLdsTestWireAdapter(fn) {
    return createWireAdapterMock(buildLdsTestWireAdapter(), fn);
}
function createTestWireAdapter(fn) {
    return createWireAdapterMock(buildTestWireAdapter(), fn);
}`;
function getQueryString(paramsObj) {
  const queryParams = new URLSearchParams(thisUrl.searchParams);
  if (paramsObj && Object.keys(paramsObj).length > 0) {
    for (const [key, val] of Object.entries(paramsObj)) {
      queryParams.set(key, val);
    }
  }
  const queryString = queryParams.toString();
  return queryString.length ? `?${queryString}` : '';
}

export async function renderToMarkup(componentPath, props = {}) {
  return await ssr.render(componentPath, props);
}

function attachShadowRoots(rootEl) {
  for (const templateEl of rootEl.querySelectorAll('template[shadowroot]')) {
    const mode = templateEl.getAttribute('shadowroot');
    const shadowRoot = templateEl.parentNode.attachShadow({ mode });
    shadowRoot.appendChild(templateEl.content);
    templateEl.remove();
    attachShadowRoots(shadowRoot);
  }
}

export async function insertMarkupIntoDom(markup, parentEl = document.querySelector('#mount')) {
  if (Element.prototype.setHTMLUnsafe) {
    parentEl.setHTMLUnsafe(markup);
  } else {
    parentEl.innerHTML = markup;
  }
  attachShadowRoots(parentEl);
  return parentEl.firstChild;
}

export async function hydrateElement(el, componentPath, props = {}, cacheBust = false) {
  const cacheBustedComponentPath = cacheBust
    ? `${componentPath}${getQueryString({ cacheBust: Date.now() })}`
    : `${componentPath}${getQueryString()}`;
  const { default: Ctor } = await import(cacheBustedComponentPath);

  hydrateComponent(el, Ctor, props);

  return !hasMismatch;
}

export async function clientSideRender(parentEl, componentPath, props = {}, cacheBust = false) {
  const cacheBustedComponentPath = cacheBust
    ? `${componentPath}${getQueryString({ cacheBust: Date.now() })}`
    : `${componentPath}${getQueryString()}`;

  const { default: Ctor } = await import(cacheBustedComponentPath);
  const elm = createElement(determineTagName(cacheBustedComponentPath, document.location.origin), {
    is: Ctor,
  });
  for (const [key, val] of Object.entries(props)) {
    elm[key] = val;
  }
  parentEl.appendChild(elm);
  return elm;
}

export async function wireMockUtil(mockController) {
  const setWireValue = async (exportName, newValue) => {
    await mockController(`
    ${wireJestUtil}  
    const data = { 'userId': 1, 'id': 1, 'title': 'delectus aut autem', 'completed': false };
    export const ${exportName} = createTestWireAdapter()
    ${exportName}.emit(data); `);
  };
  return { setWireValue };
}
