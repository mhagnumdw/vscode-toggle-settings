import * as vscode from 'vscode';
import * as assert from 'assert';
import { GROUP_NAME, ToggleSetting } from '../extension';

suite('Extension Test Suite', () => {

  let extension: ExtensionManager;

  suiteSetup(async () => {
    extension = new ExtensionManager();
    vscode.window.showInformationMessage('Start all tests.');
  });

  setup(async () => {
    await extension.clearAllToggles();
  });

  test('Extension activation', () => {
    const extension = vscode.extensions.getExtension('mhagnumdw.vscode-toggle-settings');
    assert.ok(extension, 'Extension should be defined');
    assert.strictEqual(extension?.isActive, true, 'Extension should be active');
  });

  test('Settings should be empty at start', () => {
    const items = extension.getAllToggles();
    assert.strictEqual(items.length, 0, 'Settings should be empty');
  });

  test('Add settings to status bar and rotate them', async () => {
    await extension.addToggle('editor.renderWhitespace', 'whitespace', ["none", "all"]);

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValue('editor.renderWhitespace'), 'none');

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValue('editor.renderWhitespace'), 'all');

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValue('editor.renderWhitespace'), 'none');
  });

  test('Add two settings, verify, remove one, and verify again', async () => {
    // Add two items
    await extension.addToggle('editor.renderWhitespace', 'whitespace', ["none", "all"]);
    await extension.addToggle('editor.cursorStyle', 'cursor', ["line", "block"]);

    // Verify both items are present
    let items = extension.getAllToggles();
    assert.strictEqual(items.length, 2, 'There should be two settings');
    assert.strictEqual(items[0].property, 'editor.renderWhitespace', 'First setting should match');
    assert.strictEqual(items[1].property, 'editor.cursorStyle', 'Second setting should match');

    // Remove the first setting
    items.shift();
    await extension.setToggles(items);

    // Verify only the second setting remains
    items = extension.getAllToggles();
    assert.strictEqual(items.length, 1, 'There should be one setting left');
    assert.strictEqual(items[0].property, 'editor.cursorStyle', 'Remaining setting should match');
  });

});

/**
 * Class to manage the extension settings and simulate user actions.
 */
class ExtensionManager {

  /** Simulate the user adding a configuration */
  async addToggle(property: string, icon: string, values: any[]) {
    const items: ToggleSetting[] = this.config.get('items') || [];
    items.push({ property, icon, values });
    await this.config.update('items', items, vscode.ConfigurationTarget.Global);
  }

  /** Simulate the user updating a configuration */
  async setToggles(items: ToggleSetting[]) {
    await this.config.update('items', items, vscode.ConfigurationTarget.Global);
  }

  /** Simulate the user clicking the status bar item */
  async click(property: string) {
    await vscode.commands.executeCommand(GROUP_NAME + '.' + property);
    await waitForConfigChange(property);
  }

  /** Get the value of a property from the configuration */
  getValue(property: string): unknown {
    return vscode.workspace.getConfiguration().get(property);
  }

  /** Get the all status bar items */
  getAllToggles(): ToggleSetting[] {
    return this.config.get('items') as ToggleSetting[];
  }

  /** Clear all extension settings */
  async clearAllToggles() {
    await this.config.update('items', undefined, vscode.ConfigurationTarget.Global);
  }

  private get config() {
    return vscode.workspace.getConfiguration(GROUP_NAME);
  }
}

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

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
