import { type Signal, SignalBaseClass } from '@lwc/signals';
import type {
  ContextSignal,
  Computer,
  UnwrapSignal,
  MakeAtom,
  MakeComputed,
  MakeUpdate,
  MakeContextHook,
  ExposedUpdater,
  DefineState,
} from './types.ts';
import { type RuntimeAdapter, RuntimeAdapterManager } from './runtime-interface.js';
import { LWCAdapter } from './lwc-adapter.js';

const atomSetter = Symbol('atomSetter');
export const contextID = Symbol('contextID');

export const connectContext = Symbol('connectContext');

// New interface for context-related methods
export interface ContextManager {
  [connectContext](hostElement: unknown): void;
  provide(): void;
  inject(): Signal<unknown> | undefined;
}

class AtomSignal<T> extends SignalBaseClass<T> {
  private _value: T;

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

class ContextAtomSignal<T> extends AtomSignal<T> {
  public _id = contextID;
}

class ComputedSignal<T> extends SignalBaseClass<T> {
  private computer: Computer<unknown>;
  private dependencies: Record<string, Signal<unknown>>;
  private _value: T;
  private isStale = true;

  constructor(inputSignalsObj: Record<string, Signal<unknown>>, computer: Computer<unknown>) {
    super();
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

  private computeValue() {
    const dependencyValues: Record<string, unknown> = {};
    for (const [signalName, signal] of Object.entries(this.dependencies)) {
      dependencyValues[signalName] = signal.value;
    }
    this.isStale = false;
    this._value = this.computer(dependencyValues) as T;
  }

  protected override notify(): void {
    this.isStale = true;
    super.notify();
  }

  get value() {
    if (this.isStale) {
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
  userProvidedUpdaterFn: Updater,
) => {
  return (...uniqueArgs: AdditionalArguments) => {
    const signalValues = {} as ValuesObj;

    for (const [signalName, signal] of Object.entries(signalsToUpdate)) {
      signalValues[signalName as keyof ValuesObj] = signal.value as ValuesObj[keyof ValuesObj];
    }

    const newValues = userProvidedUpdaterFn(signalValues, ...uniqueArgs);

    for (const [atomName, newValue] of Object.entries(newValues)) {
      signalsToUpdate[atomName][atomSetter](newValue);
    }
  };
};

export const defineState: DefineState = (defineStateCallback) => {
  return (...args) => {
    class StateManagerSignal<OuterStateShape>
      extends SignalBaseClass<OuterStateShape>
      implements ContextManager
    {
      private internalStateShape: Record<string, Signal<unknown> | ExposedUpdater>;
      private _value: OuterStateShape;
      private isStale = true;
      private isNotifyScheduled = false;
      private contextCallbacks = new Set<(context: unknown) => void>();
      private runtimeAdapterManager = new RuntimeAdapterManager();

      constructor() {
        super();

        // biome-ignore lint: fix it
        const fromContext: MakeContextHook<any> = <T,>(_otherStateManagerSignal: any) => {
          const contextAtomSignal = new ContextAtomSignal<Signal<T | undefined> | undefined>(
            undefined,
          );
          this.contextCallbacks.add((context: Signal<T | undefined> | undefined) => {
            contextAtomSignal[atomSetter](context);
          });
          return contextAtomSignal;
        };

        this.internalStateShape = defineStateCallback(atom, computed, update, fromContext)(...args);

        for (const signalOrUpdater of Object.values(this.internalStateShape)) {
          if (signalOrUpdater && !isUpdater(signalOrUpdater)) {
            (signalOrUpdater as Signal<unknown>).subscribe(this.scheduledNotify.bind(this));
          }
        }
      }

      [connectContext](hostElement: unknown) {
        const newAdapter = new LWCAdapter(hostElement);
        this.runtimeAdapter = newAdapter;

        const adapter = this.runtimeAdapterManager.getAdapter();

        if (this.contextCallbacks.size > 0) {
          adapter.consumeContext();
        }

        for (const callback of this.contextCallbacks) {
          callback(adapter.context);
        }
      }

      private shareableContext(): ContextSignal<unknown> {
        const stateManagerSignalInstance = this;

        return {
          get value() {
            const valueWithUpdaters = stateManagerSignalInstance.value;

            return Object.freeze(
              Object.fromEntries(
                Object.entries(valueWithUpdaters)
                  .map(([key, valueOrUpdater]) => {
                    if (!isUpdater(valueOrUpdater)) {
                      return [key, valueOrUpdater];
                    }
                  })
                  .filter((entry): entry is [string, unknown] => entry !== undefined),
              ),
            );
          },
          subscribe: stateManagerSignalInstance.subscribe.bind(stateManagerSignalInstance),
          id: contextID,
        };
      }

      public provide() {
        const adapter = this.runtimeAdapterManager.getAdapter();

        if (!adapter) {
          throw new Error(
            `Connect to a host element by calling 'connect(elem)' before providing context.`,
          );
        }

        adapter.provideContext(this.shareableContext());
      }

      public inject(): Signal<unknown> | undefined {
        const adapter = this.runtimeAdapterManager.getAdapter();

        if (!adapter) {
          throw new Error(
            `Connect to a host element by calling 'connect(elem)' before injecting context.`,
          );
        }

        adapter.consumeContext();
        return adapter.context;
      }

      private computeValue() {
        const computedValue = Object.fromEntries(
          Object.entries(this.internalStateShape)
            .filter(([, signalOrUpdater]) => signalOrUpdater)
            .map(([key, signalOrUpdater]) => {
              if (
                isUpdater(signalOrUpdater) ||
                (signalOrUpdater as ContextSignal<unknown>).id === contextID
              ) {
                return [key, signalOrUpdater];
              }
              return [key, signalOrUpdater.value];
            }),
        );

        this._value = Object.freeze(computedValue) as OuterStateShape;
        this.isStale = false;
      }

      private scheduledNotify() {
        this.isStale = true;

        if (!this.isNotifyScheduled) {
          queueMicrotask(() => {
            this.isNotifyScheduled = false;
            super.notify();
          });

          this.isNotifyScheduled = true;
        }
      }

      get value() {
        if (this.isStale) {
          this.computeValue();
        }
        return this._value;
      }

      set runtimeAdapter(adapter: RuntimeAdapter<object>) {
        this.runtimeAdapterManager.setAdapter(adapter);
      }
    }
    return new StateManagerSignal();
  };
};
