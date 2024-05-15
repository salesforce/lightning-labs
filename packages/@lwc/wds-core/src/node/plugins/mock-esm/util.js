import { stringify as qsStringify } from 'node:querystring';
import { UNMOCKED_ANNOTATION } from './const.js';

export const withoutDefault = (strings) => strings.filter((el) => el !== 'default');
export const hasDefault = (strings) => strings.includes('default');

export function getUnmockedUri(absoluteUrl, queryParams) {
  const newParams = {
    ...queryParams,
    [UNMOCKED_ANNOTATION]: '1',
  };
  return `${absoluteUrl}?${qsStringify(newParams)}`;
}

export function splitFirst(str, separator) {
  const [first, ...rest] = str.split(separator);
  return rest.length ? [first, rest.join(separator)] : [first];
}

export function getQueryString(url) {
  const [, newQueryStr] = splitFirst(url, '?');
  return newQueryStr ? `?${newQueryStr}` : '';
}

export function borrowQueryString(urlWithQueryStr, urlNeedsQueryStr) {
  if (urlNeedsQueryStr.includes('?')) {
    // The query string is already included in the URL; it need not be added.
    return urlNeedsQueryStr;
  }
  return `${urlNeedsQueryStr}${getQueryString(urlWithQueryStr)}`;
}

export const withoutQs = (url) => splitFirst(url, '?')[0];
export const onlyQs = (url) => splitFirst(url, '?')[1];
