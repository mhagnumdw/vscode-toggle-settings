import * as vscode from 'vscode';
import { ExtensionManager } from './ExtensionManager';

// TODO: if there are `property` with the same name:
// - Add a warning using vscode.window.showWarningMessage
// - Only the first one should be considered

export function activate(context: vscode.ExtensionContext) {
  ExtensionManager.initialize(context);
}

export function deactivate() {
  console.log('Deactivating extension...');
}
