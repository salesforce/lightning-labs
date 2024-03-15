export default (replacements) => {
  return {
    name: 'alias',
    resolveImport({ source }) {
      const resolved = replacements.reduce((memo, [from, to]) => memo.replace(from, to), source);
      return source !== resolved ? resolved : undefined;
    },
  };
};
