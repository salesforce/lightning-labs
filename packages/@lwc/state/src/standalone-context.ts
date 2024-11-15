import { connectContext, disconnectContext } from './shared.js';
import { SignalBaseClass, type Signal } from '@lwc/signals';
import type { ExposedUpdater } from './types.js';
import type { ContextRuntimeAdapter } from './runtime-interface.js';
import type { ContextManager } from './index.js';

type ValidStateShape = Record<string, Signal<unknown> | ExposedUpdater>;
type ValidStateDef<StateShape extends ValidStateShape> = () => Signal<StateShape>;

class ConsumedContextSignal<StateShape extends ValidStateShape>
  extends SignalBaseClass<ValidStateShape>
  implements ContextManager
{
  private desiredStateDef: ValidStateDef<StateShape>;
  private _value: StateShape | null = null;
  private unsubscribe: () => void = () => {};

  constructor(stateDef: ValidStateDef<StateShape>) {
    super();
    this.desiredStateDef = stateDef;
  }

  get value(): StateShape | null {
    return this._value;
  }

  [connectContext](runtimeAdapter: ContextRuntimeAdapter<object>) {
    if (!runtimeAdapter) {
      throw new Error(
        'Implementation error: runtimeAdapter must be present at the time of connect.',
      );
    }

    runtimeAdapter.consumeContext(
      this.desiredStateDef,
      (providedContextSignal: Signal<StateShape>) => {
        this._value = providedContextSignal.value;
        this.notify();
        this.unsubscribe = providedContextSignal.subscribe(() => {
          this._value = providedContextSignal.value;
          this.notify();
        });
      },
    );
  }

  [disconnectContext](_componentId: ContextRuntimeAdapter<object>['component']) {
    // Unlike the state manager's fromContext which can subscribe to multiple
    // ancestor contexts simultaneously, this standalone version only subscribes
    // to a single context at a time. Therefore, we don't need to use componentId
    // to track subscriptions.
    this.unsubscribe();
    this.unsubscribe = () => {};
  }
}

export const fromContext = <
  StateShape extends ValidStateShape,
  StateDef extends ValidStateDef<StateShape>,
>(
  stateDef: StateDef,
) => {
  return new ConsumedContextSignal<StateShape>(stateDef);
};
