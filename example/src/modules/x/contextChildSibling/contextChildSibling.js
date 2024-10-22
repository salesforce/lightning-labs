import { ContextfulLightningElement, defineState } from '@lwc/state';
import childStateFactory from 'x/childState';

export default class ContextChildSibling extends ContextfulLightningElement {
  childState = childStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }
}
