import { api } from 'lwc';
import { ContextfulLightningElement, defineState } from '@lwc/state';
import childStateFactory from './childState.js';

export default class App extends ContextfulLightningElement {
  childState = childStateFactory();

  renderedCallback() {
    console.log(this.childState.value);
  }
}
