import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { defineState } from '../index.js';
// biome-ignore lint: test only
let doubleCountNotifySpy: any;
// biome-ignore lint: test only
let fruitNameAndCountNotifySpy: any;
// biome-ignore lint: test only
let fruitNameAndCountComputeValueSpy: any;

const state = defineState((atom, computed, update, _fromContext) => (...args) => {
  const countArg = args[0] as number;
  const fruitArg = args[1] as string;

  const count = atom(countArg);
  const fruit = atom(fruitArg);

  const doubleCount = computed({ count }, ({ count: countValue }) => (countValue as number) * 2);
  // @ts-ignore
  doubleCountNotifySpy = vi.spyOn(doubleCount, 'notify');

  const fruitNameAndCount = computed(
    { fruit, count },
    ({ fruit, count }) => `I have ${count} ${fruit}${(count as number) > 1 ? 's' : ''}`,
  );
  // @ts-ignore
  fruitNameAndCountNotifySpy = vi.spyOn(fruitNameAndCount, 'notify');
  // @ts-ignore
  fruitNameAndCountComputeValueSpy = vi.spyOn(fruitNameAndCount, 'computeValue');

  const increment = update({ count }, ({ count: countValue }) => ({
    count: countValue + 1,
  }));
  const incrementBy = update({ count }, ({ count: countValue }, amount: number) => ({
    count: countValue + amount,
  }));
  const changeFruit = update({ fruit }, ({ fruit }, newFruit: string) => ({
    fruit: newFruit,
  }));

  return {
    count,
    doubleCount,
    increment,
    incrementBy,
    fruitNameAndCount,
    changeFruit,
  };
});

const flushMicrotasks = () => Promise.resolve();

describe('state manager', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

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

  test('subscribing to state manager works', async () => {
    const s = state(1);
    const sub = vi.fn();

    s.subscribe(sub);
    s.value.increment();

    await flushMicrotasks();
    expect(sub).toHaveBeenCalledTimes(1);
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

  test('should call computeds notify only after an update and not at init', () => {
    const s = state(1, 'Apple');
    expect(doubleCountNotifySpy).not.toHaveBeenCalled();
    expect(fruitNameAndCountNotifySpy).not.toHaveBeenCalled();

    s.value.increment();
    expect(doubleCountNotifySpy).toHaveBeenCalledOnce();
    expect(fruitNameAndCountNotifySpy).toHaveBeenCalledOnce();
  });

  test('should only notify computeds that depends on the atom being updated', () => {
    const s = state(5, 'Apple');

    s.value.increment();
    expect(doubleCountNotifySpy).toHaveBeenCalledOnce();
    expect(fruitNameAndCountNotifySpy).toHaveBeenCalledOnce();

    s.value.changeFruit('Banana');
    // should not be notified
    expect(doubleCountNotifySpy).toHaveBeenCalledOnce();
    expect(fruitNameAndCountNotifySpy).toHaveBeenCalledTimes(2);
  });

  test('should compute computeds value lazily', () => {
    const s = state(5, 'Apple');
    expect(fruitNameAndCountComputeValueSpy).not.toHaveBeenCalled();

    // every time we access state managers value
    // all stale values are re-computed
    s.value.increment();
    expect(fruitNameAndCountComputeValueSpy).toHaveBeenCalledOnce();
    s.value.changeFruit('Banana');
    expect(fruitNameAndCountComputeValueSpy).toHaveBeenCalledTimes(2);
  });

  test('should not compute value until value is not accessed through getter', () => {
    const s = state(5, 'Apple');
    // getting references to the updaters and computed
    const { increment, changeFruit, fruitNameAndCount } = s.value;

    expect(fruitNameAndCountComputeValueSpy).toHaveBeenCalledOnce();

    increment();
    changeFruit('Banana');
    // not re-computed since value is not accessed
    expect(fruitNameAndCountComputeValueSpy).toHaveBeenCalledOnce();
    expect(fruitNameAndCount).toBe('I have 5 Apples');
    // computeds value is re-computed since accessed through state managers getter
    expect(s.value.fruitNameAndCount).toBe('I have 6 Bananas');
    expect(fruitNameAndCountComputeValueSpy).toHaveBeenCalledTimes(2);
  });

  test('should compute values correctly after multiple updates', async () => {
    const s = state(2, 'Orange');
    s.value.increment();
    s.value.incrementBy(3);
    s.value.changeFruit('Grape');
    await flushMicrotasks();

    expect(s.value.count).toBe(6);
    expect(s.value.fruitNameAndCount).toBe('I have 6 Grapes');
  });
});

describe('context', () => {
  // biome-ignore lint: test only
  let contextState: any;

  beforeAll(() => {
    contextState = defineState(() => () => ({}));
  });

  test('should be able to provide/inject context', () => {
    const s = contextState();
    const sub = vi.fn();
    const contextProvider = s.provide('context', 'foo');
    const contextConsumer = s.inject('context');
    contextConsumer.subscribe(sub);

    expect(contextConsumer.value).toBe('foo');
    contextProvider.value = 'bar';
    expect(contextConsumer.value).toBe('bar');
    expect(sub).toHaveBeenCalledOnce();
  });

  test('should not be able to mutate in context consumer', () => {
    const s = contextState();
    const contextProvider = s.provide('context', 'foo');
    const contextConsumer = s.inject('context');
    expect(() => {
      contextConsumer.value = 'bar';
    }).toThrowError('Setting value in Consumer is not allowed');
  });

  test('should return undefined when no provider is present', () => {
    const s = contextState();
    const contextConsumer = s.inject('context');

    expect(contextConsumer).toBeUndefined();
  });
});
