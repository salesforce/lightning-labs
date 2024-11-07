import type { Signal } from '@lwc/signals';

type ContextProvidedCallback = (contextSignal: Signal<unknown>) => void;

export interface ContextRuntimeAdapter<T extends object> {
  isServerSide: boolean;
  component: symbol;
  provideContext<T extends object>(contextVariety: T, providedContextSignal: Signal<unknown>): void;
  consumeContext<T extends object>(
    contextVariety: T,
    contextProvidedCallback: ContextProvidedCallback,
  ): void;
}
