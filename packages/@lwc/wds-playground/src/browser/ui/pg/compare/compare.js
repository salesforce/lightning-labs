import { getPixelData } from '@browser/utils/image.js';
import pixelmatch from '@browser/utils/pixelmatch.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/image-comparer/image-comparer.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import { LightningElement, api } from 'lwc';

export default class CompareScreenshots extends LightningElement {
  _ssrPngBytes = null;
  _csrPngBytes = null;
  ssrBlob = null;
  csrBlob = null;
  ssrUrl = null;
  csrUrl = null;

  @api ssrHeight = 0;
  @api ssrWidth = 0;
  @api csrHeight = 0;
  @api csrWidth = 0;
  diffWidth = 0;
  diffHeight = 0;
  diffScale = 1;
  numNonmatchingPixels = null;
  diffImageData = null;

  @api set ssrPngBytes(value) {
    this._ssrPngBytes = value;
    this.ssrBlob = new Blob([value], { type: 'image/png' });
    this.ssrUrl = URL.createObjectURL(this.ssrBlob);
  }
  get ssrPngBytes() {
    return this._ssrPngBytes;
  }

  @api set csrPngBytes(value) {
    this._csrPngBytes = value;
    this.csrBlob = new Blob([value], { type: 'image/png' });
    this.csrUrl = URL.createObjectURL(this.csrBlob);
  }
  get csrPngBytes() {
    return this._csrPngBytes;
  }

  hasRendered = false;
  renderedCallback() {
    if (this.hasRendered) {
      return;
    }
    this.hasRendered = true;
    this.attachListeners();
  }

  attachListeners() {
    const dialog = this.template.querySelector('.dialog-focus');
    dialog.addEventListener('sl-hide', (evt) => {
      // sl-hide is emitted by the alert component as well as the dialog itself
      if (evt.currentTarget !== evt.target) {
        return evt.stopPropagation();
      }
    });
    this.template.querySelector('#tab-group').addEventListener('sl-tab-show', (ev) => {
      if (ev.detail.name === 'diff') {
        this.renderDiffImage();
      }
    });
  }

  @api async show() {
    const {
      width: ssrWidth,
      height: ssrHeight,
      imageData: ssrPixelData,
    } = await getPixelData(this.ssrUrl);
    const {
      width: csrWidth,
      height: csrHeight,
      imageData: csrPixelData,
    } = await getPixelData(this.csrUrl);
    const diffPixelDataLength =
      ssrPixelData.length > csrPixelData.length ? ssrPixelData.length : csrPixelData.length;
    const diffPixelData = new Uint8ClampedArray(diffPixelDataLength);

    const diffWidth = (this.diffWidth = ssrWidth > csrWidth ? ssrWidth : csrWidth);
    const diffHeight = (this.diffHeight = ssrHeight > csrHeight ? ssrHeight : csrHeight);
    this.diffScale = ssrHeight / this.ssrHeight;

    this.numNonmatchingPixels = pixelmatch(
      ssrPixelData,
      csrPixelData,
      diffPixelData,
      diffWidth,
      diffHeight,
      { threshold: 0.1 },
    );

    const dialog = this.template.querySelector('.dialog-focus');
    dialog.noHeader = true;
    dialog.show();

    this.diffImageData = new ImageData(diffPixelData, diffWidth, diffHeight);
    this.renderDiffImage();
  }

  renderDiffImage() {
    const canvas = this.template.querySelector('#diff-view');
    const canvasCxt = canvas.getContext('2d');
    canvasCxt.scale(this.diffScale, this.diffScale);
    canvasCxt.putImageData(this.diffImageData, 0, 0);
  }

  close() {
    this.template.querySelector('.dialog-focus').hide();
  }
}
