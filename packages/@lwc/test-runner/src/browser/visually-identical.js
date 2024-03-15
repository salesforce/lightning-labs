import { assert, chai } from '@open-wc/testing';
import {
  getPixelData,
  helpers,
  pixelmatch,
  captureElement,
} from '@lwc/wds-core/browser';

const { clientSideRender, hydrateElement, insertMarkupIntoDom, renderToMarkup } = helpers;

chai.use((_chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'visuallyIdenticalInCSRandSSR', async function () {
    const componentPath = utils.flag(this, 'object');
    const props = utils.flag(this, 'message');

    const elCsr = await clientSideRender(document.querySelector('#mount'), componentPath, props);

    const csrCapture = await captureElement(elCsr);

    const { image: imageBase64Csr } = csrCapture;
    const imageCsr = Uint8Array.from(atob(imageBase64Csr), (charByteStr) =>
      charByteStr.charCodeAt(0),
    );
    const csrUrl = URL.createObjectURL(new Blob([imageCsr], { type: 'image/png' }));
    const {
      width: csrWidth,
      height: csrHeight,
      imageData: csrPixelData,
    } = await getPixelData(csrUrl);

    const markup = await renderToMarkup(componentPath, props);
    const elSsr = await insertMarkupIntoDom(markup);
    const hydratedWithSsrDOM = await hydrateElement(elSsr, componentPath);

    const ssrCapture = await captureElement(elSsr);

    const { image: imageBase64Ssr } = ssrCapture;
    const imageSsr = Uint8Array.from(atob(imageBase64Ssr), (charByteStr) =>
      charByteStr.charCodeAt(0),
    );
    const ssrUrl = URL.createObjectURL(new Blob([imageSsr], { type: 'image/png' }));
    const {
      width: ssrWidth,
      height: ssrHeight,
      imageData: ssrPixelData,
    } = await getPixelData(ssrUrl);

    const diffPixelDataLength =
      ssrPixelData.length > csrPixelData.length ? ssrPixelData.length : csrPixelData.length;
    const diffPixelData = new Uint8ClampedArray(diffPixelDataLength);

    const diffWidth = ssrWidth > csrWidth ? ssrWidth : csrWidth;
    const diffHeight = ssrHeight > csrHeight ? ssrHeight : csrHeight;

    const numNonmatchingPixels = pixelmatch(
      ssrPixelData,
      csrPixelData,
      diffPixelData,
      diffWidth,
      diffHeight,
      { threshold: 0.1 },
    );

    const diffPercentage = (numNonmatchingPixels / (diffWidth * diffHeight)) * 100;

    assert(
      numNonmatchingPixels === 0,
      `Expected CSR and SSR components to be visually identical but found them to be ${diffPercentage}% different.`,
    );
  });
});
