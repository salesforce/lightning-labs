type Callback = (value: unknown) => void;

export const symbolContextKey = Symbol('context');

export class ContextRequestEvent extends CustomEvent<{
  key: unknown;
  callback: Callback;
}> {
  static readonly EVENT_NAME = 'lightning:context-request';

  constructor(detail: { key: unknown; callback: Callback }) {
    super(ContextRequestEvent.EVENT_NAME, { bubbles: true, composed: true, detail });
  }
}
