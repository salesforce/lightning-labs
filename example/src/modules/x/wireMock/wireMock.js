import { LightningElement, wire } from 'lwc';
import { myWireAdapter } from '@salesforce/foo/myWireAdapter';
import { myWireAdapter1 } from '@salesforce/foo/myWireAdapter1';
export default class App extends LightningElement {
  @wire(myWireAdapter, { id: 1 }) todo;
  @wire(myWireAdapter1, { id: 1 }) todo1;
  get todoValue() {
    return this.todo ? this.todo.title : 'WireMockingFail';
  }
  get todoValue1() {
    return this.todo1 ? this.todo1.title : 'WireMockingFail';
  }
}
