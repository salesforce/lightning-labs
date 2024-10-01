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

class ContextProvider<T, StateSignal extends SignalBaseClass<T>> {
  static readonly CONTEXT_KEY = 'context';
  private readonly hostElement: WeakRef<LightningElement | HTMLElement>;
  private readonly callbacks = new WeakSet<(value: unknown) => void>();
  private readonly contextValue: StateSignal;

  constructor(hostElement: LightningElement | HTMLElement, contextValue: any) {
    this.hostElement = new WeakRef(hostElement);
    this.contextValue = contextValue;
    this.hostElement.deref().addEventListener(ContextRequestEvent.EVENT_NAME, this.contextEventListener);
  }

  private contextEventListener = (event: ContextRequestEvent) => {
    const { key, callback } = event;
    // Only provide the context if it's the first time the callback is being called
    if (key === ContextProvider.CONTEXT_KEY && !this.callbacks.has(callback)) {
      event.stopPropagation();
      this.callbacks.add(callback);
      callback(this.contextValue);
    }
  }
}

class ContextConsumer<T, StateSignal extends SignalBaseClass<T>> {
  static readonly CONTEXT_KEY = 'context';
  private readonly hostElement: WeakRef<LightningElement | HTMLElement>;
  public contextInjected: boolean = false;
  public contextValue: StateSignal;

  constructor(hostElement: LightningElement | HTMLElement) {
    this.hostElement = new WeakRef(hostElement);
    this.hostElement.deref().dispatchEvent(this.contextEventDispatcher())
  }

  private callback(value: StateSignal) {
    this.contextInjected = true;
    this.contextValue = value;
  }

  private contextEventDispatcher() {
    return new ContextRequestEvent({
      key: ContextConsumer.CONTEXT_KEY,
      callback: this.callback.bind(this)
    });
  }
}

export const defineState: DefineState = (defineStateCallback) => {
  return (...args) => {
    class StateManagerSignal<OuterStateShape> extends SignalBaseClass<OuterStateShape> {
      private internalStateShape: Record<string, Signal<unknown> | ExposedUpdater>;
      private _value: OuterStateShape;
      private isStale = true;
      private isNotifyScheduled = false;
      private contextProvider: ContextProvider<OuterStateShape, StateManagerSignal<OuterStateShape>>;
      private contextConsumer: ContextConsumer<OuterStateShape, StateManagerSignal<OuterStateShape>>;

      constructor(hostElement?: LightningElement | HTMLElement) {
        super();
        // Ordering is important here. We need to create the context consumer before
        // we call any client side code that may need to consume the context.
        if (hostElement) {
          this.contextConsumer = new ContextConsumer(hostElement);
        }

        const fromContext: any = (_stateDef) => {
          return this.contextConsumer?.contextValue || undefined;
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
        if (hostElement) {
          this.contextProvider = new ContextProvider(hostElement, this);
        }
      }

      private computeValue() {
        const computedValue = Object.fromEntries(
          Object.entries(this.internalStateShape)
            .filter(([, signalOrUpdater]) => signalOrUpdater)
            .map(([key, signalOrUpdater]) => {
              // ToDo: need a better way to identify context
              if (isUpdater(signalOrUpdater) || key === ContextConsumer.CONTEXT_KEY) {
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
    // is duck-typing the only way since Locker provides it's own implementation of `LightningElement`
    if (args[0] && typeof args[0] === 'object' && 'template' in args[0] && 'render' in args[0]) {
      return new StateManagerSignal(args[0] as unknown as LightningElement);
    }
    return new StateManagerSignal();
  };
};
