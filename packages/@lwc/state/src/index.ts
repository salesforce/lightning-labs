import { Signal, SignalBaseClass } from '@lwc/signals';
import type {
  UnwrapSignal,
  MakeAtom,
  MakeComputed,
  MakeUpdate,
  MakeContextHook,
  ExposedUpdater,
  DefineState,
} from './types.ts';

const atomSetter = Symbol('atomSetter');;

class AtomSignal<T> extends SignalBaseClass<T> {
  _value: T;

  constructor(value: T) {
    super();
    this._value = value;
  }

  [atomSetter](value: T) {
    this._value = value;
  }

  get value() {
    return this._value;
  }
}

class ComputedSignal<T> extends SignalBaseClass<T> {
  private computer: (signalValues: Record<string, unknown>) => T;
  dependencies: Record<string, Signal<unknown>>;

  constructor(inputSignalsObj: Record<string, Signal<unknown>>, computer: any) {
    super();
    this.computer = computer;
    this.dependencies = inputSignalsObj;

    const onUpdate = () => this.notify();
    for (const signal of Object.values(inputSignalsObj)) {
      signal.subscribe(onUpdate);
    }
  }

  get value() {
    const dependencyValues = Object.fromEntries(Object.entries(this.dependencies).map(([key, signal]) => [key, signal.value]));
    return this.computer(dependencyValues);
  }
}

export const defineState: DefineState = (defineStateCallback) => {
  return (...args) => {
    class StateManagerSignal<OuterStateShape> extends SignalBaseClass<OuterStateShape> {
      constructor() {
        super();

        const atom: MakeAtom = <T>(initialValue: T) => new AtomSignal<T>(initialValue);
        const computed: MakeComputed = (inputSignalsObj, computer) => new ComputedSignal(inputSignalsObj, computer);

        const update: MakeUpdate = () => {};
        const fromContext: MakeContextHook = () => {};

        const foo = defineStateCallback(atom, computed, update, fromContext)(...args);
      }

      get value() {
        // todo
        return 'foo';
      }
    }


    return new StateManagerSignal();
  };
};
