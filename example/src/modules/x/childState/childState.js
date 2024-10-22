import { defineState } from '@lwc/state';
import parentStateFactory from 'x/parentState';

export default defineState((atom, computed, update, fromContext) => () => {
  const parentState = fromContext(parentStateFactory);

  return {
    parentState,
  };
});
