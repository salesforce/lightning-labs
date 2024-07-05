import { LightningElement, wire } from 'lwc';
import { counter } from '@salesforce/foo/dep';
export default class App extends LightningElement {
  get getCounter() {
    return counter;
  }
}
