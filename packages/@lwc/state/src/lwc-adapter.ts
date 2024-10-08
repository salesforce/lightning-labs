import type { Signal } from '@lwc/signals';
import type { LightningElement } from 'lwc';
import type { RuntimeAdapter, RuntimeElement } from './runtime-interface.js';
import { symbolContextKey, ContextRequestEvent } from './event.js';

type LWCRuntimeElement = LightningElement & RuntimeElement;

export class LWCAdapter implements RuntimeAdapter {
  isServerSide = false;
  element: WeakRef<LWCRuntimeElement>;
  contextSignal: Signal<unknown> | undefined;
  isConsumingContext = false;

  constructor(element: unknown) {
    if (!this.isValidHostElement(element)) {
      throw new Error('Invalid host element');
    }
    this.element = this.createWeakRef(element);
  }

  private isValidHostElement(element: unknown): element is LWCRuntimeElement {
    return (
      element !== null &&
      typeof element === 'object' &&
      'template' in element &&
      'render' in element
    );
  }

  createWeakRef<T extends object>(value: T): WeakRef<T> {
    return new WeakRef(value);
  }

  provideContext(value: Signal<unknown>): void {
    this.element.deref()?.addEventListener('context-request', (event: CustomEvent) => {
      if (event.detail.key === symbolContextKey) {
        event.stopPropagation();
        event.detail.callback(value);
      }
    });
  }

  consumeContext() {
    // Already consuming context
    // avoiding multiple context-request events
    if (this.isConsumingContext) {
      return;
    }
    this.isConsumingContext = true;
    const event = new ContextRequestEvent({
      key: symbolContextKey,
      callback: this.contextCallback.bind(this),
    });

    this.element.deref()?.dispatchEvent(event);
    this.isConsumingContext = true;
  }

  private contextCallback(value: Signal<unknown>): void {
    this.contextSignal = value;
  }

  get context(): Signal<unknown> | undefined {
    return this.contextSignal;
  }
}
