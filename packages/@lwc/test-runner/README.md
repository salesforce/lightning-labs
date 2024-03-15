# LWC Test Runner

## Getting started

Add `@lwc/test-runner` to your `devDependencies`. Invoke the command in `package.json` NPM `scripts` or use `npx`.

## Basic usage

### Test Runner

Similarly to the playground, the test runner should be run from the same directory as `lwc.config.json` or `package.json`. It is invoked like so:

```
npx -p @lwc/test-runner test-lwcs SPEC_FILE_PATTERN
```

You may want to surround your `SPEC_FILE_PATTERN` in single quotes, depending on whether your shell automatically expands glob patterns (ZSH, for example).

To distinguish SSR-related tests from existing Jest tests, you will likely want each type of test to have its own distinct file extension. For example, if your Jest tests are named `COMPONENT_NAME.spec.js`, you may want to name your SSR-related test file `COMPONENT_NAME.spec.ssr.js`. If you did so, the command to run your tests might be:

```
npx -p @lwc/test-runner test-lwcs './src/**/*.spec.ssr.js';
````

The available utilities within tests are very much in flux at this time, so there is no extensive documentation. However, there are four imports that are likely to get heavy use in your SSR-related tests:

```
import {
  expect,
  renderToMarkup,
  insertMarkupIntoDom,
  hydrateElement,
} from '@lwc/test-runner/test';
```

- `expect` comes from the Chai assertion library, and has some DOM- and Web Component- related plugins preinstalled.
- `renderToMarkup` is an async function that takes the path to your component and the props that should be used for rendering. It returns `Promise<String>` where the `String` is HTML markup.
- `insertMarkupIntoDom` is an async function that takes SSR markup (like that returned from `renderToMarkup`) as its singe argument. It returns `Promise<HtmlElement>`, which is a handle to the root element of your SSR-rendered DOM subtree.
- `hydrateElement` is an async function that takes a root `el` (like that returned from `insertMarkupIntoDom`) and component props (which should probably be the same as what was passed to `renderToMarkup`). It a `Promise<Boolean>`, where the `Boolean` indicates whether hydration completed without validation errors. In most cases, you'll want this `Boolean` value to be `true`.
