type Callback = (value: unknown) => void;

export class ContextRequestEvent extends CustomEvent<{
  key: string;
  callback: Callback;
}> {
  static readonly EVENT_NAME = 'context-request';
  readonly key: string;
  readonly callback: (value: unknown) => void;

  constructor(detail: { key: unknown; callback: Callback }) {
    super(ContextRequestEvent.EVENT_NAME, { bubbles: true, composed: true });
    // using strings for now until we have a better type for the context key
    this.key = detail.key as string;
    this.callback = detail.callback;
  }
}
