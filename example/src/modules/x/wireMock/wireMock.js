import { LightningElement, wire } from 'lwc';
import { myWireAdapter } from '@salesforce/foo/myWireAdapter';

export default class App extends LightningElement {
  @wire(myWireAdapter, { id: 1 }) todo;
  get todoValue() {
    return this.todo ? 'data' : 'no';
  }
}
