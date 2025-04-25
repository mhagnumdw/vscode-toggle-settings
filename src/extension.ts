import * as vscode from 'vscode';
import { ExtensionManager } from './ExtensionManager';

export function activate(context: vscode.ExtensionContext) {
  ExtensionManager.initialize(context);
}

export function deactivate() {
  console.log('Deactivating extension...');
}
