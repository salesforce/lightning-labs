import { assert, chai, expect } from '@open-wc/testing';
import { onCLS } from 'web-vitals/onCLS.js';
import { helpers } from '@lwc/wds-core/browser';

const { hydrateElement, insertMarkupIntoDom, renderToMarkup } = helpers;

chai.use((_chai, utils) => {
  utils.addMethod(chai.Assertion.prototype, 'noLayoutShifts', async function () {
    const componentPath = utils.flag(this, 'object');
    const props = utils.flag(this, 'message');

    const markup = await renderToMarkup(componentPath, props);
    const el = await insertMarkupIntoDom(markup);

    // To ignore over-reporting of events
    // browser expects layout shifts to happen during loading
    // due to various reasons including user-interaction and lazy loading
    // that window of duration is 500 ms
    // Hence we wait about 550 ms to kick in the hydration process
    // More details: https://web.dev/articles/optimize-cls#lab-field
    await new Promise((resolve) => setTimeout(resolve, 550));

    let onCLSPromiseResolve;
    let resolveTimeoutID;
    const onCLSPromise = new Promise((resolve) => (onCLSPromiseResolve = resolve));
    const layoutShiftReports = [];

    onCLS(
      (report) => {
        if (resolveTimeoutID) {
          clearTimeout(resolveTimeoutID);
        }

        layoutShiftReports.push({ ...report });

        // similar reasoning as above
        // we can never be sure which CLS report is the LAST report
        // and we certainly don't want to wait indefinitely
        // so we wait ~550 ms from the last reported CLS score
        // to watch for any new events to be reported.
        resolveTimeoutID = setTimeout(() => {
          onCLSPromiseResolve(layoutShiftReports);
        }, 550);
      },
      {
        reportAllChanges: true,
      },
    );

    await hydrateElement(el, componentPath, props);

    const reports = await onCLSPromise;

    for (const report of reports) {
      assert.equal(
        report.value,
        0,
        `Expected layout shift to be 0 but found it to be ${
          report.value
        } more details: ${JSON.stringify(report.entries, null, 2)}`,
      );
    }

    // We might get more reports in cases of layout shifts
    // onCLS sends at least 1 report back
    expect(reports.length).to.be.gte(1);
  });
});
