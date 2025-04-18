import * as vscode from 'vscode';
import * as assert from 'assert';
import { GROUP_NAME, ToggleSetting } from '../extension';

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Function to wait for a configuration change
const waitForConfigChange = (expectedKey: string): Promise<void> => {
  return new Promise((resolve) => {
    const disposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(expectedKey)) {
        disposable.dispose();
        resolve();
      }
    });
  });
};

suite('Extension Test Suite', () => {

  let extension: ExtensionManager;

  suiteSetup(async () => {
    extension = new ExtensionManager();

    vscode.window.showInformationMessage('Start all tests.');

    // TODO: in some cases throw an error: `Method not found: toJSON: CodeExpectedError: Method not found: toJSON`
    // Open global settings
    // await vscode.commands.executeCommand('workbench.action.openSettingsJson');
  });

  test('Extension activation', () => {
    const extension = vscode.extensions.getExtension('mhagnumdw.vscode-toggle-settings');
    assert.ok(extension, 'Extension should be defined');
    assert.strictEqual(extension?.isActive, true, 'Extension should be active');
  });

  test('Settings are empty', () => {
    const config = vscode.workspace.getConfiguration('toggleSettings');
    const items = config.get('items') as ToggleSetting[];
    assert.strictEqual(items.length, 0, 'Settings should be empty');
  });

  test('Add settings to status bar and rotate them', async () => {
    await extension.addSetting('editor.renderWhitespace', 'whitespace', ["none", "all"]);

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValue('editor.renderWhitespace'), 'none');

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValue('editor.renderWhitespace'), 'all');

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValue('editor.renderWhitespace'), 'none');
  });

});

class ExtensionManager {

  /** Simulate the user adding a configuration */
  async addSetting(property: string, icon: string, values: any[]) {
    const config = vscode.workspace.getConfiguration(GROUP_NAME);
    const items: ToggleSetting[] = config.get('items') || [];
    items.push({ property, icon, values });
    await vscode.workspace.getConfiguration(GROUP_NAME)
      .update('items', items, vscode.ConfigurationTarget.Global);
  }

  /** Simulate the user clicking the status bar button */
  async click(property: string) {
    await vscode.commands.executeCommand(GROUP_NAME + '.' + property);
    await waitForConfigChange(property);
  }

  /** Get the value of a property from the configuration */
  getValue(property: string) {
    return vscode.workspace.getConfiguration().get(property);
  }
}
