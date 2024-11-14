import { connectContext } from './shared.js';
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
  // Currently unused. Should be called once `disconnectContext` is implemented.
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
}

export const fromContext = <
  StateShape extends ValidStateShape,
  StateDef extends ValidStateDef<StateShape>,
>(
  stateDef: StateDef,
) => {
  return new ConsumedContextSignal<StateShape>(stateDef);
};
