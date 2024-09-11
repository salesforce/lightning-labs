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

const isUpdater = (signalOrUpdater: Signal<any> | ExposedUpdater) => typeof signalOrUpdater === 'function';

export const defineState: DefineState = (defineStateCallback) => {
  return (...args) => {
    class StateManagerSignal<OuterStateShape> extends SignalBaseClass<OuterStateShape> {
      internalStateShape: Record<string, Signal<any> | ExposedUpdater>;

      constructor() {
        super();

        const atom: MakeAtom = <T>(initialValue: T) => new AtomSignal<T>(initialValue);

        const computed: MakeComputed = (inputSignalsObj, computer) => new ComputedSignal(inputSignalsObj, computer);

        const update: MakeUpdate<AtomSignal<unknown>> = <
          AdditionalArguments extends unknown[],
          Updater extends (signalValues: ValuesObj, ...args: AdditionalArguments) => ValuesObj,
          SignalsObj extends Record<string, AtomSignal<unknown>>,
          ValuesObj extends { [signalName in keyof SignalsObj]?: UnwrapSignal<SignalsObj[keyof SignalsObj]> }
        >(signalsToUpdate: SignalsObj, updater: Updater) => {
          return (...uniqueArgs: AdditionalArguments) => {
            const signalValues = Object.fromEntries(Object.entries(signalsToUpdate).map(([key, signal]) => [key, signal.value])) as ValuesObj;
            const newValues = updater(signalValues, ...uniqueArgs);
            for (const [atomName, newValue] of Object.entries(newValues)) {
              signalsToUpdate[atomName][atomSetter](newValue);
            }
          };
        };

        // @ts-ignore: TODO
        const fromContext: MakeContextHook = () => {};

        this.internalStateShape = defineStateCallback(atom, computed, update, fromContext)(...args);

        for (const signalOrUpdater of Object.values(this.internalStateShape)) {
          if (!isUpdater(signalOrUpdater)) {
            // Subscribe to changes to exposed state atoms, so that the entire state manager signal
            // "reacts" when the atoms change.
            (signalOrUpdater as Signal<unknown>).subscribe(this.notify.bind(this));
          }
        }
      }

      get value() {
        return Object.freeze(Object.fromEntries(
          Object.entries(this.internalStateShape)
            .map(([key, signalOrUpdater]) => {
              if (isUpdater(signalOrUpdater)) {
                return [key, signalOrUpdater];
              } else {
                return [key, signalOrUpdater.value];
              }
            })
        )) as OuterStateShape;
      }

      // TODO: instances of this class must take the shape of `ContextProvider` and `ContextConsumer` in
      //       the same way that it takes the shape/implements `Signal`
    }


    return new StateManagerSignal();
  };
};
