import { defineState } from '@lwc/state';

export default defineState((atom) => (initialName = 'anotherFoo') => ({
  name: atom(initialName),
}));
