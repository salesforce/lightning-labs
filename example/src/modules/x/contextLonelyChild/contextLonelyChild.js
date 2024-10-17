import { api } from 'lwc';
import { ContextfulLightningElement, defineState } from '@lwc/state';
import childStateFactory from '../contextChild/childState.js';
// import childStateFactory from './childState.js';

export default class ContextLonelyChild extends ContextfulLightningElement {
  childState = childStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }
}
