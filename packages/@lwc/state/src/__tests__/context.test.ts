import { afterEach, describe, expect, test, vi } from 'vitest';
import { defineState } from '../index.js';
import { LightningElement } from 'lwc';
import { EventEmitter } from 'node:events';
const myEmitter = new EventEmitter();

vi.mock('lwc', () => {
  const LightningElement = vi.fn();
//   LightningElement.prototype.dispatchEvent = vi.fn();
  LightningElement.prototype.template = {};
  LightningElement.prototype.render = vi.fn();
//   LightningElement.prototype.addEventListener = vi.fn();
  return { LightningElement };
});

const mockElement = new LightningElement();
const mockElementPrototype = Object.getPrototypeOf(mockElement);
mockElementPrototype.addEventListener = vi.fn().mockImplementation((event, callback) => {
  myEmitter.addListener('context', function(val) {
    callback({key: 'context', callback: val.callback, stopPropagation: vi.fn()});
  });  
//   const callbackData = {key: 'context', callback: vi.fn(), stopPropagation: vi.fn()};
//   callback();
});
mockElementPrototype.dispatchEvent = vi.fn().mockImplementation((event) => {
  myEmitter.emit('context', event);
});




const state = defineState((atom, computed, update, fromContext) => (...args) => {
  const count = atom(args[0] as number);
  const doubleCount = computed({ count }, ({ count }) => count * 2);
  const increment = update({ count }, ({ count }) => ({ count: count + 1 }));
  
  let contextValue = null;
//   fromContext((context: unknown) => {
//     contextValue = context;
//   } );

  return {
    count,
    doubleCount,
    increment,
    getContextValue: () => contextValue,
  };
});

const flushMicrotasks = () => Promise.resolve();

describe('state manager with context', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('connect throws error for non-LightningElement', () => {
    const s = state(0);
    expect(() => s.connect({} as any)).toThrow('Only LightningElements are supported as hosts');
  });

  test('provide throws error if not connected', () => {
    const s = state(0);
    expect(() => s.provide()).toThrow('Connect to a host element by calling \'connect(elem)\' before providing context.');
  });

  test('inject throws error if not connected', () => {
    const s = state(0);
    expect(() => s.inject()).toThrow('Connect to a host element by calling \'connect(elem)\' before injecting context.');
  });

  test.only('connect, provide, and inject work together', () => {
    const s = state(1);
    // const mockElement = { template: {}, render: () => {} };
    
    s.connect(mockElement as any);
    s.provide();
    
    const injectedContext = s.inject();
    expect(injectedContext).toBeDefined();
    expect(injectedContext?.value.count).toBe(1);
    expect(injectedContext?.value.doubleCount).toBe(2);
  });

  test('fromContext callback is called after connect', async () => {
    const s = state(0);
    const mockElement = { template: {}, render: () => {} };
    
    s.connect(mockElement as any);
    await flushMicrotasks();
    
    expect(s.value.getContextValue()).toBeDefined();
  });

  test('context updates when state changes', async () => {
    const s = state(0);
    const mockElement = { template: {}, render: () => {} };
    
    s.connect(mockElement as any);
    s.provide();
    
    s.value.increment();
    await flushMicrotasks();
    
    const injectedContext = s.inject();
    expect(injectedContext?.value.count).toBe(1);
    expect(injectedContext?.value.doubleCount).toBe(2);
  });

  test('multiple fromContext callbacks are all called', async () => {
    const multipleContextState = defineState((atom, computed, update, fromContext) => () => {
      const callbacks = [];
      for (let i = 0; i < 3; i++) {
        callbacks.push(vi.fn());
        fromContext(callbacks[i]);
      }
      return { getCallbacks: () => callbacks };
    });

    const s = multipleContextState();
    const mockElement = { template: {}, render: () => {} };
    
    s.connect(mockElement as any);
    await flushMicrotasks();
    
    const callbacks = s.value.getCallbacks();
    callbacks.forEach(callback => {
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
