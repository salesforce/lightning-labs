import { createElement, hasMismatch, hydrateComponent } from '@lwc/engine-dom';

import { determineTagName } from './shared.js';
import * as ssr from './ssr/index.js';

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
  parentEl.innerHTML = markup;
  attachShadowRoots(parentEl);
  return parentEl.firstChild;
}

export async function hydrateElement(el, componentPath, props = {}, cacheBust = false) {
  const cacheBustedComponentPath = cacheBust
    ? `${componentPath}?cacheBust=${Date.now()}`
    : componentPath;
  const { default: Ctor } = await import(cacheBustedComponentPath);

  hydrateComponent(el, Ctor, props);

  return !hasMismatch;
}

export async function clientSideRender(parentEl, componentPath, props = {}, cacheBust = false) {
  const cacheBustedComponentPath = cacheBust
    ? `${componentPath}?cacheBust=${Date.now()}`
    : componentPath;

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
