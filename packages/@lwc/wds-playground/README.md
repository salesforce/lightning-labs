# LWC WDS Playground

## Getting started

Add `@lwc/wds-playground` to your `devDependencies` and invoke the command in `package.json` NPM `scripts` or use `npx`.

## Basic usage

### Playground

In your terminal, navigate to the root directory of your project where your `lwc.config.json` is located. If you're using the `lwc` field in `package.json`, you should run the playground from the same directory as your `package.json`.

Run the playground like so:

```
npx -p @lwc/wds-playground playground COMPONENT_SPECIFIER
```

You can optionally pass an `--open` flag to open your default browser automatically.

`COMPONENT_SPECIFIER` should be of form `namespace/name` or `namespace-name`. For example, in the `example` directory of this project, you might run `npx -p @lwc/wds-playground playground x/parent`.

If the "re-render when code is updated" checkbox is enabled in the playground Config, the component will be re-rendered automatically.

## Playground configuration

By default, the uplift playground will take your component through the three stages of its SSR lifecycle:

- rendering the component to HTML markup on the server
- inserting that markup into the DOM on the client
- hydrating the DOM subtree and associating it with an instance of your component class

As you work through the various scenarios you'd like your component to support in SSR, a handful of tools are available to you:

- You can prevent the playground from rehydrating SSR markup after it has been inserted into the DOM.
- Alternately, you can prevent the playground from inserting SSR markup into the DOM altogether.
- If your browser dev tools are open, you can pause execution of JavaScript prior to any/all of the three SSR lifecycle stages.

### Component Props

In many cases, you'll want to explore the functionality of your component by changing its props. Any fields that are decorated with `@api` will be displayed in the playground Config section. To set the prop during rendering, toggle the "enabled" button and click on `<unset>` to enter a JavaScript expression.

The props don't have to be strings, and they don't even have to be serializable JavaScript objects. Any JavaScript expression that could be evaluated in an SSR enviroment should be supported. Take for example the following component:

```javascript
import { LightningElement } from 'lwc';
export default class HelloWorld extends LightningElement {
	@api foo;
	@api bar = 'default value';
	baz = 'internal';
}
```

In the playground, you'd see configuration options for two props: `foo` and `bar`. If you didn't override the values using the playground configuration, the rendered instance of `HelloWorld` would have a value of `undefined` for `foo` and `"default value"` for `bar`. However, you could provide the following as the config for `foo` in the playground config:

```
{
	// my foo object
	"fooChild": new Date(),
}
```

When renderd, `this.foo` (or `foo` in the corresponding template) would be an object with property `fooChild` set to a `Date` object.

These prop values will persist when "re-render when code is updated" is enabled and you make change to your component code.
