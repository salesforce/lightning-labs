import { relative as pathRelative } from 'node:path';

import resolveSync from 'resolve/sync.js';

import { toolkitSrcPath } from '../../util.js';

const LWC_SHIM_URL = '/virtual/lwc.js';

const getLwcShim = (engineServerUrl, engineDomUrl) => `
let engineDomQueryParam = '';
if (typeof globalThis === 'object' && globalThis.__WTR_CONFIG__) {
  const { testFile } = globalThis.__WTR_CONFIG__;
  const testFileUrl = new URL(testFile, window.location.origin);
  engineDomQueryParam = testFileUrl.search;
}

const {
  LightningElement,
  __unstable__ProfilerControl,
  __unstable__ReportingControl,
  api,
  createContextProvider,
  createElement,
  deprecatedBuildCustomElementConstructor,
  freezeTemplate,
  getComponentConstructor,
  getComponentDef,
  hydrateComponent,
  isComponentConstructor,
  isNodeFromTemplate,
  parseFragment,
  parseSVGFragment,
  readonly,
  register,
  registerComponent,
  registerDecorators,
  registerTemplate,
  renderComponent,
  renderer,
  rendererFactory,
  sanitizeAttribute,
  setFeatureFlag,
  setFeatureFlagForTest,
  setHooks,
  swapComponent,
  swapStyle,
  swapTemplate,
  track,
  unwrap,
  wire,
} = IMPORT_META_ENV.SSR
  ? await import("${engineServerUrl}")
  : await import("${engineDomUrl}" + engineDomQueryParam);

function patchedRegisterDecorators(Ctor, meta) {
  const patchedMeta = {
    ...meta,
    wire: meta.wire,
  };
  return registerDecorators(Ctor, patchedMeta);
}

export {
  LightningElement,
  __unstable__ProfilerControl,
  __unstable__ReportingControl,
  api,
  createContextProvider,
  createElement,
  deprecatedBuildCustomElementConstructor,
  freezeTemplate,
  getComponentConstructor,
  getComponentDef,
  hydrateComponent,
  isComponentConstructor,
  isNodeFromTemplate,
  parseFragment,
  parseSVGFragment,
  readonly,
  register,
  registerComponent,
  patchedRegisterDecorators as registerDecorators,
  registerTemplate,
  renderComponent,
  renderer,
  rendererFactory,
  sanitizeAttribute,
  setFeatureFlag,
  setFeatureFlagForTest,
  setHooks,
  swapComponent,
  swapStyle,
  swapTemplate,
  track,
  unwrap,
  wire,
};
`;

export default ({ rootDir }) => {
  const engineServerAbsPath = resolveSync('@lwc/engine-server/dist/index.js', {
    basedir: toolkitSrcPath,
  });
  const engineDomAbsPath = resolveSync('@lwc/engine-dom/dist/index.js', {
    basedir: toolkitSrcPath,
  });
  const engineServerUrl = `/${pathRelative(rootDir, engineServerAbsPath)}`;
  const engineDomUrl = `/${pathRelative(rootDir, engineDomAbsPath)}`;

  return {
    name: 'lwc-resolve-engine',
    resolveImport({ source }) {
      if (source === 'lwc') {
        return LWC_SHIM_URL;
      }
    },
    serve(context) {
      if (context.path === LWC_SHIM_URL) {
        return getLwcShim(engineServerUrl, engineDomUrl);
      }
    },
  };
};
