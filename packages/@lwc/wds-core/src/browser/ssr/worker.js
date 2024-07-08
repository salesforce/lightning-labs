import '/virtual/import-meta-env.js';
import { renderComponent, setHooks } from 'lwc';
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
  } else if (kind === 'mock') {
    handler = mock;
  } else if (kind === 'resetMock') {
    handler = resetMock;
  } else if (kind === 'evalCode') {
    handler = evalCode;
  } else if (kind === 'setHook') {
    handler = setHook;
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

async function setHook(componentUrl, updatedHooksSerialized) {
  await import(componentUrl);
  const processSerializedHooks = (serializedFuncs) => {
    const entries = JSON.parse(serializedFuncs);
    const hooks = Object.fromEntries(
      entries.map(([key, funcStr]) => [key, new Function(`return (${funcStr})`)()]),
    );
    return hooks;
  };
  const hookFuncs = processSerializedHooks(updatedHooksSerialized);
  await setHooks(hookFuncs);
}

async function mock(mockedModuleUrl, replacementUrl) {
  const { __mock__ } = await import(mockedModuleUrl);
  if (!__mock__) {
    throw new Error(`Specified module cannot be mocked: ${mockedModuleUrl}`);
  }
  await __mock__.useImport(replacementUrl);
}

async function resetMock(mockedModuleUrl) {
  const { __mock__ } = await import(mockedModuleUrl);
  if (!__mock__) {
    throw new Error(`Specified module cannot be mocked: ${mockedModuleUrl}`);
  }
  await __mock__.resetAll();
}

async function evalCode(mockedModuleUrl, code) {
  const { __mock__ } = await import(mockedModuleUrl);
  if (!__mock__) {
    throw new Error(`Specified module cannot be mocked: ${mockedModuleUrl}`);
  }
  return await __mock__.eval(code);
}
