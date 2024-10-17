import { api } from 'lwc';
import { ContextfulLightningElement, defineState } from '@lwc/state';
import parentStateFactory from './parentState.js';

export default class App extends ContextfulLightningElement {
  parentState = parentStateFactory('parentFoo');

  connectedCallback() {
    super.connectedCallback();

    setTimeout(() => {
      this.parentState.value.updateName('baz');
    }, 2000);
  }
}
