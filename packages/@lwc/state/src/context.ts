import type { SignalBaseClass } from '@lwc/signals';
import type { LightningElement } from 'lwc';
import { ContextRequestEvent } from './event.js';

// ToDo: Use a symbol or some unique value instead of a string
const contextKey = 'context';

export class ContextProvider<T, StateSignal extends SignalBaseClass<T>> {
  static readonly CONTEXT_KEY = contextKey;
  private readonly hostElement: WeakRef<LightningElement | HTMLElement>;
  private readonly callbacks = new WeakSet<(value: unknown) => void>();
  private readonly contextValue: StateSignal;

  constructor(hostElement: LightningElement | HTMLElement, contextValue: StateSignal) {
    this.hostElement = new WeakRef(hostElement);
    this.contextValue = contextValue;
    this.hostElement
      .deref()
      .addEventListener(ContextRequestEvent.EVENT_NAME, this.contextEventListener);
  }

  private contextEventListener = (event: ContextRequestEvent) => {
    const { key, callback } = event;
    // Only provide the context if it's the first time the callback is being called
    if (key === ContextProvider.CONTEXT_KEY && !this.callbacks.has(callback)) {
      event.stopPropagation();
      this.callbacks.add(callback);
      callback(this.contextValue);
    }
  };
}

export class ContextConsumer<T, StateSignal extends SignalBaseClass<T>> {
  static readonly CONTEXT_KEY = contextKey;
  private readonly hostElement: WeakRef<LightningElement | HTMLElement>;
  public contextInjected = false;
  public contextValue: StateSignal;

  constructor(hostElement: LightningElement | HTMLElement) {
    this.hostElement = new WeakRef(hostElement);
    this.hostElement.deref().dispatchEvent(this.contextEventDispatcher());
  }

  private callback(value: StateSignal) {
    this.contextInjected = true;
    this.contextValue = value;
  }

  private contextEventDispatcher() {
    return new ContextRequestEvent({
      key: ContextConsumer.CONTEXT_KEY,
      callback: this.callback.bind(this),
    });
  }
}
