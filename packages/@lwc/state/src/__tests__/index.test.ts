import { describe, expect, test, vi } from 'vitest';
import { defineState } from '../index.js';

const state = defineState((atom, computed, update, _fromContext) => (arg: number) => {
  const count = atom(arg);
  const doubleCount = computed({ count }, ({ count: countValue }) => (countValue as number) * 2);
  const increment = update({ count }, ({ count: countValue }) => ({
    count: countValue + 1,
  }));
  const incrementBy = update({ count }, ({ count: countValue }, amount: number) => ({
    count: countValue + amount,
  }));

  return {
    count,
    doubleCount,
    increment,
    incrementBy,
  };
});

describe('state manager', () => {
  test('initial state', () => {
    const s = state(5);

    expect(s.value.count).toBe(5);
    expect(s.value.doubleCount).toBe(10);
  });

  test('increment updates count and doubleCount', () => {
    const s = state(1);
    s.value.increment();

    expect(s.value.count).toBe(2);
    expect(s.value.doubleCount).toBe(4);
  });

  test('subscribing to state manager works', () => {
    const s = state(1);
    const sub = vi.fn();

    s.subscribe(sub);
    s.value.increment();

    expect(sub).toHaveBeenCalledTimes(2);
  });

  test('incrementBy updates count and doubleCount', () => {
    const s = state(1);

    s.value.incrementBy(3);

    expect(s.value.count).toBe(4);
    expect(s.value.doubleCount).toBe(8);
  });

  test('multiple updates', () => {
    const s = state(0);

    s.value.increment();
    s.value.increment();
    s.value.incrementBy(3);

    expect(s.value.count).toBe(5);
    expect(s.value.doubleCount).toBe(10);
  });

  test('subscription triggers on update', () => {
    const s = state(1);
    const sub = vi.fn();
    s.subscribe(sub);

    s.value.increment();

    expect(sub).toHaveBeenCalledTimes(2);
    s.value.incrementBy(2);
    expect(sub).toHaveBeenCalledTimes(4);
  });

  test('unsubscribe stops notifications', () => {
    const s = state(1);
    const sub = vi.fn();

    const unsubscribe = s.subscribe(sub);
    s.value.increment();
    expect(sub).toHaveBeenCalledTimes(2);
    unsubscribe();

    s.value.increment();

    expect(sub).toHaveBeenCalledTimes(2);
  });

  test('state is immutable', () => {
    const s = state(1);
    expect(() => {
      // @ts-expect-error: this should not be allowed
      s.value.count = 10;
    }).toThrow();
  });
});
