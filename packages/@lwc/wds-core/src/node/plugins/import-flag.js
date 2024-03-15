import * as querystring from 'node:querystring';

export default () => {
  return {
    name: 'import-flags',
    transformImport({ source, context }) {
      const [importStr, sourceParamStr] = source.split('?') ?? '';
      const [, contextParamStr] = context.url.split('?') ?? '';

      const sourceParams = querystring.parse(sourceParamStr);
      const contextParams = querystring.parse(contextParamStr);
      const mergedParams = {
        ...contextParams,
        ...sourceParams,
      };
      const mergedParamStr = querystring.stringify(mergedParams);

      return mergedParamStr ? `${importStr}?${mergedParamStr}` : importStr;
    },
  };
};
