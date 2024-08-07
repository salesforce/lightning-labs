import { LightningElement, wire } from 'lwc';
import { myWireAdapter } from '@salesforce/foo/myWireAdapter';
export default class App extends LightningElement {
  @wire(myWireAdapter, { id: 1 }) todo;
  get todoValue() {
    return this.todo ? this.todo.title : 'WireMockingFail';
  }
  get todoValue1() {
    return this.todo1 ? this.todo1.title : 'WireMockingFail';
  }
}
