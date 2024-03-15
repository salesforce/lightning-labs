import compile from './compile.js';
import patch from './patch.js';
import resolveEngine from './resolve-engine.js';
import resolveModule from './resolve-module.js';
// import hmr from './hmr.js';

export default function lwc(options) {
  const { cwd, rootDir, moduleDirs, enableHmr = false } = options;

  return [
    compile({ rootDir, moduleDirs }),
    // enableHmr ? hmr({ rootDir }) : null,
    resolveEngine({ cwd, rootDir }),
    resolveModule({ cwd, rootDir, moduleDirs }),
    patch({ rootDir }),
  ].filter(Boolean);
}
