import { window, workspace } from 'vscode';
import * as fs from 'fs';
const fetch = require('node-fetch');

// https://github.com/typst/packages#local-packages
const dataDirMap = {
  linux: process.env.XDG_DATA_HOME || `${process.env.HOME}/.local/share`,
  darwin: `${process.env.HOME}/Library/Application Support`,
  win32: process.env.APPDATA,
};
// read dataDir from settings
let dataDir = null as string | null | undefined;
if (workspace.getConfiguration().has('typst.dataDir')) {
  dataDir = workspace.getConfiguration().get('typst.dataDir');
}
// if dataDir is not set, use default dataDir
if (!dataDir) {
  dataDir = dataDirMap[process.platform as keyof typeof dataDirMap];
}
const packagesDir = dataDir ? `${dataDir}/typst/packages` : null;
const localPackagesDir = packagesDir ? `${packagesDir}/local` : null;
// error message
const dataDirErrorMessage = 'Can not find dataDir, please make sure you have configured dataDir.';

// typst.toml template
const typstTomlTemplate = (name: string, version: string, entrypoint: string) => {
  return `[package]\nname = "${name}"\nversion = "${version}"\nentrypoint = "${entrypoint}"`;
};

// versionCompare
function versionCompare(a: string, b: string) {
  const aArr = a.split('.');
  const bArr = b.split('.');
  for (let i = 0; i < 3; i++) {
    const aNum = Number(aArr[i]);
    const bNum = Number(bArr[i]);
    if (aNum !== bNum) {
      return bNum - aNum;
    }
  }
  return 0;
}

/**
 * get preview packages list from https://packages.typst.org/preview/index.json
 * [
*    {
*        "name": "acrostiche",
*        "version": "0.1.0",
*        "entrypoint": "acrostiche.typ",
*        "authors": [
*            "Grizzly"
*        ],
*        "license": "MIT",
*        "description": "Manage acronyms and their definitions in Typst."
*    },
*    ...
*  ]
 */
export async function getPreviewPackagesList() {
  let res: any;
  await window.withProgress({
    location: { viewId: 'typst' },
    title: 'Typst Sync',
    cancellable: false
  }, async (progress, token) => {
    progress.report({ message: 'Getting preview packages list...' });
    res = await fetch('https://packages.typst.org/preview/index.json');
  });
  if (!res || !res.ok) {
    window.showErrorMessage('Can not get preview packages list, please try again later.');
    return;
  }
  const json = await res.json() as {
    name: string;
    version: string;
    entrypoint: string;
  }[];
  // filter packages only newest version
  const packagesMap = {} as { [name: string]: string };
  for (const item of json) {
    const { name, version } = item;
    if (!packagesMap[name]) {
      packagesMap[name] = version;
    } else {
      const oldVersion = packagesMap[name];
      if (oldVersion && versionCompare(version, oldVersion) > 0) {
        packagesMap[name] = version;
      }
    }
  }
  // return list of preview packages like ['@preview/acrostiche:0.1.0', ...]
  const result = Object.keys(packagesMap).map(name => `@preview/${name}:${packagesMap[name]}`).sort();
  return result;
}

/**
 * get local packages list
 */
export async function getLocalPackagesList() {
  // return list of local packages like ['@local/mypkg:1.0.0']
  if (!localPackagesDir) {
    return [];
  }
  const localPackagesList = await fs.promises.readdir(localPackagesDir);
  // get all version
  const res = [];
  for (const localPackage of localPackagesList) {
    const versions = await fs.promises.readdir(`${localPackagesDir}/${localPackage}`);
    // sort versions like ['1.0.0', '0.2.0', '0.1.0', '0.0.2', '0.0.1']
    versions.sort(versionCompare);
    for (const version of versions) {
      res.push(`@local/${localPackage}:${version}`);
    }
  }
  return res;
}

/**
 * import package
 */
export async function importPackage(packagesList: string[]) {
  // show quick pick
  const selected = await window.showQuickPick(packagesList, {
    placeHolder: 'Please select a package to import'
  });
  if (!selected) {
    return;
  }
  // insert text `#import "@local/mypkg:1.0.0": *`
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  const position = editor.selection.active;
  editor.edit(editBuilder => {
    editBuilder.insert(position, `#import "${selected}": *`);
  });
}

/**
 * create local package
 */
export async function createLocalPackage() {
  if (!localPackagesDir) {
    window.showErrorMessage(dataDirErrorMessage);
    return;
  }
  // 1. input package name
  const packageName = await window.showInputBox({
    value: '',
    placeHolder: 'Please input package name',
    validateInput: text => {
      return text ? null : 'Please input package name';
    }
  });
  if (!packageName) {
    return;
  }
  // 2. input package version
  const packageVersion = await window.showInputBox({
    value: '0.1.0',
    placeHolder: 'Please input package version',
    validateInput: text => {
      if (!text) {
        return 'Please input package version';
      }
      // make sure it is valid version like '0.1.0'
      const versionReg = /^\d+\.\d+\.\d+$/;
      if (!versionReg.test(text)) {
        return 'Please input valid package version like 0.1.0';
      }
      return null;
    }
  });
  if (!packageVersion) {
    return;
  }
  // 3. input entrypoint
  const entrypoint = await window.showInputBox({
    value: 'lib.typ',
    placeHolder: 'Please input entrypoint',
    validateInput: text => {
      if (!text) {
        return 'Please input entrypoint';
      }
      // make sure it is valid entrypoint end with .typ
      if (!text.endsWith('.typ')) {
        return 'Please input valid entrypoint end with .typ';
      }
      return null;
    }
  });
  if (!entrypoint) {
    return;
  }
  // 4. create localPackagesDir/name/version/typst.toml
  const packageDir = `${localPackagesDir}/${packageName}/${packageVersion}`;
  const typstToml = typstTomlTemplate(packageName, packageVersion, entrypoint);
  await fs.promises.mkdir(packageDir, { recursive: true });
  await fs.promises.writeFile(`${packageDir}/typst.toml`, typstToml);
  // 5. create localPackagesDir/name/version/entrypoint
  await fs.promises.writeFile(`${packageDir}/${entrypoint}`, '= Hello Typst');
  // 6. open localPackagesDir/name/version/entrypoint
  const document = await workspace.openTextDocument(`${packageDir}/${entrypoint}`);
  await window.showTextDocument(document);
}