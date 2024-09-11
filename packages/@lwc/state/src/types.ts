import type { Signal } from '@lwc/signals';


export type UnwrapSignal<T> = T extends Signal<infer Inner> ? Inner : T;

export type MakeAtom = <T>(val: T) => Signal<T>;

export type MakeComputed = <
  InputSignals extends Record<string, Signal<unknown>>,
  SignalValues extends { [SignalName in keyof InputSignals]: UnwrapSignal<InputSignals[SignalName]>},
  ComputedType extends unknown,
>(inputSignals: InputSignals, computor: (signalValues: SignalValues) => ComputedType) => Signal<ComputedType>

export type MakeUpdate = <
  SignalsToMutate extends Record<string, Signal<any>>,
  Values extends { [signalName in keyof SignalsToMutate]?: UnwrapSignal<SignalsToMutate[keyof SignalsToMutate]> },
  MutatorArgs extends unknown[],
> (
  signalsToMutate: SignalsToMutate,
  mutator: (signalValues: Values, ...mutatorArgs: MutatorArgs) => Values,
) => (...mutatorArgs: MutatorArgs) => void;

export type MakeContextHook = <T, StateDef extends () => Signal<T>>(stateDef: StateDef) => Signal<T>;

export type DefineState = <
  InnerStateShape extends Record<string, Signal<any> | ((...updaterArgs: any[]) => void)>,
  OuterStateShape extends { readonly [SignalName in keyof InnerStateShape]: UnwrapSignal<InnerStateShape[SignalName]> },
  Args extends any[],
>(
  defineStateCb: (
    atom: MakeAtom,
    computed: MakeComputed,
    update: MakeUpdate,
    fromContext: MakeContextHook,
  ) => (...args: Args) => InnerStateShape
) => (...args: Args) => Signal<OuterStateShape>

// TODO: get rid of this
export const defineState: DefineState = () => {};