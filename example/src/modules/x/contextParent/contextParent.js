import { api } from 'lwc';
import { ContextfulLightningElement } from '@lwc/state/context';
import parentStateFactory from 'x/parentState';
import anotherParentStateFactory from 'x/anotherParentState';

export default class ContextParent extends ContextfulLightningElement {
  @api
  parentState = parentStateFactory('parentFoo');

  @api
  dupParentState;

  anotherParentState = anotherParentStateFactory();

  @api
  hideChild = false;

  get showChild() {
    return !this.hideChild;
  }
}
