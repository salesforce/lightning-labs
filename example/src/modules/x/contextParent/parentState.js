import { defineState } from '@lwc/state';

export default defineState((atom, computed, update, fromContext) => (initialName = 'foo') => {
  const name = atom(initialName);

  const updateName = update({ name }, (_, newName) => ({
    name: newName,
  }));

  return {
    name,
    updateName,
  };
});
