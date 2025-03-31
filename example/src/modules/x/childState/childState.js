import { defineState } from '@lwc/state';
import parentStateFactory from 'x/parentState';
import anotherParentStateFactory from 'x/anotherParentState';

export default defineState((atom, computed, fromContext, setAtom) => (initialName = 'bar') => {
  const name = atom(initialName);
  const parentState = fromContext(parentStateFactory);
  const anotherParentState = fromContext(anotherParentStateFactory);

  const updateName = (newName) => {
    setAtom(name, newName);
  };

  return {
    name,
    updateName,
    parentState,
    anotherParentState,
  };
});
