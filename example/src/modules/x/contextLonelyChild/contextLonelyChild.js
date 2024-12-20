import { ContextfulLightningElement } from '@lwc/state/context';
import childStateFactory from 'x/childState';

export default class ContextLonelyChild extends ContextfulLightningElement {
  childState = childStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }
}
