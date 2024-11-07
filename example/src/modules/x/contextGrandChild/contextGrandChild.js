import { ContextfulLightningElement } from '@lwc/state/context';
import childStateFactory from 'x/childState';
import grandChildStateFactory from 'x/grandChildState';

export default class ContextGrandChild extends ContextfulLightningElement {
  childState = childStateFactory();
  grandChildState = grandChildStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }

  get nameProvidedByChild() {
    return this.grandChildState.value.childState.value?.name ?? 'not available';
  }
}
