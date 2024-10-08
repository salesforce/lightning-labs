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
import { type RuntimeAdapter, RuntimeElement, RuntimeAdapterManager } from './runtime-interface.js';
import { LWCAdapter } from './lwc-adapter.js';

const atomSetter = Symbol('atomSetter');
const contextID = Symbol('contextID');

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
    class StateManagerSignal<OuterStateShape> extends SignalBaseClass<OuterStateShape> {
      private internalStateShape: Record<string, Signal<unknown> | ExposedUpdater>;
      private _value: OuterStateShape;
      private isStale = true;
      private isNotifyScheduled = false;
      // private contextProvider: ContextProvider<unknown>;
      // private contextConsumer: ContextConsumer<unknown>;
      // private host: WeakRef<RuntimeElement>;
      // The only reason we use a Set is because WeakSet doesn't allow iteration
      private contextCallbacks = new Set<(context: unknown) => void>();
      private runtimeAdapterManager: RuntimeAdapterManager;

      constructor() {
        super();

        // ToDo: Look into changing this to a Signal so that we can avoid using
        // and the value can be reactive instead of the callback approach.
        // biome-ignore lint: allow for now
        const fromContext: any = (callback: (context: OuterStateShape) => void) => {
          this.contextCallbacks.add(callback);
        };

        this.internalStateShape = defineStateCallback(atom, computed, update, fromContext)(...args);

        for (const signalOrUpdater of Object.values(this.internalStateShape)) {
          if (signalOrUpdater && !isUpdater(signalOrUpdater)) {
            // Subscribe to changes to exposed state atoms and computeds, so that the entire
            // state manager signal "reacts" when the atoms/computeds change.
            (signalOrUpdater as Signal<unknown>).subscribe(this.scheduledNotify.bind(this));
          }
        }
      }

      public connect(hostElement: unknown) {
        // This bit should move to lwc engine
        const newAdapter = new LWCAdapter(hostElement);
        this.setRuntimeAdapter(newAdapter);
        // End of bit that should move to lwc engine

        const adapter = this.runtimeAdapterManager.getAdapter();

        // This is a slight enhancement to "delay"
        // connecting the consumer until it's actually needed
        // A context consumer might live in a:
        // Component OR in a State Manager.
        // State Managers consumers will be invoked as soon as the StateManager is connected
        // but for components, we'll wait until the component requests the context
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

      // If State Manager is connected to a host element
      // then it can start "providing" it's value as context to any nested components
      public provide() {
        const adapter = this.runtimeAdapterManager.getAdapter();

        if (!adapter) {
          throw new Error(
            `Connect to a host element by calling 'connect(elem)' before providing context.`,
          );
        }

        adapter.provideContext(this.shareableContext());
      }

      // If State Manager is connected to a host element
      // then it can start "injecting" the context available to it
      // Unlike 'fromContext', this can provide the context to the Components
      // and StateManagers likewise.
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

      // ToDo: Make LWC Engine set the adapter
      public setRuntimeAdapter(adapter: RuntimeAdapter) {
        this.runtimeAdapterManager = new RuntimeAdapterManager();
        this.runtimeAdapterManager.setAdapter(adapter);
      }

      // TODO: W-16769884 instances of this class must take the shape of `ContextProvider` and
      //       `ContextConsumer` in the same way that it takes the shape/implements `Signal`
    }
    return new StateManagerSignal();
  };
};
