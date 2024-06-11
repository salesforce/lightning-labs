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
  }
}

export class getCurrentTime extends BaseWireAdapter<Date, { refresh: boolean; interval: number }> {
  interval?: NodeJS.Timeout;

  async update(config: { refresh: boolean; interval: number }) {
    super.update(config);
    clearInterval(this.interval);

    this.emit();

    if (config.refresh) {
      this.interval = setInterval(() => this.emit(), config.interval);
    }
  }

  async emit() {
    this.dataCallback(new Date());
  }
}

export class getSourceContext extends BaseWireAdapter<{ tagName: string }> {
  connect() {
    super.connect();
    if (this.sourceContext) {
      this.dataCallback(this.sourceContext);
    }
  }

  disconnect() {
    super.disconnect();
    this.dataCallback({ tagName: 'unknown' });
  }

  update() {
    super.update({});
    if (this.sourceContext) {
      this.dataCallback(this.sourceContext);
    }
  }
}

export class getResponse extends BaseWireAdapter<string, { url: string }> {
  async update(config: { url: string }) {
    super.update(config);
    const response = await fetch(config.url);
    const text = await response.text();
    this.dataCallback(text);
  }
}
