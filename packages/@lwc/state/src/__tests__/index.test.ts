import { describe, expect, test, vi } from 'vitest';
import { defineState } from '../index.js';

const state = defineState((atom, computed, update, _fromContext) => (...args) => {
  const arg = args[0];
  const count = atom(arg);
  const doubleCount = computed({ count }, ({ count: countValue }) => (countValue as number) * 2);
  const increment = update({ count }, ({ count: countValue }) => ({
    count: (countValue as number) + 1,
  }));
  const incrementBy = update({ count }, ({ count: countValue }, amount: number) => ({
    count: (countValue as number) + amount,
  }));

  return {
    count,
    doubleCount,
    increment,
    incrementBy,
  };
});
// biome-ignore lint: test only
const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve as any));

describe('state manager', () => {
  test('initial state', () => {
    const s = state(5);

    expect(s.value.count).toBe(5);
    expect(s.value.doubleCount).toBe(10);
  });

  test('increment updates count and doubleCount', async () => {
    const s = state(1);
    
    s.value.increment();
    await flushMicrotasks();

    expect(s.value.count).toBe(2);
    expect(s.value.doubleCount).toBe(4);
  });

  test('subscribing to state manager works', async () => {
    const s = state(1);
    const sub = vi.fn();

    s.subscribe(sub);
    s.value.increment();
    await flushMicrotasks();

    expect(sub).toHaveBeenCalledTimes(1);
  });

  test('incrementBy updates count and doubleCount', async () => {
    const s = state(1);

    s.value.incrementBy(3);
    await flushMicrotasks();

    expect(s.value.count).toBe(4);
    expect(s.value.doubleCount).toBe(8);
  });

  test('multiple updates', async () => {
    const s = state(0);

    s.value.increment();
    s.value.increment();
    s.value.incrementBy(3);
    await flushMicrotasks();

    expect(s.value.count).toBe(5);
    expect(s.value.doubleCount).toBe(10);
  });

  test('subscription triggers on update', async () => {
    const s = state(1);
    const sub = vi.fn();
    s.subscribe(sub);

    s.value.increment();
    await flushMicrotasks();

    expect(sub).toHaveBeenCalledTimes(1);
    s.value.incrementBy(2);
    await flushMicrotasks();
    expect(sub).toHaveBeenCalledTimes(2);
  });

  test('unsubscribe stops notifications', async () => {
    const s = state(1);
    const sub = vi.fn();

    const unsubscribe = s.subscribe(sub);
    s.value.increment();
    await flushMicrotasks();
    expect(sub).toHaveBeenCalledTimes(1);
    unsubscribe();
    
    s.value.increment();
    await flushMicrotasks();
    expect(sub).toHaveBeenCalledTimes(1);
  });

  test('state is immutable', () => {
    const s = state(1);
    expect(() => {
      // @ts-expect-error: this should not be allowed
      s.value.count = 10;
    }).toThrow();
  });
});
