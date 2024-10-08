import type { Signal } from '@lwc/signals';

export interface RuntimeAdapter<T extends object> {
  isServerSide: boolean;
  element: WeakRef<T>;
  context: Signal<unknown> | undefined;
  createWeakRef<T extends object>(value: T): WeakRef<T>;
  provideContext(value: Signal<unknown>): void;
  consumeContext(): void;
}

export class RuntimeAdapterManager<T extends object> {
  private adapter: RuntimeAdapter<T> | undefined;

  public setAdapter(adapter: RuntimeAdapter<T>): void {
    this.adapter = adapter;
  }

  public getAdapter(): RuntimeAdapter<T> | undefined {
    if (!this.adapter) {
      throw new Error('Runtime adapter not set. Call setAdapter before using the library.');
    }
    return this.adapter;
  }
}
