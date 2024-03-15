const tdStrict = new TextDecoder('utf8', {
  fatal: true,
});
const tdPermissive = new TextDecoder('utf8', {
  fatal: false,
});

export default () => ({
  name: 'repair-utf8',
  transform(cxt) {
    if (typeof cxt.body === 'string') {
      // The source file is valid UTF8 and is safe to modify.
      return;
    }
    if (!cxt.response.is('application/javascript')) {
      // Only repair JavaScript or TypeScript source files.
      return;
    }
    if (!(cxt.body instanceof Buffer)) {
      throw new Error(`Unable to repair source file for request: ${cxt.request.url}`);
    }

    try {
      return tdStrict.decode(cxt.body);
    } catch (err) {
      console.warn(`Source file is not valid UTF-8 for request: ${cxt.request.url}`);
    }
    return tdPermissive.decode(cxt.body);
  },
});
