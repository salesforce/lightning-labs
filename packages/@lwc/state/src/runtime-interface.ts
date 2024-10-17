import type { Signal } from '@lwc/signals';

type ContextProvidedCallback = (contextSignal: Signal<unknown>) => void;

export interface ContextRuntimeAdapter<T extends object> {
  isServerSide: boolean;
  provideContext<T extends object>(contextVariety: T, providedContextSignal: Signal<unknown>): void;
  consumeContext<T extends object>(
    contextVariety: T,
    contextProvidedCallback: ContextProvidedCallback,
  ): void;
}
