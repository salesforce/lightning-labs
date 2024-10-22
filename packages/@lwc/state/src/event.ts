import type { Signal } from '@lwc/signals';

export const symbolContextKey = Symbol('context');
export type ContextProvidedCallback = (contextSignal: Signal<unknown>) => void;

export class ContextRequestEvent extends CustomEvent<{
  key: typeof symbolContextKey;
  contextVariety: unknown;
  callback: ContextProvidedCallback;
}> {
  static readonly EVENT_NAME = 'lightning:context-request';

  constructor(detail: { contextVariety: unknown; callback: ContextProvidedCallback }) {
    super(ContextRequestEvent.EVENT_NAME, {
      bubbles: true,
      composed: true,
      detail: { ...detail, key: symbolContextKey },
    });
  }
}
