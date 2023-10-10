/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { commands, ExtensionContext } from 'vscode';
import {
  getLocalPackagesList,
  getPreviewPackagesList,
  importPackage,
  createLocalPackage,
  openLocalPackage
} from './packageManage';

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
}