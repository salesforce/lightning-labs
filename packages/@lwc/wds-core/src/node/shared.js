import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PLAYGROUND_UI_MODULES_DIR = path.resolve(__dirname, '../browser/ui/');
