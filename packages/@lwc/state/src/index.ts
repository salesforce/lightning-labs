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
import type { LightningElement } from 'lwc';

const atomSetter = Symbol('atomSetter');

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

class ContextRequestEvent extends CustomEvent<{
  key: string;
  callback: (value: unknown) => void;
}> {
  static readonly EVENT_NAME = 'context-request';
  readonly key: string;
  readonly callback: (value: unknown) => void;

  constructor(detail: { key: unknown; callback: (value: unknown) => void }) {
    super(ContextRequestEvent.EVENT_NAME, { bubbles: true, composed: true });
    // using strings for now until we have a better type for the context key
    this.key = detail.key as string;
    this.callback = detail.callback;
  }
}

export const defineState: DefineState = (defineStateCallback) => {
  return (...args) => {
    class StateManagerSignal<OuterStateShape> extends SignalBaseClass<OuterStateShape> {
      private internalStateShape: Record<string, Signal<unknown> | ExposedUpdater>;
      private _value: OuterStateShape;
      private isStale = true;
      private isNotifyScheduled = false;
      private _element: WeakRef<LightningElement | HTMLElement>;

      constructor(hostElement?: LightningElement | HTMLElement) {
        super();
        this._element = hostElement ? new WeakRef(hostElement) : undefined;

        const fromContext: any = (stateDef) => {
          const context = this.injectContext(stateDef);
          // Return the context signal
          return context;
        };

        this.internalStateShape = defineStateCallback(atom, computed, update, fromContext)(...args);

        for (const signalOrUpdater of Object.values(this.internalStateShape)) {
          if (signalOrUpdater && !isUpdater(signalOrUpdater)) {
            // Subscribe to changes to exposed state atoms and computeds, so that the entire
            // state manager signal "reacts" when the atoms/computeds change.
            (signalOrUpdater as Signal<unknown>).subscribe(this.scheduledNotify.bind(this));
          }
        }

        // ToDo: need to provide proper key
        this.provideContext('context');
      }

      private provideContext(key: unknown) {
        const element = this._element?.deref();
        if (!element || !element.addEventListener) {
          return;
        }
        // we are attached to an element and can provide a context value
        element.addEventListener(ContextRequestEvent.EVENT_NAME, (event: ContextRequestEvent) => {
          // event.target !== element.getHostElement() \\ element.hostElement
          if (event.key === key) {
            // ToDo: We need to return a "shareable" signal here
            // meaning only share atoms, computeds and not updaters
            event.stopPropagation();
            event.callback(this);
          }
        });
      }

      private injectContext(key: unknown): AtomSignal<unknown> | undefined {
        let contextInjected = false;
        const element = this._element?.deref();
        if (!element || !element.dispatchEvent) {
          return undefined;
        }
        // we are attached to and element, so we can dispatch a custom event
        // to the parent element to fetch the context value
        // Create an Atom signal to hold the context value
        // so that the value is immutable by the user
        const contextValue = new AtomSignal<unknown>(undefined);

        const contextRequestEvent = new ContextRequestEvent({
          key,
          callback: (value: unknown) => {
            // the value is a signal, so we need to subscribe to it
            contextInjected = true;
            contextValue[atomSetter](value);
          },
        });

        // ToDo: We can dispatch an event but there might not be any takers
        // so we need to handle that case as well
        element.dispatchEvent(contextRequestEvent);

        return contextInjected ? contextValue : undefined;
      }

      private computeValue() {
        const computedValue = Object.fromEntries(
          Object.entries(this.internalStateShape)
            .filter(([, signalOrUpdater]) => signalOrUpdater)
            .map(([key, signalOrUpdater]) => {
              if (isUpdater(signalOrUpdater)) {
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

      // TODO: W-16769884 instances of this class must take the shape of `ContextProvider` and
      //       `ContextConsumer` in the same way that it takes the shape/implements `Signal`
    }
    // Check if the first argument is likely a LightningElement
    if (args[0] && typeof args[0] === 'object' && 'template' in args[0] && 'render' in args[0]) {
      return new StateManagerSignal(args[0] as unknown as LightningElement);
    }
    return new StateManagerSignal();
  };
};
