import * as vscode from 'vscode';
import * as assert from 'assert';
import { EXTENSION_NAME, ExtensionManager, ToggleSetting } from '../ExtensionManager';
import * as sinon from 'sinon';

suite('Extension Test Suite', () => {

  let extension: TestExtensionManager;

  suiteSetup(async () => {
    extension = new TestExtensionManager();
    vscode.window.showInformationMessage('Start all tests.');
  });

  setup(async () => {
    await extension.clearAllTogglesFromConf();
  });

  teardown(() => {
    // https://sinonjs.org/releases/latest/sandbox/#default-sandbox
    sinon.restore(); // cleanup, restore any mock, spy etc
  });

  test('Extension activation', () => {
    const extension = vscode.extensions.getExtension('mhagnumdw.vscode-toggle-settings');
    assert.ok(extension, 'Extension should be defined');
    assert.strictEqual(extension?.isActive, true, 'Extension should be active');
  });

  test('Toggles should be empty at start', () => {
    const items = extension.getAllTogglesFromConf();
    assert.strictEqual(items.length, 0, 'Settings should be empty');
  });

  test('Add toggle to status bar and rotate them', async () => {
    await extension.addToggle('editor.renderWhitespace', 'whitespace', ["none", "all"]);

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValueFromConf('editor.renderWhitespace'), 'none');

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValueFromConf('editor.renderWhitespace'), 'all');

    await extension.click('editor.renderWhitespace');
    assert.strictEqual(extension.getValueFromConf('editor.renderWhitespace'), 'none');
  });

  test('Add two toggles and remove one', async () => {
    await extension.addToggle('editor.renderWhitespace', 'whitespace', ["none", "all"]);
    await extension.addToggle('editor.cursorStyle', 'cursor', ["line", "block"]);

    let items = extension.getAllTogglesFromConf();
    assert.strictEqual(items.length, 2, 'There should be two settings');
    assert.strictEqual(items[0].property, 'editor.renderWhitespace', 'First setting should match');
    assert.strictEqual(items[1].property, 'editor.cursorStyle', 'Second setting should match');

    items.shift(); // Remove the first toggle
    await extension.setToggles(items);

    items = extension.getAllTogglesFromConf();
    assert.strictEqual(items.length, 1, 'There should be one setting left');
    assert.strictEqual(items[0].property, 'editor.cursorStyle', 'Remaining setting should match');
  });

  test('Disable extension', async () => {
    await extension.addToggle('editor.renderWhitespace', 'whitespace', ["none", "all"]);
    await extension.addToggle('editor.cursorStyle', 'cursor', ["line", "block"]);
    assert.strictEqual(ExtensionManager.getInstance().totalStatusBarItems, 2, 'There should be two status bar items');

    const showInformationMessageSpy = sinon.spy(vscode.window, 'showInformationMessage');

    await extension.disableExtension();
    assert.strictEqual(ExtensionManager.getInstance().totalStatusBarItems, 0, 'Settings should be empty after disabling');
    sinon.assert.calledWith(showInformationMessageSpy, 'Extension vscode-toggle-settings is disabled.');
  });

  test('Enable extension', async () => {
    await extension.addToggle('editor.renderWhitespace', 'whitespace', ["none", "all"]);
    await extension.addToggle('editor.cursorStyle', 'cursor', ["line", "block"]);
    await extension.disableExtension();
    assert.strictEqual(ExtensionManager.getInstance().totalStatusBarItems, 0, 'Settings should be empty after disabling');

    const showInformationMessageSpy = sinon.spy(vscode.window, 'showInformationMessage');

    await extension.enableExtension();
    assert.strictEqual(ExtensionManager.getInstance().totalStatusBarItems, 2, 'There should be two status bar items after enabling');
    sinon.assert.calledWith(showInformationMessageSpy, 'Extension vscode-toggle-settings is enabled.');
  });

  test('cycleSetting: error on update property value', async () => {
    await extension.addToggle('editor.renderWhitespace', 'whitespace', ["none", "all"]);

    const getConfigurationFake = { // is not possible to stub vscode.WorkspaceConfiguration.update
      get: sinon.stub().returns('none'), // Simulate next value
      update: sinon.stub().rejects(new Error('Simulated error')) // Stub to update
    };
    sinon.stub(vscode.workspace, 'getConfiguration').returns(getConfigurationFake as any);
    const showErrorMessageSpy = sinon.spy(vscode.window, 'showErrorMessage');
    // TODO: I couldn't mock the console.error with sinon, try again later

    await extension.click('editor.renderWhitespace', false);

    sinon.assert.calledWith(showErrorMessageSpy, 'Failed to update setting editor.renderWhitespace: Error: Simulated error');
  });

});

/**
 * Class to manage the extension settings and simulate user actions.
 */
class TestExtensionManager {

  /** Simulate the user adding a toggle */
  async addToggle(property: string, icon: string, values: any[]) {
    const items: ToggleSetting[] = this.config.get('items') || [];
    items.push({ property, icon, values });
    await this.config.update('items', items, vscode.ConfigurationTarget.Global);
  }

  /** Simulate the user updating all toggles */
  async setToggles(items: ToggleSetting[]) {
    await this.config.update('items', items, vscode.ConfigurationTarget.Global);
  }

  /** Simulate the user disabling the extension */
  async disableExtension() {
    await this.config.update('enabled', false, vscode.ConfigurationTarget.Global);
  }

  /** Simulate the user enabling the extension */
  async enableExtension() {
    await this.config.update('enabled', true, vscode.ConfigurationTarget.Global);
  }

  /** Simulate the user clicking the status bar item */
  async click(property: string, wait = true) {
    const commandId = ExtensionManager.getCommandId(property);
    await vscode.commands.executeCommand(commandId);
    wait && await waitForConfigChange(property);
  }

  /** Get the value of a property from the configuration */
  getValueFromConf(property: string): unknown {
    return vscode.workspace.getConfiguration().get(property);
  }

  /** Get the all status bar items */
  getAllTogglesFromConf(): ToggleSetting[] {
    return this.config.get('items') as ToggleSetting[];
  }

  /** Clear all extension settings */
  async clearAllTogglesFromConf() {
    // TODO: how to clear `EXTENSION_NAME` property all at once instead of one by one?
    await this.config.update('items', undefined, vscode.ConfigurationTarget.Global);
    await this.config.update('enabled', undefined, vscode.ConfigurationTarget.Global);
  }

  /** Get the configuration for the extension */
  get config() {
    return vscode.workspace.getConfiguration(EXTENSION_NAME);
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
