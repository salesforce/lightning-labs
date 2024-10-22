import { api } from 'lwc';
import { ContextfulLightningElement } from '@lwc/state';
import parentStateFactory from 'x/parentState';

export default class ContextParent extends ContextfulLightningElement {
  @api
  parentState = parentStateFactory('parentFoo');
}
