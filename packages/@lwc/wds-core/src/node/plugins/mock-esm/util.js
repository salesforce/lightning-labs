import { stringify as qsStringify } from 'node:querystring';

export const withoutDefault = (strings) => strings.filter((el) => el !== 'default');
export const hasDefault = (strings) => strings.includes('default');

export function getUnmockedUri(absoluteUrl, queryParams) {
  const newParams = {
    ...queryParams,
    [UNMOCKED_ANNOTATION]: '1',
  };
  return `${absoluteUrl}?${qsStringify(newParams)}`;
}
