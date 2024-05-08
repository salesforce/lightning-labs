import { LightningElement } from 'lwc';
import depDefault, { changeme } from './mocked-dependency.js';
import foo from '@salesforce/foo';

export default class App extends LightningElement {
  depDefault = depDefault;
  get changeme() {
    return changeme;
  }
}
