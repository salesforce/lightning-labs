import { defineState } from '@lwc/state';
import parentStateFactory from 'x/parentState';

export default defineState((atom, _computed, update, fromContext) => (initialName = 'bar') => {
  const name = atom(initialName);
  const parentState = fromContext(parentStateFactory);

  const updateName = update({ name }, (_, newName) => ({
    name: newName,
  }));

  return {
    name,
    updateName,
    parentState,
  };
});
