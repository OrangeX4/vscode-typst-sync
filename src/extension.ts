import { commands, ExtensionContext } from 'vscode';
import {
  getLocalPackagesList,
  getPreviewPackagesList,
  importPackage,
  createLocalPackage,
  openLocalPackage
} from './packageManage';
import { pullRepo, pushRepo } from './gitSync';

export function activate(context: ExtensionContext) {

  // Import a package
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.importPackage', async () => {
    const localPackagesList = (await getLocalPackagesList()).map(pkg => pkg.package);
    const previewPackagesList = (await getPreviewPackagesList())?.map(pkg => pkg.package);
    const packagesList = previewPackagesList ? localPackagesList.concat(previewPackagesList) : localPackagesList;
    importPackage(packagesList);
  }));

  // Import a local package
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.importLocalPackage', async () => {
    const localPackagesList = (await getLocalPackagesList()).map(pkg => pkg.package);
    importPackage(localPackagesList);
  }));

  // Create a new typst local package
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.createLocalPackage', async () => {
    await createLocalPackage();
  }));

  // Open a typst local package
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.openLocalPackage', async () => {
    await openLocalPackage();
  }));

  // Push syncRepo
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.pushSyncRepo', async () => {
    await pushRepo();
  }));

  // Pull syncRepo
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.pullSyncRepo', async () => {
    await pullRepo();
  }));

  // Sync syncRepo
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.typstSync', async () => {
    await pushRepo();
  }));
}