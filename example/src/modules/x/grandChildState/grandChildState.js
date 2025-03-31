import { defineState } from '@lwc/state';
import childStateFactory from 'x/childState';

export default defineState((_atom, _computed, fromContext) => () => {
  const childState = fromContext(childStateFactory);

  return {
    childState,
  };
});
