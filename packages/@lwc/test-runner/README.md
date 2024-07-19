# LWC Test Runner

## Getting started

Add `@lwc/test-runner` to your `devDependencies`. Invoke the command in `package.json` NPM `scripts` or use `npx`.

## Basic usage

### Test Runner

Similarly to the playground, the test runner should be run from the same directory as `lwc.config.json` or `package.json`. It is invoked like so:

```
npm install --save-dev @lwc/test-runner
npx test-lwcs SPEC_FILE_PATTERN
```

You may want to surround your `SPEC_FILE_PATTERN` in single quotes, depending on whether your shell automatically expands glob patterns (ZSH, for example).

To distinguish SSR-related tests from existing Jest tests, you will likely want each type of test to have its own distinct file extension. For example, if your Jest tests are named `COMPONENT_NAME.spec.js`, you may want to name your SSR-related test file `COMPONENT_NAME.spec.ssr.js`. If you did so, the command to run your tests might be:

```
npx test-lwcs './src/**/*.spec.ssr.js'
````
You can use --quiet tag to supress console logs on terminal.
```
npx test-lwcs './src/**/*.spec.ssr.js' --quiet
````

The available utilities within tests are very much in flux at this time, so there is no extensive documentation. However, there are four imports that are likely to get heavy use in your SSR-related tests:

```
import {
  expect,
  renderToMarkup,
  insertMarkupIntoDom,
  hydrateElement,
  setHooks
} from '@lwc/test-runner/test';
```

- `expect` comes from the Chai assertion library, and has some DOM- and Web Component- related plugins preinstalled.
- `renderToMarkup` is an async function that takes the path to your component and the props that should be used for rendering. It returns `Promise<String>` where the `String` is HTML markup.
- `insertMarkupIntoDom` is an async function that takes SSR markup (like that returned from `renderToMarkup`) as its singe argument. It returns `Promise<HtmlElement>`, which is a handle to the root element of your SSR-rendered DOM subtree.
- `hydrateElement` is an async function that takes a root `el` (like that returned from `insertMarkupIntoDom`) and component props (which should probably be the same as what was passed to `renderToMarkup`). It a `Promise<Boolean>`, where the `Boolean` indicates whether hydration completed without validation errors. In most cases, you'll want this `Boolean` value to be `true`.
- `setHooks` is a async function that allows you to override or customize specific hooks for testing. This is useful for modifying the behavior of certain parts of your application during tests e.g implementing sanitizeHtmlContent in test env.

SetHooks usage :
```
import { expect, renderToMarkup, setHooks } from '@lwc/test-runner';
import mockDep from 'mock{default,counter,override}:@salesforce/foo/dep';
const componentPath = import.meta.resolve('./evalTest.js');
await setHooks(componentPath,
  {
    sanitizeHtmlContent: (content) => content
  }
)
```


## Mocking in @lwc/test-runner

### Mocking Modules

To mock a module in your test file, include the following import statement in your test file:

```
import mockDep from 'mock{default,export1,export2}:<path-to-module>';
```
Make sure to include all exports that you want to update from the original module in the import statement.

### Updating the Entire Module
To update the code for the entire file, use:
```
await mockDep({
  ...new_implementation_of_mocked_module....
});
```
Ensure that the exported values here match the exports mentioned in the import statement.

### Interacting with Specific Exports
You can interact directly with any particular export of the mocked module using the eval option:
```
await mockDep.eval(`
  exports.<export_name> = newValue;
`);
```

### Evaluating and Returning Values
To evaluate and return values with eval:
```
const sum = await mockDep.eval(`
  return exports.<export_name> + 3;
`);
expect(sum.csr).to.equal(4); // returned value will have different values for csr and ssr
expect(sum.ssr).to.equal(4);
```

### Resetting Mocked Modules
To reset the values of a mocked module to their original values, call reset:
```
await mockDep.reset();
```

### Mocking @wire Adapters
To mock a @wire adapter in your test file, import it like any other export you want to mock from a module:
```
import mockWire from 'mock{myWireAdapter}:@salesforce/foo/myWireAdapter';
// To initialize this mock as a wire adapter, do the following in your test file:
await wireMockUtil(mockWire, 'myWireAdapter');
```
Here is a test with mocked wire adapter
```
import mockWire from 'mock{myWireAdapter}:@salesforce/foo/myWireAdapter';
import { expect, renderToMarkup, wireMockUtil } from '@lwc/test-runner';

const componentPath = import.meta.resolve('./wireMock.js');
await wireMockUtil(mockWire, 'myWireAdapter');

describe('<x-has-mocked-internals>', () => {
  it('wireMockTest', async () => {
    const updateCode = `
      const data = {
        userId: 1,
        id: 1,
        title: 'Wire Mock Success1',
        completed: false
      };
      exports.myWireAdapter.emit(data);
    `;
    await mockWire.eval(updateCode);
    const markup = await renderToMarkup(componentPath, {});
    expect(markup).to.contain(`<div id="todo">Wire Mock Success1</div>`);
  });
});
```
This example demonstrates how to use mockWire to simulate a @wire adapter response in your tests, ensuring that your components behave correctly under various data scenarios.
