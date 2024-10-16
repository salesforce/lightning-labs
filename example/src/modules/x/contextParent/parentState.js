import { defineState } from '@lwc/state';

export default defineState((atom, computed, update, fromContext) => (initialName = 'foo') => {
  const name = atom(initialName);

  const updateName = update.contextful({ name }, (_, newName) => {
    // biome-ignore lint/suspicious/noConfusingLabels: <explanation>
    // biome-ignore lint/suspicious/noLabelVar: <explanation>
    name: newName;
  });

  return {
    name,
    updateName,
  };
});
