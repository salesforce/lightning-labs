# @lwc/state

A state management solution for Lightning Web Components (LWC) using signals. This package provides utilities for creating and managing reactive state, computed values, and context within LWC applications.

## Features

- 🔄 **Reactive State Management** - Create and manage reactive state using signals
- 🧮 **Computed Values** - Define derived state that automatically updates when dependencies change
- 🌳 **Context System** - Share state across component trees with provider/consumer pattern
- 🔒 **Type Safety** - Built with TypeScript for robust type checking
- ⚡ **Performance** - Efficient updates with microtask-based batching

## Installation

To install the library, use npm or yarn:

```bash
npm install @lwc/state

yarn add @lwc/state
```

## API Reference

### defineState

The main function for creating state definitions. It provides four utilities:

- `atom<T>(initialValue: T)`: Creates a reactive atomic value
- `computed(signals, computeFn)`: Creates derived state based on provided signals map
- `update(signals, updateFn)`: Creates state mutation functions
- `fromContext(stateDefinition)`: Consumes context from parent components

### ContextfulLightningElement

Base class that enables context functionality in your components. Extend from this instead of `LightningElement` when using context for both parent and child components.


## Usage

### Basic State Management

Create a state definition using `defineState`:

```typescript
import { defineState } from '@lwc/state';

const useCounter = defineState(
  (atom, computed, update) =>
    (initialValue = 0) => {
      // Create reactive atom
      const count = atom(initialValue);
      // Create computed value
      const doubleCount = computed({ count }, ({ count }) => count * 2);
      // Create update function
      const increment = update({ count }, ({ count }) => ({
        count: count + 1,
      }));
      return {
        count,
        doubleCount,
        increment,
      };
    }
);
```


### Using State in Components

To use the `useCounter` state definition in your LWC.

```typescript
import { LightningElement } from 'lwc';
import useCounter from '../xyz';

export default class extends LightningElement {
  counter = useCounter();
}
```
```html
<template>
  Counter: {counter.value.count}
</template>
```

### Context System

Share state across your component tree:

```typescript
// parentState.ts
const context = defineState(
  (atom) =>
    (initialValue = 'light') => {
      // Create reactive state
      const theme = atom(initialValue);
      
      return {
        theme
      };
    }
);

// childState.ts
import contextFactory from '<parentState>';

const useTheme = defineState(
  (_atom, _computed, _update, fromContext) =>
    () => {
      const theme = fromContext(contextFactory);
        
      return {
        theme
      };
    }
);

export default useTheme;

```

To use context in your components, extend from `ContextfulLightningElement`:

```typescript
import { ContextfulLightningElement } from '@lwc/state';
import useTheme from '../xyz';

export default class Counter extends ContextfulLightningElement {
  theme = useTheme();
}
```