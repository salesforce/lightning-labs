// node_modules/@lwc/signals/dist/index.js
var SignalBaseClass = class {
  constructor() {
    this.subscribers = /* @__PURE__ */ new Set();
  }
  subscribe(onUpdate) {
    this.subscribers.add(onUpdate);
    return () => {
      this.subscribers.delete(onUpdate);
    };
  }
  notify() {
    for (const subscriber of this.subscribers) {
      subscriber();
    }
  }
};

// src/index.ts
var atomSetter = Symbol("atomSetter");
var AtomSignal = class extends SignalBaseClass {
  constructor(value) {
    super();
    this._value = value;
  }
  [atomSetter](value) {
    this._value = value;
    this.notify();
  }
  get value() {
    return this._value;
  }
};
var ComputedSignal = class extends SignalBaseClass {
  constructor(inputSignalsObj, computer) {
    super();
    this.isStale = true;
    this.computer = computer;
    this.dependencies = inputSignalsObj;
    const onUpdate = () => {
      this.isStale = true;
      this.notify();
    };
    for (const signal of Object.values(inputSignalsObj)) {
      signal.subscribe(onUpdate);
    }
  }
  computeValue() {
    const dependencyValues = {};
    for (const [signalName, signal] of Object.entries(this.dependencies)) {
      dependencyValues[signalName] = signal.value;
    }
    this.isStale = false;
    this._value = this.computer(dependencyValues);
  }
  notify() {
    this.isStale = true;
    super.notify();
  }
  get value() {
    if (this.isStale) {
      this.computeValue();
    }
    return this._value;
  }
};
var isUpdater = (signalOrUpdater) => typeof signalOrUpdater === "function";
var atom = (initialValue) => new AtomSignal(initialValue);
var computed = (inputSignalsObj, computer) => new ComputedSignal(inputSignalsObj, computer);
var update = (signalsToUpdate, userProvidedUpdaterFn) => {
  return (...uniqueArgs) => {
    const signalValues = {};
    for (const [signalName, signal] of Object.entries(signalsToUpdate)) {
      signalValues[signalName] = signal.value;
    }
    const newValues = userProvidedUpdaterFn(signalValues, ...uniqueArgs);
    for (const [atomName, newValue] of Object.entries(newValues)) {
      signalsToUpdate[atomName][atomSetter](newValue);
    }
  };
};
var defineState = (defineStateCallback) => {
  return (...args) => {
    class StateManagerSignal extends SignalBaseClass {
      constructor() {
        super();
        this.isStale = true;
        const fromContext = () => {
        };
        this.internalStateShape = defineStateCallback(atom, computed, update, fromContext)(...args);
        for (const signalOrUpdater of Object.values(this.internalStateShape)) {
          if (!isUpdater(signalOrUpdater)) {
            signalOrUpdater.subscribe(this.scheduledNotify.bind(this));
          }
        }
      }
      computeValue() {
        const computedValue = Object.fromEntries(
          Object.entries(this.internalStateShape).map(([key, signalOrUpdater]) => {
            if (isUpdater(signalOrUpdater)) {
              return [key, signalOrUpdater];
            }
            return [key, signalOrUpdater.value];
          })
        );
        this._value = Object.freeze(computedValue);
        this.isStale = false;
      }
      scheduledNotify() {
        this.isStale = true;
        super.notify();
      }
      get value() {
        if (this.isStale) {
          this.computeValue();
        }
        return this._value;
      }
      // TODO: instances of this class must take the shape of `ContextProvider` and `ContextConsumer` in
      //       the same way that it takes the shape/implements `Signal`
    }
    return new StateManagerSignal();
  };
};
export {
  defineState
};
//# sourceMappingURL=out.js.map
