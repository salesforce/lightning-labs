import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * eslint-disable is required for module to bypass eslint rules in core
 */
const BANNER = `
/* eslint-disable */
/**
 * This file is generated from repository: ${pkg.repository?.url}
 * module: ${pkg.repository?.directory} 
 */`;

await esbuild.build({
  banner: {
    js: BANNER,
  },
  entryPoints: ['./src/core.ts'],
  bundle: true,
  external: ['lwc'],
  outfile: 'dist/bundle.js',
  format: 'esm',
  footer: {
    js: `/* @lwc/state v${pkg.version} */`,
  },
});
