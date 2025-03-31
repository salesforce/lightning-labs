import { defineState } from '@lwc/state';

export default defineState((atom, computed, fromContext, setAtom) => (initialName = 'foo') => {
  const name = atom(initialName);

  const updateName = (newName) => {
    setAtom(name, newName);
  };

  return {
    name,
    updateName,
  };
});
