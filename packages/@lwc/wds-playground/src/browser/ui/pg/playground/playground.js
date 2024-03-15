import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/details/details.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import { LightningElement, api } from 'lwc';
import htmlPlugin from 'prettier/esm/parser-html.mjs';
import prettier from 'prettier/esm/standalone.mjs';

import {
  clientSideRender,
  hydrateElement,
  insertMarkupIntoDom,
  renderToMarkup,
} from '@browser/helpers.js';
import { killWorker } from '@browser/ssr/index.js';
import { captureElement } from '@lwc/wds-core/browser';

export default class Playground extends LightningElement {
  config = null;

  @api componentPath;
  @api componentMetadata;
  @api generatedMarkup = '<-- pending -->';

  ssrEnabled = true;
  csrEnabled = false;
  ssrIsRendered = false;
  csrIsRendered = false;
  cacheBust = false;

  hasRendered = false;
  renderedCallback() {
    if (this.hasRendered) {
      return;
    }
    this.hasRendered = true;
    this.attachListeners();
  }

  attachListeners() {
    this.template.querySelector('.toggle-ssr').addEventListener('sl-change', () => {
      this.ssrEnabled = !this.ssrEnabled;
    });
    this.template.querySelector('.toggle-csr').addEventListener('sl-change', () => {
      this.csrEnabled = !this.csrEnabled;
    });
  }

  get availableComponentPropNames() {
    if (!this.componentMetadata) {
      return null;
    }

    const mainClassId = this.componentMetadata.mainClass?.refId;
    const mainClass = this.componentMetadata.classes?.find(
      (classEntry) => classEntry.id === mainClassId,
    );
    if (!mainClass) {
      return null;
    }

    return mainClass.properties
      .filter((prop) => prop.decorators.find((dec) => dec.type === 'Api'))
      .map((prop) => prop.name);
  }

  onConfigChange(evt) {
    this.config = evt.detail;
  }

  onConfigRenderClicked() {
    const configPanel = this.template.querySelector('#config-container');
    configPanel.hide();
    this.renderComponent();
  }

  connectedCallback() {
    globalThis.fileChangeSubscribers.add(
      (this._onFileChange = (filePath) => {
        if (this.config?.reloadOnFileChange) {
          console.log(`re-render after change to ${filePath}`);
          killWorker();
          this.cacheBust = true;
          this.renderComponent();
        }
      }),
    );
  }

  disconnectedCallback() {
    globalThis.fileChangeSubscribers.delete(this._onFileChange);
  }

  async renderComponent() {
    const { componentProps = {} } = this.config;

    // The values in this.config.componentProps are JavaScript expressions
    // stored as raw strings, e.g. "5 / 2". Here, these expressions are
    // evaluated and a new object with original keys and eval'd expressions
    // for values, e.g. the number 2.5.
    const componentPropsEvald = Object.fromEntries(
      Object.entries(componentProps).map(([key, valFn]) => [
        key,
        new Function(`return ${valFn}`)(),
      ]),
    );

    if (this.ssrEnabled) {
      await this.renderComponentSSR(componentPropsEvald);
      this.ssrIsRendered = true;
    }
    if (this.csrEnabled) {
      await this.renderComponentCSR(componentPropsEvald);
      this.csrIsRendered = true;
    }
  }

  async renderComponentSSR(componentPropsEvald) {
    if (!this.config) {
      console.error('Implementation error: Attempted to render but config is unavailable.');
      return;
    }
    const { componentPath } = this;
    const componentParentEl = this.template.querySelector('#ssr-parent');
    componentParentEl.innerHTML = '';

    const { enabledSteps, breakOnMarkup, breakOnInsert, breakOnHydrate } = this.config;

    if (enabledSteps === 0) {
      return;
    }

    if (breakOnMarkup) {
      // Hi there! Step forward to begin rendering the component to markup.
      // biome-ignore lint/suspicious/noDebugger: allow devs to pause execution here
      debugger;
    }
    this.generatedMarkup = await renderToMarkup(componentPath, componentPropsEvald);

    if (enabledSteps === 1) {
      return;
    }

    if (breakOnInsert) {
      // Hi there! Step forward to insert the SSR'd HTML into the DOM.
      // biome-ignore lint/suspicious/noDebugger: allow devs to pause execution here
      debugger;
    }
    await insertMarkupIntoDom(this.generatedMarkup, componentParentEl);

    if (enabledSteps === 2) {
      return;
    }

    if (breakOnHydrate) {
      // Hi there! Step forward to begin hydrate your component.
      // biome-ignore lint/suspicious/noDebugger: allow devs to pause execution here
      debugger;
    }
    await hydrateElement(
      componentParentEl.firstChild,
      componentPath,
      componentPropsEvald,
      this.cacheBust,
    );
  }

  async renderComponentCSR(componentPropsEvald) {
    const { componentPath } = this;
    const componentParentEl = this.template.querySelector('#csr-parent');
    componentParentEl.innerHTML = '';

    await clientSideRender(componentParentEl, componentPath, componentPropsEvald, this.cacheBust);
  }

  prettifyMarkup() {
    const markupChild = this.template.querySelector('#markup');
    const currentContent = markupChild.content;
    const prettifiedMarkup = prettier.format(currentContent, {
      parser: 'html',
      plugins: [htmlPlugin],
      htmlWhitespaceSensitivity: 'ignore',
    });
    markupChild.content = prettifiedMarkup;
  }

  get diffViewIsAvailable() {
    return this.ssrEnabled && this.csrEnabled && this.ssrIsRendered && this.csrIsRendered;
  }

  async showDiffView() {
    if (!this.diffViewIsAvailable) {
      return console.error('Component must be rendered by both SSR and CSR before comparing.');
    }

    const ssrEl = this.template.querySelector('#ssr-parent');
    const csrEl = this.template.querySelector('#csr-parent');
    const ssrScreenshotPngBytes = await captureElement(ssrEl);
    const csrScreenshotPngBytes = await captureElement(csrEl);

    const compareEls = this.template.querySelector('.compare-elements');
    compareEls.ssrPngBytes = ssrScreenshotPngBytes;
    compareEls.csrPngBytes = csrScreenshotPngBytes;
    compareEls.ssrHeight = ssrEl.offsetHeight;
    compareEls.csrHeight = csrEl.offsetHeight;
    compareEls.ssrWidth = ssrEl.offsetWidth;
    compareEls.csrWidth = csrEl.offsetWidth;
    compareEls.show();
  }
}
