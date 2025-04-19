import * as vscode from 'vscode';

/**
 * Represents a toggle setting in the extension.
 */
export interface ToggleSetting {
  property: string;
  icon: string;
  values: any[];
}

interface Disposable {
  statusBarItem: vscode.StatusBarItem;
  command: vscode.Disposable;
}

/**
 * According to the `contributes.configuration.properties["toggleSettings.` in package.json
 */
export const GROUP_NAME = 'toggleSettings'; // TODO: rename this property in package.json?

const statusBarItems: Map<string, Disposable> = new Map();

export function activate(context: vscode.ExtensionContext) {
  const settings = getExtensionSettings();

  // TODO: if there are `property` with the same name:
  // - Add a warning using vscode.window.showWarningMessage
  // - Only the last one should be considered

  createAllStatusBarItems(settings, context);

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration(GROUP_NAME)) {
      const newSettings = getExtensionSettings();
      createAllStatusBarItems(newSettings, context);
    }
  }));
}

function createAllStatusBarItems(settings: ToggleSetting[], context: vscode.ExtensionContext) {
  removeAllStatusBarItems();
  settings.forEach(setting => {
    const item = createStatusBarItem(setting, context);
    updateStatusBarItem(setting, item);
  });
}

function createStatusBarItem(setting: ToggleSetting, context: vscode.ExtensionContext): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = getCommandId(setting);

  const command = vscode.commands.registerCommand(statusBarItem.command, () => cycleSetting(setting, statusBarItem));
  context.subscriptions.push(command);

  statusBarItems.set(statusBarItem.command, { statusBarItem, command });
  return statusBarItem;
}

function removeStatusBarItem(commandId: string) {
  const item = statusBarItems.get(commandId);
  if (item) {
    item.statusBarItem.dispose();
    item.command.dispose();
    statusBarItems.delete(commandId);
  }
}

function removeAllStatusBarItems() {
  for (const key of Array.from(statusBarItems.keys())) {
    removeStatusBarItem(key);
  }
}

function getCommandId(setting: ToggleSetting): string {
  return `${GROUP_NAME}.${setting.property}`;
}

function cycleSetting(setting: ToggleSetting, item: vscode.StatusBarItem) {
  const config = vscode.workspace.getConfiguration();
  const currentValue = config.get(setting.property);
  const currentIndex = setting.values.indexOf(currentValue);
  const newValue = setting.values[(currentIndex + 1) % setting.values.length];

  config.update(setting.property, newValue, vscode.ConfigurationTarget.Global).then(() => {
    updateStatusBarItem(setting, item);
  }, (err) => {
    const msg = `Failed to update setting ${setting.property}: ${err}`;
    console.error(msg, err);
    vscode.window.showErrorMessage(msg);
  });
}

function updateStatusBarItem(setting: ToggleSetting, item: vscode.StatusBarItem) {
  const config = vscode.workspace.getConfiguration();
  const value = config.get(setting.property);
  item.text = `$(${setting.icon})`;
  item.tooltip = `${setting.property}: ${value}`;
  item.show();
}

function getExtensionSettings(): ToggleSetting[] {
  return vscode.workspace.getConfiguration(GROUP_NAME).get('items') || [];
}

export function deactivate() {
  console.log('Deactivating extension...');
}
