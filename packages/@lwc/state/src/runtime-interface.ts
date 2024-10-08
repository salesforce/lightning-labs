import type { Signal } from '@lwc/signals';

export interface RuntimeElement {
  provideContext(key: symbol, value: unknown): void;
  consumeContext(key: symbol, callback: (value: unknown) => void): void;
}

export interface RuntimeAdapter {
  isServerSide: boolean;
  element: WeakRef<RuntimeElement>;
  context: Signal<unknown> | undefined;
  createWeakRef<T extends object>(value: T): WeakRef<T>;
  provideContext(value: Signal<unknown>): void;
  consumeContext(): void;
}

export class RuntimeAdapterManager {
  private adapter: RuntimeAdapter | undefined;

  public setAdapter(adapter: RuntimeAdapter): void {
    this.adapter = adapter;
  }

  public getAdapter(): RuntimeAdapter | undefined {
    if (!this.adapter) {
      throw new Error('Runtime adapter not set. Call setAdapter before using the library.');
    }
    return this.adapter;
  }
}
