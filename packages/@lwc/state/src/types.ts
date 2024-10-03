import type { Signal } from '@lwc/signals';
import type { LightningElement } from 'lwc';
export type UnwrapSignal<T> = T extends Signal<infer Inner> ? Inner : T;

export type MakeAtom = <T>(val: T) => Signal<T>;

export type Computer<T> = (signalValues: Record<string, unknown>) => T;

export type MakeComputed = <
  InputSignals extends Record<string, Signal<unknown>>,
  SignalValues extends {
    [SignalName in keyof InputSignals]: UnwrapSignal<InputSignals[SignalName]>;
  },
  ComputedType,
>(
  inputSignals: InputSignals,
  computer: Computer<ComputedType>,
) => Signal<ComputedType>;

export type MutatorArgs = Array<unknown>;

export type MakeUpdate = <
  SignalSubType extends Signal<unknown>,
  SignalsToMutate extends Record<string, SignalSubType>,
  Values extends {
    [SignalName in keyof SignalsToMutate]?: UnwrapSignal<SignalsToMutate[SignalName]>;
  },
>(
  signalsToMutate: SignalsToMutate,
  mutator: (signalValues: Values, ...mutatorArgs: MutatorArgs) => Values,
) => (...mutatorArgs: MutatorArgs) => void;

export type MakeContextHook<T> = <StateDef extends () => Signal<T>>(
  stateDef: StateDef,
) => Signal<T>;

export type ExposedUpdater = (...updaterArgs: unknown[]) => void;

export type DefineState = <
  InnerStateShape extends Record<string, Signal<unknown> | ExposedUpdater>,
  OuterStateShape extends {
    readonly [SignalName in keyof InnerStateShape]: UnwrapSignal<InnerStateShape[SignalName]>;
  },
  Args extends unknown[],
  ContextShape,
>(
  defineStateCb: (
    atom: MakeAtom,
    computed: MakeComputed,
    update: MakeUpdate,
    fromContext: MakeContextHook<ContextShape>,
  ) => (...args: Args) => InnerStateShape,
) => (...args: Args) => Signal<OuterStateShape>;
