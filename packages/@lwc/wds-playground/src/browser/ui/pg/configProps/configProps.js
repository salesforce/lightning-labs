import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import { LightningElement, api } from 'lwc';

export default class ConfigProps extends LightningElement {
  @api propnames = [];
  hasRendered = false;
  enabledProps = new Set();
  propValues = new Map();
  currentlyEditedProp = null;

  renderedCallback() {
    if (this.hasRendered) {
      return;
    }
    this.hasRendered = true;
    this.attachListeners();
  }

  attachListeners() {
    const dialog = this.template.querySelector('.dialog-focus');
    const propValueEditor = this.template.querySelector('#prop-value-editor');
    dialog.addEventListener('sl-hide', (evt) => {
      // sl-hide is emitted by the alert component as well as the dialog itself
      if (evt.currentTarget !== evt.target) {
        return evt.stopPropagation();
      }
      this.currentlyEditedProp = null;
      propValueEditor.content = '';
    });

    for (const el of this.template.querySelectorAll('sl-switch[data-propname]')) {
      const propName = el.getAttribute('data-propname');
      el.addEventListener('sl-change', () => {
        this.togglePropEnabled(propName);
      });
    }
  }

  dispatchProps() {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: Object.fromEntries(
          [...this.propValues.entries()].filter(([key]) => this.enabledProps.has(key)),
        ),
      }),
    );
  }

  getDisplayValue(propName) {
    if (!this.propValues.has(propName)) {
      return '<unset>';
    }
    return this.propValues
      .get(propName)
      .replace(/\s\n\s/g, ' ␤ ')
      .replace(/\n/g, '␤');
  }

  openPropDialog(propName) {
    this.currentlyEditedProp = propName;
    this.template.querySelector('.dialog-focus').show();
  }

  get dialogContent() {
    return this.propValues.get(this.currentlyEditedProp) ?? '';
  }

  savePropValue() {
    const editor = this.template.querySelector('#prop-value-editor');
    if (editor.content) {
      try {
        new Function(`return ${editor.content}`);
      } catch (err) {
        // editor.content = this.propValues.get(this.currentlyEditedProp);
        return this.template.querySelector('sl-alert').show();
        // return this.template.querySelector('sl-alert').toast();
      }

      this.propValues.set(this.currentlyEditedProp, editor.content);
    } else {
      this.propValues.delete(this.currentlyEditedProp);
    }
    this.dispatchProps();
    this.template.querySelector('.dialog-focus').hide();
  }

  togglePropEnabled(propName) {
    if (this.enabledProps.has(propName)) {
      this.enabledProps.delete(propName);
    } else {
      this.enabledProps.add(propName);
    }
    this.dispatchProps();
  }
}
