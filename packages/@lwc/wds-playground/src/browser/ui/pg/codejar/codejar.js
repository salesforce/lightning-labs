import { CodeJar } from 'codejar';
import { LightningElement, api } from 'lwc';

export default class Codejar extends LightningElement {
  @api nomargin = false;

  _content = '';
  @api get content() {
    return this._content;
  }
  set content(newValue) {
    this._content = newValue;
    if (this.hasRendered) {
      this.jar.updateCode(newValue);
    }
  }

  connectedCallback() {
    if (this.nomargin) {
      this.classList.add('no-margin');
    }
  }

  hasRendered = false;
  renderedCallback() {
    if (this.hasRendered) {
      return;
    }
    this.hasRendered = true;
    const editorEl = this.template.querySelector('.editor');
    this.jar = new CodeJar(editorEl, () => {}, { tab: '  ' });
    this.jar.updateCode(this.content);
    editorEl.addEventListener('input', () => (this._content = this.jar.toString()));
  }

  onKeyDown(evt) {
    if (evt.key === 'Tab') {
      evt.stopPropagation();
    }
  }
}
