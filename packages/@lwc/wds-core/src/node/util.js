import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export const cwd = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const toolkitSrcPath = path.resolve(__dirname, '..');

function getCommonRootPath(strPathA, strPathB) {
  const pathA = strPathA.split(path.sep);
  const pathB = strPathB.split(path.sep);
  const [longer, shorter] = pathA.length > pathB.length ? [pathA, pathB] : [pathB, pathA];
  const common = [];

  for (const pathSegment of shorter) {
    if (pathSegment !== longer.shift()) {
      break;
    }
    common.push(pathSegment);
  }

  return common.join(path.sep);
}

export function getRootDir(paths) {
  let commonRootPath = paths[0];
  for (const strPath of paths.slice(1)) {
    commonRootPath = getCommonRootPath(commonRootPath, strPath);
  }
  return commonRootPath;
}

function loadJson(jsonPath) {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    return null;
  }
}

export function getLwcConfig(dirPath) {
  const lwcConfigPath = path.join(dirPath, 'lwc.config.json');
  const localPkgJsonPath = path.join(dirPath, 'lwc.config.json');

  if (fs.existsSync(lwcConfigPath)) {
    try {
      return loadJson(lwcConfigPath);
    } finally {
    }
  }

  if (fs.existsSync(localPkgJsonPath)) {
    try {
      return loadJson(localPkgJsonPath).lwc;
    } finally {
    }
  }

  return null;
}
