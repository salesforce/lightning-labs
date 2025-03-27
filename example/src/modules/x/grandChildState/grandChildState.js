import { defineState } from '@lwc/state';
import childStateFactory from 'x/childState';

export default defineState(({ fromContext }) => () => {
  const childState = fromContext(childStateFactory);

  return {
    childState,
  };
});
