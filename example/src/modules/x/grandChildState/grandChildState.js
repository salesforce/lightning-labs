import { defineState } from '@lwc/state';
import childStateFactory from 'x/childState';

export default defineState((_atom, _computed, _update, fromContext) => () => {
  const childState = fromContext(childStateFactory);

  return {
    childState,
  };
});
