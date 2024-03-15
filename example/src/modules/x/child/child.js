import { LightningElement, api } from 'lwc';

export default class App extends LightningElement {
  @api message = '';
  get badmessage() {
    // Intentionally rendering differently in SSR & CSR to demonstrate
    // the playground functionality.
    return import.meta.env.SSR ? `${this.message} oops SSR oops` : this.message;
  }
}
