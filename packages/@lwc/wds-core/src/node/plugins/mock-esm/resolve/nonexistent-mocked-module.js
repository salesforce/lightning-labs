import { MOCK_STUB_PREFIX } from '../const.js';

export const makeNonexistentMockedModuleResolver =
  ({ mockedModules }) =>
  async ({ source, context }) => {
    if (!mockedModules.has(source)) {
      return;
    }
    const { importExists } = mockedModules.get(source);
    if (importExists) {
      return;
    }

    return `${MOCK_STUB_PREFIX}${source}`;
  };
