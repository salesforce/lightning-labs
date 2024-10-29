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
import type { ContextRuntimeAdapter } from './runtime-interface.js';

const atomSetter = Symbol('atomSetter');
export const contextID = Symbol('contextID');

export const connectContext = Symbol('connectContext');

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

const proxyToAtom = new WeakMap();

const atom: MakeAtom = <T,>(initialValue: T) => {
  const atomSignal = new AtomSignal<T>(initialValue);

  // returning a proxied Atom siganls allows access to value setter
  // from within the state manager factory
  // but, prevents direct mutations from shared atom signals like ContextAtomSignal
  const proxySignal = new Proxy(atomSignal, {
    set(target, prop, newValue) {
      if (prop === 'value') {
        target[atomSetter](newValue);
        return true;
      }
      return Reflect.set(target, prop, newValue);
    },
  });

  proxyToAtom.set(proxySignal, atomSignal);
  return proxySignal;
};

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

function unwrapProxy<T>(proxy: AtomSignal<T>): AtomSignal<T> | undefined {
  return proxyToAtom.has(proxy) ? proxyToAtom.get(proxy) : undefined;
}

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
                const _unsubscribe = providedContextSignal.subscribe(() => {
                  localContextSignal[atomSetter](providedContextSignal.value);
                });
              },
            );
          });

          // TODO: if this.runtimeAdapter is null but is not-null in the future, we'll need to connect
          //       to context in the same way we have done above.

          return localContextSignal;
        };

        const state = defineStateCallback(atom, computed, update, fromContext)(...args);

        this.internalStateShape = Object.fromEntries(
          Object.entries(state).map(([key, maybeProxy]) => {
            const maybeAtom = unwrapProxy(maybeProxy as AtomSignal<unknown>);

            // only atomSignals would be wrapped in proxies
            // computeds and updaters are not proxified
            if (maybeAtom) {
              return [key, maybeAtom];
            }
            return [key, maybeProxy];
          }),
        );

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
