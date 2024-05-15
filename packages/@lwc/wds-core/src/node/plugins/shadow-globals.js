import * as querystring from 'node:querystring';

const WORKER_GLOBAL_SCOPED_VARS = [
  ['caches', 'undefined'],
  ['createImageBitmap', 'undefined'],
  ['fonts', 'undefined'],
  [
    'globalThis',
    `new Proxy({}, { set() { throw new Error('You should not set anything on globalThis in SSR env.'); } })`,
  ],
  ['indexedDB', 'undefined'],
  ['isSecureContext', 'undefined'],
  ['location', 'undefined'],
  ['navigator', 'undefined'],
  ['origin', 'undefined'],
  ['scheduler', 'undefined'],
  ['self', 'undefined'],
].map(([varName, shadowValue]) => ({
  varName,
  shadowValue,
  re: new RegExp(`\\b${varName}\\b`),
}));

export default () => {
  return {
    name: 'shadow-globals',
    transform(context) {
      const [contextPath, contextParamStr] = context.url.split('?') ?? '';
      const { env } = querystring.parse(contextParamStr);
      const { body } = context;

      const isCode = contextPath.endsWith('.js') || contextPath.endsWith('.ts');

      if (
        env === 'ssr' &&
        isCode &&
        // Files provided by uplift project plugins
        !context.url.startsWith('/virtual/') &&
        // UI/browser code that's part of uplift project
        !context.url.startsWith('/src/browser/') &&
        !context.url.includes('node_modules/') &&
        // Files served by dev-server internals
        !context.url.startsWith('/__')
      ) {
        const varsToShadow = WORKER_GLOBAL_SCOPED_VARS.map(({ varName, shadowValue, re }) =>
          re.test(body) ? { varName, shadowValue } : null,
        ).filter(Boolean);

        if (!varsToShadow.length) {
          return;
        }

        const prelude = `const ${varsToShadow
          .map(({ varName, shadowValue }) => `${varName}=${shadowValue}`)
          .join(',')};`;

        return `${prelude}\n${body}`;
      }
    },
  };
};
