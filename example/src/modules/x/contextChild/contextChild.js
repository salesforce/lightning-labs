import { api } from 'lwc';
import { ContextfulLightningElement } from '@lwc/state/context';
import childStateFactory from 'x/childState';

export default class ContextChild extends ContextfulLightningElement {
  @api
  childState = childStateFactory();

  get nameProvidedByParent() {
    return this.childState.value.parentState.value?.name ?? 'not available';
  }
}
