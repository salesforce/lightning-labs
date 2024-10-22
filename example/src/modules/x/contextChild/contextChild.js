import { api } from 'lwc';
import { ContextfulLightningElement, defineState } from '@lwc/state';
import childStateFactory from './childState.js';

export default class ContextChild extends ContextfulLightningElement {
  childState = childStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }
}
