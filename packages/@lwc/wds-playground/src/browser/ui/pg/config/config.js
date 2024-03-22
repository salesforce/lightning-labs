import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import { LightningElement, api } from 'lwc';

import { STEP_HYDRATE, STEP_INSERT_MARKUP, STEP_RENDER_MARKUP } from '@browser/shared.js';

export default class Config extends LightningElement {
  @api propnames;
  @api enabledSteps = 3;
  @api breakOnMarkup = false;
  @api breakOnInsert = false;
  @api breakOnHydrate = false;
  @api reloadOnFileChange = false;
  @api observeLayoutShift = false;

  hasRendered = false;
  componentProps = {};

  connectedCallback() {
    if (!this.propnames) {
      throw new Error('propnames must be supplied as property of Config');
    }
    this.dispatchConfig();
  }

  renderedCallback() {
    if (!this.hasRendered) {
      this.hasRendered = true;
      this.attachListeners();
    }
  }

  attachListeners() {
    const s1 = this.template.querySelector('#step1');
    const s2 = this.template.querySelector('#step2');
    const s3 = this.template.querySelector('#step3');
    s1.addEventListener('sl-change', (...args) => {
      this.enabledSteps = s1.checked ? STEP_RENDER_MARKUP : 0;
      this.dispatchConfig();
    });
    s2.addEventListener('sl-change', (...args) => {
      this.enabledSteps = s2.checked ? STEP_INSERT_MARKUP : STEP_RENDER_MARKUP;
      this.dispatchConfig();
    });
    s3.addEventListener('sl-change', (...args) => {
      this.enabledSteps = s3.checked ? STEP_HYDRATE : STEP_INSERT_MARKUP;
      this.dispatchConfig();
    });

    this.template.querySelector('#break1').addEventListener('sl-change', () => {
      this.breakOnMarkup = !this.breakOnMarkup;
      this.dispatchConfig();
    });
    this.template.querySelector('#break2').addEventListener('sl-change', () => {
      this.breakOnInsert = !this.breakOnInsert;
      this.dispatchConfig();
    });
    this.template.querySelector('#break3').addEventListener('sl-change', () => {
      this.breakOnHydrate = !this.breakOnHydrate;
      this.dispatchConfig();
    });

    const reloadCheckbox = this.template.querySelector('#filechange');
    reloadCheckbox.addEventListener('sl-change', () => {
      this.reloadOnFileChange = !this.reloadOnFileChange;
      this.dispatchConfig();
    });

    this.template.querySelector('#layoutshift').addEventListener('sl-change', () => {
      this.observeLayoutShift = !this.observeLayoutShift;
      this.dispatchConfig();
    });
  }

  setComponentProps(evt) {
    this.componentProps = evt.detail;
    this.dispatchConfig();
  }

  dispatchConfig() {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: {
          enabledSteps: this.enabledSteps,
          breakOnMarkup: this.breakOnMarkup,
          breakOnInsert: this.breakOnInsert,
          breakOnHydrate: this.breakOnHydrate,
          componentProps: this.componentProps,
          reloadOnFileChange: this.reloadOnFileChange,
          observeLayoutShift: this.observeLayoutShift,
        },
      }),
    );
  }

  get step1ind() {
    return this.enabledSteps > 1;
  }

  get step2ind() {
    return this.enabledSteps > 2;
  }

  get step3ind() {
    return false;
  }

  get step1checked() {
    return this.enabledSteps === 1;
  }

  get step2checked() {
    return this.enabledSteps === 2;
  }

  get step3checked() {
    return this.enabledSteps === 3;
  }

  triggerRender() {
    this.dispatchEvent(new CustomEvent('renderclicked'));
  }
}
