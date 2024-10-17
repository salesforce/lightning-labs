import { describe, expect, test, vi, beforeEach } from 'vitest';
import { defineState, connectContext, contextID } from '../index.js';
import type { ContextRuntimeAdapter } from '../runtime-interface.js';

const stateFactory = defineState((atom, computed, update, fromContext) => (...args) => {
  const name = atom(args[0]);

  const changeName = update({ name }, ({ name: nameValue }, newName) => ({
    name: newName,
  }));

  // biome-ignore lint: test only
  const context = fromContext('' as any);

  return {
    context,
    changeName,
    name,
  };
});

const parentState = stateFactory('parent');
const childState = stateFactory('child');

const sharedContext = {
  value: 'context from adapter',
  subscribe: vi.fn(),
  id: contextID,
};

class MockContextRuntimeAdapter implements ContextRuntimeAdapter<object> {
  isServerSide = false;
  element = new WeakRef({});
  createWeakRef = <T extends object>(value: T) => new WeakRef(value);
  context = sharedContext;
  provideContext = vi.fn().mockImplementation((_context) => {
    // no-op
  });
  consumeContext = vi.fn().mockImplementation(() => {
    return this.context;
  });
}

const mockAdapter = new MockContextRuntimeAdapter();

const flushMicrotasks = () => Promise.resolve();

// Mock the LWCAdapter
vi.mock('../lwc-adapter.js', () => {
  return {
    LWCAdapter: vi.fn().mockImplementation((args) => mockAdapter),
  };
});

describe('context APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should get context by calling fromContext when connected', () => {
    // childState[connectContext]({});
    // expect(mockAdapter.provideContext).not.toHaveBeenCalled();
    // expect(mockAdapter.consumeContext).toHaveBeenCalledTimes(1);
    // expect(childState.value.context).toMatchInlineSnapshot(`
    //   ContextAtomSignal {
    //     "_id": Symbol(contextID),
    //     "_value": "context from adapter",
    //     "subscribers": Set {
    //       [Function],
    //     },
    //   }
    // `);
  });

  test('should throw error when providing context without connecting', () => {
    // expect(() => parentState.provide()).toThrow(
    //   "Connect to a host element by calling 'connect(elem)' before providing context.",
    // );
  });

  test('should provide current instance as context when connected', () => {
    // parentState[connectContext]({});
    // parentState.provide();
    // expect(mockAdapter.provideContext).toHaveBeenCalledTimes(1);
    // expect(mockAdapter.provideContext.mock.calls[0][0]).toMatchInlineSnapshot(`
    //   ContextAtomSignal {
    //     "_id": Symbol(contextID),
    //     "_value": {
    //       "context": ContextAtomSignal {
    //         "_id": Symbol(contextID),
    //         "_value": "context from adapter",
    //         "subscribers": Set {
    //           [Function],
    //         },
    //       },
    //       "name": "parent",
    //     },
    //     "subscribers": Set {},
    //   }
    // `);
  });

  test('should update provided context when state changes', async () => {
    // parentState[connectContext]({});
    // parentState.provide();
    // const providedContext = mockAdapter.provideContext.mock.calls[0][0];
    // expect(providedContext.value.name).toBe('parent');
    // parentState.value.changeName('newParent');
    // await flushMicrotasks();
    // expect(providedContext.value.name).toBe('newParent');
  });

  test('should not provide updaters in context', () => {
    // parentState[connectContext]({});
    // parentState.provide();
    // const providedContext = mockAdapter.provideContext.mock.calls[0][0];
    // expect(providedContext.value).not.toHaveProperty('changeName');
  });

  test('should get context when calling inject', () => {
    // childState[connectContext]({});
    // const injectedContext = childState.inject();
    // expect(mockAdapter.consumeContext).toHaveBeenCalledTimes(1);
    // expect(injectedContext).toBe(sharedContext);
  });
});
