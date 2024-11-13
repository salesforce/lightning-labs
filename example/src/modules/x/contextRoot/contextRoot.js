import { LightningElement, api } from 'lwc';

export default class ContextRoot extends LightningElement {
  @api
  dupParentState;
}
