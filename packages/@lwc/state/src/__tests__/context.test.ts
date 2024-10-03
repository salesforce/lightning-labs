import { afterEach, describe, expect, test, vi } from 'vitest';
import { defineState } from '../index.js';
import { LightningElement } from 'lwc';
import { EventEmitter } from 'node:events';
import { ContextProvider, ContextConsumer } from '../context.js';
const myEmitter = new EventEmitter();

vi.mock('lwc', () => {
  const LightningElement = vi.fn();
  LightningElement.prototype.template = {};
  LightningElement.prototype.render = vi.fn();
  return { LightningElement };
});

const makeParentElement = () => {
  const mockElement = new LightningElement();
  const mockElementPrototype = Object.getPrototypeOf(mockElement);

  mockElementPrototype.addEventListener = vi.fn().mockImplementation((event, callback) => {
    myEmitter.addListener(ContextProvider.CONTEXT_KEY, (val) => {
      callback({
        key: ContextProvider.CONTEXT_KEY,
        callback: val.callback,
        stopPropagation: vi.fn(),
      });
    });
  });

  return mockElement;
};

const makeChildElement = () => {
  const mockElement = new LightningElement();
  const mockElementPrototype = Object.getPrototypeOf(mockElement);

  mockElementPrototype.dispatchEvent = vi.fn().mockImplementation((event) => {
    myEmitter.emit(ContextConsumer.CONTEXT_KEY, event);
  });
  return mockElement;
};

const nameState = defineState((atom, computed, update, fromContext) => (...args) => {
  const name = atom(args[0] as string);
  const changeName = update({ name }, ({ name }, newName: string) => ({
    name: newName,
  }));

  // biome-ignore lint: test only
  let contextValue: any;
  // @ts-ignore
  fromContext((context) => {
    contextValue = context;
  });

  return {
    name,
    changeName,
    get context() {
      return contextValue;
    },
  };
});

describe('state manager with context', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('child can access parent context', () => {
    const parentState = nameState('Parent');
    const childState = nameState('Child');
    const parentElement = makeParentElement();
    const childElement = makeChildElement();
    // biome-ignore lint: test only
    (parentState as any).connect(parentElement);
    // biome-ignore lint: test only
    (parentState as any).provide();
    // biome-ignore lint: test only
    (childState as any).connect(childElement);

    expect(parentState.value.name).toBe('Parent');
    expect(childState.value.name).toBe('Child');
    expect(childState.value.context.value.name).toBe('Parent');
  });

  test('child gets updated when parent changes', () => {
    const parentState = nameState('Parent');
    const childState = nameState('Child');
    const parentElement = makeParentElement();
    const childElement = makeChildElement();

    // biome-ignore lint: test only
    (parentState as any).connect(parentElement);
    // biome-ignore lint: test only
    (parentState as any).provide();
    // biome-ignore lint: test only
    (childState as any).connect(childElement);
    parentState.value.changeName('New Parent');

    expect(childState.value.name).toBe('Child');
    expect(childState.value.context.value.name).toBe('New Parent');
  });
});
