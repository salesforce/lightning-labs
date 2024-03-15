import { createElement } from 'lwc';
import PlaygroundApp from 'pg/playground';

export default async (componentPath, componentMetadata) => {
  const elm = createElement('pg-playground', { is: PlaygroundApp });
  elm.componentPath = componentPath;
  elm.componentMetadata = componentMetadata;
  document.body.appendChild(elm);
};
