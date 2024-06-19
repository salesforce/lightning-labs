class TestWireAdapterTemplate {
  static emit(value, filterFn) {
    let instances = Array.from(TestWireAdapterTemplate._wireInstances);
    if (typeof filterFn === 'function') {
      instances = instances.filter((instance) => filterFn(instance.getConfig()));
    }
    for (const instance of instances) {
      instance.emit(value);
    }
  }

  static getLastConfig() {
    return TestWireAdapterTemplate._lastConfig;
  }

  constructor(dataCallback) {
    this.config = {};
    this._dataCallback = dataCallback;
    TestWireAdapterTemplate._wireInstances.add(this);
  }

  update(config) {
    this.config = config;
    TestWireAdapterTemplate._lastConfig = config;
  }

  connect() {
    TestWireAdapterTemplate._lastConfig = {};
    TestWireAdapterTemplate._wireInstances.add(this);
  }

  disconnect() {
    TestWireAdapterTemplate._wireInstances.delete(this);
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
  let initialValue = undefined;
  const _a = class TestWireAdapter extends TestWireAdapterTemplate {
    static emit(value, filterFn) {
      initialValue = value;
      return TestWireAdapterTemplate.emit(initialValue);
    }
    connect() {
      this.emit(initialValue);
      super.connect();
    }
  };
  _a._lastConfig = null;
  _a._wireInstances = new Set();
  return _a;
}

function buildErrorObject$1({ body, status, statusText }) {
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
    TestWireAdapterTemplate.emit({ data: value, error: undefined }, filterFn);
  }

  static emitError(errorOptions, filterFn) {
    const err = buildErrorObject$1(errorOptions || {});
    TestWireAdapterTemplate.emit({ data: undefined, error: err }, filterFn);
  }

  static error(body, status, statusText) {
    const err = buildErrorObject$1({ body, status, statusText });
    TestWireAdapterTemplate.emit({ data: undefined, error: err });
  }

  constructor(dataCallback) {
    super(dataCallback);
    this.emit({ data: undefined, error: undefined });
  }
}

function buildApexTestWireAdapter() {
  const _a = class ApexTestWireAdapter extends ApexTestWireAdapterTemplate {};
  _a._lastConfig = null;
  _a._wireInstances = new Set();
  return _a;
}

function buildErrorObject({ body, status, statusText }) {
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
    TestWireAdapterTemplate.emit({ data: value, error: undefined }, filterFn);
  }

  static emitError(errorOptions, filterFn) {
    const err = buildErrorObject(errorOptions || {});
    TestWireAdapterTemplate.emit({ data: undefined, error: err }, filterFn);
  }

  static error(body, status, statusText) {
    const err = buildErrorObject({ body, status, statusText });
    TestWireAdapterTemplate.emit({ data: undefined, error: err });
  }

  constructor(dataCallback) {
    super(dataCallback);
    this.emit({ data: undefined, error: undefined });
  }
}

function buildLdsTestWireAdapter() {
  const _a = class LdsTestWireAdapter extends LdsTestWireAdapterTemplate {};
  _a._lastConfig = null;
  _a._wireInstances = new Set();
  return _a;
}

const knownAdapterMocks = new WeakSet();

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

export function createApexTestWireAdapter(fn) {
  return createWireAdapterMock(buildApexTestWireAdapter(), fn);
}

export function createLdsTestWireAdapter(fn) {
  return createWireAdapterMock(buildLdsTestWireAdapter(), fn);
}

export function createTestWireAdapter(fn) {
  return createWireAdapterMock(buildTestWireAdapter(), fn);
}
