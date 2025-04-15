import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as assert from 'assert';
import * as myExtension from '../../extension';
suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  test('Extension activation', async () => {
    const extension = vscode.extensions.getExtension('your.extension.id');
    assert.ok(extension, 'Extension should be defined');
    await extension?.activate();
    assert.strictEqual(extension?.isActive, true, 'Extension should be active');
  });

  test('Status bar items creation', () => {
    const settings: myExtension.ToggleSetting[] = [
      { property: 'test.property1', icon: 'check', values: [true, false] },
      { property: 'test.property2', icon: 'gear', values: ['value1', 'value2'] },
    ];

    const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
    myExtension.activate(context);

    settings.forEach(setting => {
      const commandId = `toggleSettings.${setting.property}`;
      const statusBarItem = vscode.commands.getCommands(true).then(commands => commands.includes(commandId));
      assert.ok(statusBarItem, `Status bar item for ${setting.property} should exist`);
    });
  });

  test('Cycle setting updates configuration', async () => {
    const setting: myExtension.ToggleSetting = {
      property: 'test.property',
      icon: 'check',
      values: [true, false],
    };

    const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    await vscode.workspace.getConfiguration().update(setting.property, false, vscode.ConfigurationTarget.Global);
    myExtension['cycleSetting'](setting, statusBarItem);

    const updatedValue = vscode.workspace.getConfiguration().get(setting.property);
    assert.strictEqual(updatedValue, true, 'Setting should be updated to the next value');
  });

  test('Remove all status bar items', () => {
    const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
    myExtension.activate(context);

    myExtension['removeAllStatusBarItems']();
    assert.strictEqual(myExtension['statusBarItems'].size, 0, 'All status bar items should be removed');
  });
});
