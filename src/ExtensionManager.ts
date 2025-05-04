import * as vscode from 'vscode';

/**
 * According to the `contributes.configuration.properties["easy-toggle-settings.` in package.json
 */
export const EXTENSION_NAME = 'easy-toggle-settings';

const ENABLED_PROPERTY = `${EXTENSION_NAME}.enabled`;
const ITEMS_PROPERTY = `${EXTENSION_NAME}.items`;

/**
 * Represents a toggle setting in the extension.
 */
export interface ToggleSetting {
  /** The vscode property to toggle */
  property: string;
  /** The values to cycle through */
  values: any[];
  /** The icon to display in the status bar */
  icon: string;
}

/**
 * Represents a disposable object we need to manage.
 */
type DisposableLike = vscode.Disposable | vscode.StatusBarItem;

export class ExtensionManager {

  private static instance: ExtensionManager;

  private context: vscode.ExtensionContext;
  private enabled: boolean;

  /**
   * Items displayed in the status bar.
   *
   * @remarks
   * - The map key is the command ID
   * - The value contains ToggleSetting and disposables associated with each status bar item
   */
  private statusBarItems: Map<string, {item: ToggleSetting, disposables: DisposableLike[] }> = new Map();

  private itemsChangeSubscription?: vscode.Disposable;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.enabled = this.getEnabledFromConfig();

    if (this.enabled) {
      this.activate();
    }

    // monitor the enabled property
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(ENABLED_PROPERTY)) {
        const newValue = this.getEnabledFromConfig();
        if (this.enabled !== newValue) {
          this.toggleExtension(newValue);
        }
      };
    }));
  }

  static initialize(context: vscode.ExtensionContext): ExtensionManager {
    if (!ExtensionManager.instance) {
      ExtensionManager.instance = new ExtensionManager(context);
    }
    return ExtensionManager.instance;
  }

  static getInstance(): ExtensionManager {
    return ExtensionManager.instance;
  }

  public toggleExtension(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.activate();
      vscode.window.showInformationMessage(`Extension ${EXTENSION_NAME} is enabled.`);
    } else {
      this.deactivate();
      vscode.window.showInformationMessage(`Extension ${EXTENSION_NAME} is disabled.`);
    }
  }

  private activate() {
    this.createAllStatusBarItems();

    this.itemsChangeSubscription = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(ITEMS_PROPERTY)) {
        this.createAllStatusBarItems();
      }
    });
    this.context.subscriptions.push(this.itemsChangeSubscription);
  }

  private deactivate() {
    this.itemsChangeSubscription?.dispose();
    this.removeAllStatusBarItems();
  }

  private getEnabledFromConfig(): boolean {
    return vscode.workspace.getConfiguration().get(ENABLED_PROPERTY, true);
  }

  private createAllStatusBarItems(): void {
    this.removeAllStatusBarItems();

    const duplicateProperties: string[] = [];

    this.getAllToggles().forEach(toggle => {
      if (!this.exists(toggle.property)) {
        const item = this.createStatusBarItem(toggle);
        this.updateStatusBarItem(toggle, item);
      } else {
        duplicateProperties.push(toggle.property);
      }
    });

    if (duplicateProperties.length > 0) {
      const msg = duplicateProperties.join('; ');
      vscode.window.showWarningMessage(`The following properties are duplicated: ${msg}. Only the first occurrence of each will be considered.`);
    }
  }

  private removeAllStatusBarItems() {
    for (const key of Array.from(this.statusBarItems.keys())) {
      this.removeStatusBarItem(key);
    }
  }

  private removeStatusBarItem(commandId: string) {
    const disposables = this.statusBarItems.get(commandId)?.disposables;
    if (disposables) {
      disposables.forEach(d => d.dispose());
      this.statusBarItems.delete(commandId);
    }
  }

  private getAllToggles(): ToggleSetting[] {
    return vscode.workspace.getConfiguration().get(ITEMS_PROPERTY) || [];
  }

  private createStatusBarItem(setting: ToggleSetting): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = ExtensionManager.getCommandId(setting.property);

    const command = vscode.commands
      .registerCommand(statusBarItem.command, () => this.cycleSetting(setting, statusBarItem));
    this.context.subscriptions.push(command);

    this.statusBarItems.set(statusBarItem.command, {item: setting, disposables: [ statusBarItem, command ]});
    return statusBarItem;
  }

  /**
   * Build the command ID for the toggle setting.
   */
  public static getCommandId(toggleProperty: string): string {
    return `${EXTENSION_NAME}.${toggleProperty}`;
  }

  /**
   * Cycle through the values of the toggle setting and update the status bar item.
   */
  private cycleSetting(setting: ToggleSetting, item: vscode.StatusBarItem) {
    const config = vscode.workspace.getConfiguration();
    const currentValue = config.get(setting.property);
    const currentIndex = setting.values.indexOf(currentValue);
    const newValue = setting.values[(currentIndex + 1) % setting.values.length];

    config.update(setting.property, newValue, vscode.ConfigurationTarget.Global).then(() => {
      this.updateStatusBarItem(setting, item);
    }, (err) => {
      const msg = `Failed to update setting ${setting.property}: ${err}`;
      console.error(msg, err);
      vscode.window.showErrorMessage(msg);
    });
  }

  private updateStatusBarItem(setting: ToggleSetting, item: vscode.StatusBarItem) {
    const config = vscode.workspace.getConfiguration();
    const value = config.get(setting.property);
    item.text = `$(${setting.icon})`;
    item.tooltip = `${setting.property}: ${value}`;
    item.show();
  }

  get totalStatusBarItems(): number {
    return this.statusBarItems.size;
  }

  get allStatusBarItems(): ToggleSetting[] {
    return Array.from(this.statusBarItems.values()).map(i => i.item);
  }

  private exists(property: string): boolean {
    const commandId = ExtensionManager.getCommandId(property);
    return this.statusBarItems.has(commandId);
  }

}
