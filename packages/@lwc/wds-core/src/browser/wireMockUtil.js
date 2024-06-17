export function getWireMockUtil() {
  return `
    let initialValue = undefined;
    class TestWireAdapterTemplate {
        static initialValue;

        static emit(value, filterFn) {
            this.initialValue = value;
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
            if (this.constructor.initialValue !== undefined) {
                this.emit(this.constructor.initialValue);
            }
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

    const knownAdapterMocks = new WeakSet();
    function validateAdapterId(adapterId) {
        if (!adapterId) {
            throw new Error('No adapter specified');
        }
    }
    function isWireAdapterMock(adapter) {
        return knownAdapterMocks.has(adapter);
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
    }
    `;
}
