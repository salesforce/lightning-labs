import { defineState } from '@lwc/state';
import parentStateFactory from '../contextParent/parentState.js';

export default defineState((atom, computed, update, fromContext) => () => {
  const parentState = fromContext(parentStateFactory);

  return {
    parentState,
  };
});
