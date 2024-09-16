import { type Signal, SignalBaseClass } from '@lwc/signals';
import type {
  Computer,
  UnwrapSignal,
  MakeAtom,
  MakeComputed,
  MakeUpdate,
  MakeContextHook,
  ExposedUpdater,
  DefineState,
} from './types.ts';

const atomSetter = Symbol('atomSetter');

class AtomSignal<T> extends SignalBaseClass<T> {
  _value: T;

  constructor(value: T) {
    super();
    this._value = value;
  }

  [atomSetter](value: T) {
    this._value = value;
    this.notify();
  }

  get value() {
    return this._value;
  }
}

class ComputedSignal<T> extends SignalBaseClass<T> {
  private computer: Computer<unknown>;
  private dependencies: Record<string, Signal<unknown>>;
  private _value: T;

  constructor(inputSignalsObj: Record<string, Signal<unknown>>, computer: Computer<unknown>) {
    super();
    this.computer = computer;
    this.dependencies = inputSignalsObj;

    const onUpdate = () => this.notify();
    for (const signal of Object.values(inputSignalsObj)) {
      signal.subscribe(onUpdate);
    }
  }

  private computeValue() {
    const dependencyValues: Record<string, unknown> = {};
    for (const [signalName, signal] of Object.entries(this.dependencies)) {
      dependencyValues[signalName] = signal.value;
    }
    this._value = this.computer(dependencyValues) as T;
  }

  protected override notify(): void {
    this.computeValue();
    super.notify();
  }

  get value() {
    if (!this._value) {
      this.computeValue();
    }
    return this._value;
  }
}

const isUpdater = (signalOrUpdater: Signal<unknown> | ExposedUpdater) =>
  typeof signalOrUpdater === 'function';

const atom: MakeAtom = <T,>(initialValue: T) => new AtomSignal<T>(initialValue);

const computed: MakeComputed = (inputSignalsObj, computer) =>
  new ComputedSignal(inputSignalsObj, computer);

const update: MakeUpdate = <
  SignalSubType extends Signal<unknown>,
  AdditionalArguments extends unknown[],
  Updater extends (signalValues: ValuesObj, ...args: AdditionalArguments) => ValuesObj,
  SignalsObj extends Record<string, SignalSubType>,
  ValuesObj extends {
    [SignalName in keyof SignalsObj]?: UnwrapSignal<SignalsObj[SignalName]>;
  },
>(
  signalsToUpdate: SignalsObj,
  updater: Updater,
) => {
  return (...uniqueArgs: AdditionalArguments) => {
    const signalValues = {} as ValuesObj;

    for (const [signalName, signal] of Object.entries(signalsToUpdate)) {
      signalValues[signalName as keyof ValuesObj] = signal.value as ValuesObj[keyof ValuesObj];
    }

    const newValues = updater(signalValues, ...uniqueArgs);

    for (const [atomName, newValue] of Object.entries(newValues)) {
      signalsToUpdate[atomName][atomSetter](newValue);
    }
  };
};

export const defineState: DefineState = (defineStateCallback) => {
  return (...args) => {
    class StateManagerSignal<OuterStateShape> extends SignalBaseClass<OuterStateShape> {
      private internalStateShape: Record<string, Signal<unknown> | ExposedUpdater>;
      private isNotifyScheduled = false;
      private _value: OuterStateShape;

      constructor() {
        super();

        // @ts-ignore: TODO
        const fromContext: MakeContextHook = () => {};

        this.internalStateShape = defineStateCallback(atom, computed, update, fromContext)(...args);

        for (const signalOrUpdater of Object.values(this.internalStateShape)) {
          if (!isUpdater(signalOrUpdater)) {
            // Subscribe to changes to exposed state atoms, so that the entire state manager signal
            // "reacts" when the atoms change.
            (signalOrUpdater as Signal<unknown>).subscribe(this.scheduledNotify.bind(this));
          }
        }
      }

      private computeValue() {
        const computedValue = Object.fromEntries(
          Object.entries(this.internalStateShape).map(([key, signalOrUpdater]) => {
            if (isUpdater(signalOrUpdater)) {
              return [key, signalOrUpdater];
            }
            return [key, signalOrUpdater.value];
          }),
        );

        this._value = Object.freeze(computedValue) as OuterStateShape;
      }

      private scheduledNotify() {
        if (!this.isNotifyScheduled) {
          this.isNotifyScheduled = true;
          queueMicrotask(() => {
            this.isNotifyScheduled = false;
            this.computeValue();
            this.notify();
          });
        }
      }

      get value() {
        if (!this._value) {
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
