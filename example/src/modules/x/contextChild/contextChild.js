import { api } from 'lwc';
import { ContextfulLightningElement, defineState } from '@lwc/state';
import childStateFactory from './childState.js';

export default class App extends ContextfulLightningElement {
  childState = childStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }
}
