import { LightningElement, api, wire } from 'lwc';
import { getCurrentTime, getSourceContext, getResponse } from 'x/wireAdapters';

export default class WireView extends LightningElement {
  @api refresh = false;
  @api interval = 1000;
  @api url = '/virtual/empty.html';

  @wire(getCurrentTime, { refresh: '$refresh', interval: '$interval' })
  currentTime;
  @wire(getSourceContext)
  sourceContext;
  @wire(getResponse, { url: '$url' })
  response;

  handleRefreshChange(event) {
    this.refresh = event.target.checked;
  }

  handleIntervalChange(event) {
    this.interval = event.target.value;
  }

  handleUrlChange(event) {
    this.url = event.target.value;
  }
}
