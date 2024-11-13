import { defineState } from '@lwc/state';
import parentStateFactory from 'x/parentState';
import anotherParentStateFactory from 'x/anotherParentState';

export default defineState((atom, _computed, update, fromContext) => (initialName = 'bar') => {
  const name = atom(initialName);
  const parentState = fromContext(parentStateFactory);
  const anotherParentState = fromContext(anotherParentStateFactory);

  const updateName = update({ name }, (_, newName) => ({
    name: newName,
  }));

  return {
    name,
    updateName,
    parentState,
    anotherParentState,
  };
});
