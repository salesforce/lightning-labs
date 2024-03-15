import { getRequestFilePath } from '@web/dev-server-core';

const REPLACEMENTS = [
  {
    pathPattern: /\/engine-dom\/dist\/index\.js$/,
    searchValue: 'export { LightningElement,',
    replaceValue: 'export { LightningElement, hasMismatch,',
  },
];

export default ({ rootDir }) => ({
  name: 'lwc-patch',

  transform(context) {
    const filePath = getRequestFilePath(context.url, rootDir);

    const body = REPLACEMENTS.filter(({ pathPattern }) => pathPattern.test(filePath)).reduce(
      (newBody, { searchValue, replaceValue }) => newBody.replace(searchValue, replaceValue),
      context.body,
    );

    return { body };
  },
});
