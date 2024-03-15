import '/virtual/import-meta-env.js';
import { renderComponent } from 'lwc';
import { determineTagName } from '../shared.js';

// Because the above imports are resolved asynchronously, the worker
// process is technically ready prior to the below `onmessage` handler
// being set. To avoid that race condition, we explicitly indicate
// when the worker is ready to receive messages.
postMessage(['READY']);
// biome-ignore lint/suspicious/noGlobalAssign: correct pattern for web worker
onmessage = async (message) => {
  const {
    data: [taskId, kind, ...rest],
  } = message;

  let handler;
  if (kind === 'render') {
    handler = render;
  } else {
    return postMessage([taskId, false, new Error(`Unknown worker task of kind: ${kind}`)]);
  }

  try {
    return postMessage([taskId, true, await handler(...rest)]);
  } catch (err) {
    return postMessage([taskId, false, JSON.stringify(err, Object.getOwnPropertyNames(err))]);
  }
};

async function render(componentUrl, componentProps) {
  const { default: Cmp } = await import(componentUrl);
  return renderComponent(determineTagName(componentUrl), Cmp, componentProps);
}
