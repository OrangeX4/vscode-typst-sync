/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { commands, ExtensionContext } from 'vscode';
import { createLocalPackage, getLocalPackagesList, getPreviewPackagesList, importPackage } from './packageManage';

export function activate(context: ExtensionContext) {

  // Create a new typst local package
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.createLocalPackage', async () => {
    await createLocalPackage();
  }));

  // Import a package
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.importPackage', async () => {
    const localPackagesList = await getLocalPackagesList();
    const previewPackagesList = await getPreviewPackagesList();
    const packagesList = previewPackagesList ? localPackagesList.concat(previewPackagesList) : localPackagesList;
    importPackage(packagesList);
  }));

  // Import a local package
  context.subscriptions.push(commands.registerCommand('vscode-typst-sync.importLocalPackage', async () => {
    const localPackagesList = await getLocalPackagesList();
    importPackage(localPackagesList);
  }));
}