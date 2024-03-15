const REPLACEMENTS = [
  [/\bprocess\.env\.NODE_ENV\b/g, '"development"'],
  [/\bimport\.meta\.env\b/g, 'IMPORT_META_ENV'],
  ['const DEV_MODE = true;', 'const DEV_MODE = false;'],
];

const IMPORT_META_ENV_BODY = `
globalThis.IMPORT_META_ENV = {
  SSR: typeof window === 'undefined'
};
`;

export const IMPORT_META_ENV_URL = '/virtual/import-meta-env.js';

export default () => ({
  name: 'env-replace',
  transform(cxt) {
    if (!cxt.response.is('application/javascript')) {
      return cxt.body;
    }

    return REPLACEMENTS.reduce(
      (memo, [pattern, replacement]) => memo.replace(pattern, replacement),
      cxt.body,
    );
  },
  serve(context) {
    if (context.path === IMPORT_META_ENV_URL) {
      return IMPORT_META_ENV_BODY;
    }
  },
});
