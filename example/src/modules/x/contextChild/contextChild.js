import { ContextfulLightningElement } from '@lwc/state';
import childStateFactory from 'x/childState';

export default class ContextChild extends ContextfulLightningElement {
  childState = childStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }
}
