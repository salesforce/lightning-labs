import { LightningElement } from 'lwc';
import depDefault, { changeme } from './mocked-dependency.js';
import foo from '@salesforce/foo';
import fow, { getFoo } from './foo.js';
export default class App extends LightningElement {
  depDefault = depDefault;
  get changeme() {
    return getFoo;
  }
}
