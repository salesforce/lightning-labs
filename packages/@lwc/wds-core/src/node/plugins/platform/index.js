import i18n from './i18n.js';
import virtModules from './virt-modules.js';

export default function platform(options) {
  const { locale, rootDir } = options;

  return [i18n({ locale, rootDir }), virtModules()];
}
