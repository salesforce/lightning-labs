import { type Signal, SignalBaseClass } from '@lwc/signals';
import type { ContextRuntimeAdapter } from './runtime-interface.js';
import { connectContext, disconnectContext } from './shared.js';
import type {
  Computer,
  DefineState,
  ExposedUpdater,
  MakeAtom,
  MakeComputed,
  MakeContextHook,
  MakeUpdate,
  UnwrapSignal,
} from './types.ts';
export { setTrustedSignalSet } from '@lwc/signals';

const atomSetter = Symbol('atomSetter');
const contextID = Symbol('contextID');

export { ContextfulLightningElement } from './contextful-lwc.js';

// New interface for context-related methods
export interface ContextManager {
  [connectContext](contextAdapter: ContextRuntimeAdapter<object>): void;
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

export const defineState: DefineState = <
  InnerStateShape extends Record<string, Signal<unknown> | ExposedUpdater>,
  OuterStateShape extends {
    readonly [SignalName in keyof InnerStateShape]: UnwrapSignal<InnerStateShape[SignalName]>;
  },
  Args extends unknown[],
  ContextShape,
>(
  defineStateCallback: (
    atom: MakeAtom,
    computed: MakeComputed,
    update: MakeUpdate,
    fromContext: MakeContextHook<ContextShape>,
  ) => (...args: Args) => InnerStateShape,
) => {
  const stateDefinition = (...args: Args) => {
    class StateManagerSignal extends SignalBaseClass<OuterStateShape> implements ContextManager {
      private internalStateShape: Record<string, Signal<unknown> | ExposedUpdater>;
      private _value: OuterStateShape;
      private isStale = true;
      private isNotifyScheduled = false;
      // biome-ignore lint/suspicious/noExplicitAny: we actually do want this, thanks
      private contextSignals = new Map<any, Signal<unknown>>();
      private contextConsumptionQueue: Array<
        (runtimeAdapter: ContextRuntimeAdapter<object>) => void
      > = [];
      private contextUnsubscribes = new Map<symbol, Array<() => void>>();

      constructor() {
        super();

        // biome-ignore lint: fix it
        const fromContext: MakeContextHook<any> = <T,>(contextVarietyUniqueId: any) => {
          if (this.contextSignals.has(contextVarietyUniqueId)) {
            return this.contextSignals.get(contextVarietyUniqueId);
          }

          // When context is not connected, we still provide a signal but the value of that
          // signal is undefined.
          const localContextSignal = new ContextAtomSignal(undefined);
          this.contextSignals.set(contextVarietyUniqueId, localContextSignal);

          // We need to defer the consumption of context to the time when the state manager
          // instance is actually connected to a component tree or some other context-providing
          // tree.
          this.contextConsumptionQueue.push((runtimeAdapter: ContextRuntimeAdapter<object>) => {
            if (!runtimeAdapter) {
              throw new Error(
                'Implementation error: runtimeAdapter must be present at the time of connect.',
              );
            }

            runtimeAdapter.consumeContext(
              contextVarietyUniqueId,
              (providedContextSignal: Signal<T>) => {
                // Make sure the local signal initially shares the same value as the provided context signal.
                localContextSignal[atomSetter](providedContextSignal.value);
                // TODO: capture this unsubscribe in a map somewhere so that when the state manager disconnects
                //       from the DOM, we can disconnect the context as well.
                const unsub = providedContextSignal.subscribe(() => {
                  localContextSignal[atomSetter](providedContextSignal.value);
                });
                const unsubArray = this.contextUnsubscribes.get(runtimeAdapter.component) ?? [];
                unsubArray.push(unsub);
                this.contextUnsubscribes.set(runtimeAdapter.component, unsubArray);
              },
            );
          });

          // TODO: if this.runtimeAdapter is null but is not-null in the future, we'll need to connect
          //       to context in the same way we have done above.

          return localContextSignal;
        };

        this.internalStateShape = defineStateCallback(atom, computed, update, fromContext)(...args);

        for (const signalOrUpdater of Object.values(this.internalStateShape)) {
          if (signalOrUpdater && !isUpdater(signalOrUpdater)) {
            (signalOrUpdater as Signal<unknown>).subscribe(this.scheduledNotify.bind(this));
          }
        }
      }

      [connectContext](runtimeAdapter: ContextRuntimeAdapter<object>) {
        // A state manager always offers to provide state of its own variety.
        // TODO: we will want it to be possible for state manager updaters to only be
        //       accessible when that state manager is consumed directly, and not when
        //       it is consumed via context. We don't currently have a mechanism to
        //       disambuguate those two kinds of updaters; we can either expose them
        //       to context-consumers (as it done in the line below) or we can restrict
        //       them entirely (via shareableContext). We'll want something in between.
        runtimeAdapter.provideContext(stateDefinition, this);

        // Attempt to connect to context up in the tree. The callback is invoked if a provider is found
        // in a parent/ancestor that provides the specific context variety that was requested.
        for (const connectContext of this.contextConsumptionQueue) {
          connectContext(runtimeAdapter);
        }

        // Q: What happens when a single state manager instance is connected in multiple places
        // and could conceivably get access to a context-variety via multiple of those "mount"
        // points?
        // TODO: just pick a behavior, get it working in the example, make the decision once
        // we have something concrete to work with, write a test, and then work backwards
      }

      [disconnectContext](componentId: ContextRuntimeAdapter<object>['component']) {
        const unsubArray = this.contextUnsubscribes.get(componentId);

        if (!unsubArray || unsubArray.length === 0) {
          return;
        }

        for (const unsub of unsubArray) {
          unsub();
        }
      }

      private shareableContext(): ContextAtomSignal<unknown> {
        const contextAtom = new ContextAtomSignal<unknown>(undefined);

        const updateContextAtom = () => {
          const valueWithUpdaters = this.value;
          const filteredValue = Object.fromEntries(
            Object.entries(valueWithUpdaters).filter(
              ([, valueOrUpdater]) => !isUpdater(valueOrUpdater),
            ),
          );
          contextAtom[atomSetter](Object.freeze(filteredValue));
        };

        // Initial update
        updateContextAtom();

        // Subscribe to changes
        this.subscribe(updateContextAtom);

        return contextAtom;
      }

      private computeValue() {
        const computedValue = Object.fromEntries(
          Object.entries(this.internalStateShape)
            .filter(([, signalOrUpdater]) => signalOrUpdater)
            .map(([key, signalOrUpdater]) => {
              if (
                isUpdater(signalOrUpdater) ||
                (signalOrUpdater as ContextAtomSignal<unknown>)._id === contextID
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
    }
    return new StateManagerSignal();
  };

  return stateDefinition;
};
