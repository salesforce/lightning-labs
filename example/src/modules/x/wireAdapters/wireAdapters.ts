import type { WireAdapter, WireDataCallback, StringKeyedRecord } from 'lwc';

class BaseWireAdapter<
  Value,
  Config extends StringKeyedRecord = StringKeyedRecord,
  Context extends StringKeyedRecord = { tagName: string },
> implements WireAdapter<Config, Context>
{
  protected connected = false;
  protected config?: Config;

  constructor(
    protected dataCallback: WireDataCallback<Value>,
    protected sourceContext?: Context,
  ) {}

  connect() {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }

  update(config: Config) {
    this.config = config;
    this.emit();
  }

  emit() {
    throw new Error('Not implemented');
  }
}

export class getCurrentTime extends BaseWireAdapter<Date, { refresh: boolean; interval: number }> {
  interval?: ReturnType<typeof setInterval>;

  emit() {
    clearInterval(this.interval);

    this.dataCallback(new Date());

    if (!this.config) {
      return;
    }

    if (this.config.refresh) {
      this.interval = setInterval(() => this.dataCallback(new Date()), this.config.interval);
    }
  }
}

export class getSourceContext extends BaseWireAdapter<{ tagName: string }> {
  emit() {
    if (this.sourceContext) {
      this.dataCallback(this.sourceContext);
    }
  }
}

export class getResponse extends BaseWireAdapter<string, { url: string }> {
  async emit() {
    if (!this.config) {
      return;
    }
    const response = await fetch(this.config.url);
    const text = await response.text();
    this.dataCallback(text);
  }
}
