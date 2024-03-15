import { LightningElement, api } from 'lwc';

export default class App extends LightningElement {
  @api childMsg = 'hey howdy!';
  @api throwError = false;
  @api mutateDOM = false;
  @api shiftLayout = false;

  connectedCallback() {
    if (this.throwError) {
      throw new Error('When do I get called?');
    }

    if (!import.meta.env.SSR && this.shiftLayout) {
      const parentElement = document.querySelector('#mount');
      parentElement.style.margin = '16px';
    }

    if (!import.meta.env.SSR && this.mutateDOM) {
      const parentDiv = this.template.querySelector('.parent');
      parentDiv.textContent = 'I mutated DOM, haha';
    }

    console.log(`connected in ${import.meta.env.SSR ? 'SSR' : 'CSR'} environment`);
  }

  someRandomMethod() {
    console.log(globalThis.location);
    console.log(location);
    console.log(origin);
  }
}
