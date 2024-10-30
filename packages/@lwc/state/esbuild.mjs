import * as esbuild from 'esbuild';

await esbuild.build({
  banner: {
    js: '/* eslint-disable */',
  },
  entryPoints: ['./src/core.ts'],
  bundle: true,
  external: ['lwc'],
  outfile: 'dist/bundle.js',
  format: 'esm',
});
