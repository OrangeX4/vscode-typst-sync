import { window, workspace } from 'vscode';
import * as fs from 'fs';
const fetch = require('node-fetch');

// https://github.com/typst/packages#local-packages
export function getDataDir() {
  const dataDirMap = {
    linux: process.env.XDG_DATA_HOME || `${process.env.HOME}/.local/share`,
    darwin: `${process.env.HOME}/Library/Application Support`,
    win32: process.env.APPDATA,
  };
  // read dataDir from settings
  let dataDir = null as string | null | undefined;
  if (workspace.getConfiguration().has('vscode-typst-sync.dataDir')) {
    dataDir = workspace.getConfiguration().get('vscode-typst-sync.dataDir');
  }
  // if dataDir is not set, use default dataDir
  if (!dataDir) {
    dataDir = dataDirMap[process.platform as keyof typeof dataDirMap];
  }
  return dataDir;
}

export function getPackagesDir() {
  const dataDir = getDataDir();
  return dataDir ? `${dataDir}/typst/packages` : null;
}

export function getLocalPackagesDir() {
  const packagesDir = getPackagesDir();
  return packagesDir ? `${packagesDir}/local` : null;
}
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
  const result = Object.keys(packagesMap).map(name => {
    return {
      package: `@preview/${name}:${packagesMap[name]}`,
      namespace: 'preview',
      name: name,
      version: packagesMap[name],
    };
  });
  return result;
}

/**
 * get local packages list
 */
export async function getLocalPackagesList() {
  const localPackagesDir = getLocalPackagesDir();
  // return list of local packages like ['@local/mypkg:1.0.0']
  if (!localPackagesDir) {
    return [];
  }
  // if localPackagesDir doesn't exist, return []
  try {
    await fs.promises.access(localPackagesDir);
  } catch (err) {
    return [];
  }
  const localPackagesList = await fs.promises.readdir(localPackagesDir);
  // get all version
  const res = [] as {
    package: string,
    namespace: string,
    name: string,
    version: string,
  }[];
  for (const localPackage of localPackagesList) {
    // filter versions only valid version like '0.1.0'
    const versions = (await fs.promises.readdir(`${localPackagesDir}/${localPackage}`)).filter(version => {
      const versionReg = /^\d+\.\d+\.\d+$/;
      return versionReg.test(version);
    });
    // sort versions like ['1.0.0', '0.2.0', '0.1.0', '0.0.2', '0.0.1']
    versions.sort(versionCompare);
    for (const version of versions) {
      res.push({
        package: `@local/${localPackage}:${version}`,
        namespace: 'local',
        name: localPackage,
        version,
      });
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
  const localPackagesDir = getLocalPackagesDir();
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

/**
 * open local package in editor
 */
export async function openLocalPackage() {
  const localPackagesDir = getLocalPackagesDir();
  if (!localPackagesDir) {
    window.showErrorMessage(dataDirErrorMessage);
    return;
  }
  // 1. select local package
  const localPackagesList = await getLocalPackagesList();
  const localPackages = localPackagesList.map(pkg => pkg.package);
  const selected = await window.showQuickPick(localPackages, {
    placeHolder: 'Please select a local package to open'
  });
  if (!selected) {
    return;
  }
  // 2. read localPackagesDir/name/version/typst.toml
  const name = localPackagesList.filter(pkg => pkg.package === selected)[0].name;
  const version = localPackagesList.filter(pkg => pkg.package === selected)[0].version;
  const packageDir = `${localPackagesDir}/${name}/${version}`;
  // if typst.toml doesn't exist, return
  try {
    await fs.promises.access(`${packageDir}/typst.toml`);
  } catch (err) {
    window.showErrorMessage('Can not find typst.toml.');
    return;
  }
  const typstToml = await fs.readFileSync(`${packageDir}/typst.toml`, 'utf-8');
  // parse typst.toml
  const entrypoint = typstToml.match(/entrypoint\s*=\s*"(.*)"/)?.[1];
  if (!entrypoint) {
    // open typst.toml if entrypoint is not set
    const document = await workspace.openTextDocument(`${packageDir}/typst.toml`);
    await window.showTextDocument(document);
    return;
  }
  // 3. open localPackagesDir/name/version/entrypoint
  const document = await workspace.openTextDocument(`${packageDir}/${entrypoint}`);
  await window.showTextDocument(document);
}