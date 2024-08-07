import { createElement, hasMismatch, hydrateComponent } from '@lwc/engine-dom';
import { determineTagName } from './shared.js';
import * as ssr from './ssr/index.js';
import { setHooks as setHookCSR } from 'lwc';
const thisUrl = new URL(import.meta.url);
const pathname = thisUrl.pathname;
const directoryPath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
const newFileUrl = `${thisUrl.origin}${directoryPath}wireMockUtil.js`;

function getQueryString(paramsObj) {
  const queryParams = new URLSearchParams(thisUrl.searchParams);
  if (paramsObj && Object.keys(paramsObj).length > 0) {
    for (const [key, val] of Object.entries(paramsObj)) {
      queryParams.set(key, val);
    }
  }
  const queryString = queryParams.toString();
  return queryString.length ? `?${queryString}` : '';
}

export async function renderToMarkup(componentPath, props = {}) {
  return await ssr.render(componentPath, props);
}

function attachShadowRoots(rootEl) {
  for (const templateEl of rootEl.querySelectorAll('template[shadowroot]')) {
    const mode = templateEl.getAttribute('shadowroot');
    const shadowRoot = templateEl.parentNode.attachShadow({ mode });
    shadowRoot.appendChild(templateEl.content);
    templateEl.remove();
    attachShadowRoots(shadowRoot);
  }
}

export async function insertMarkupIntoDom(markup, parentEl = document.querySelector('#mount')) {
  if (Element.prototype.setHTMLUnsafe) {
    parentEl.setHTMLUnsafe(markup);
  } else {
    parentEl.innerHTML = markup;
  }
  attachShadowRoots(parentEl);
  return parentEl.firstChild;
}

export async function hydrateElement(el, componentPath, props = {}, cacheBust = false) {
  const cacheBustedComponentPath = cacheBust
    ? `${componentPath}${getQueryString({ cacheBust: Date.now() })}`
    : `${componentPath}${getQueryString()}`;
  const { default: Ctor } = await import(cacheBustedComponentPath);

  hydrateComponent(el, Ctor, props);

  return !hasMismatch;
}

export async function clientSideRender(parentEl, componentPath, props = {}, cacheBust = false) {
  const cacheBustedComponentPath = cacheBust
    ? `${componentPath}${getQueryString({ cacheBust: Date.now() })}`
    : `${componentPath}${getQueryString()}`;

  const { default: Ctor } = await import(cacheBustedComponentPath);
  const elm = createElement(determineTagName(cacheBustedComponentPath, document.location.origin), {
    is: Ctor,
  });
  for (const [key, val] of Object.entries(props)) {
    elm[key] = val;
  }
  parentEl.appendChild(elm);
  return elm;
}

export async function wireMockUtil(mockController, exportName) {
  await mockController(`
    import { createTestWireAdapter } from '${newFileUrl}'; 
    export const ${exportName} = createTestWireAdapter();
`);
}

export async function setHooks(componentPath, updatedHooks) {
  await setHookCSR(updatedHooks);
  await ssr.setHookSSR(componentPath, updatedHooks);
}
