// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
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

  suiteSetup(async () => {
    vscode.window.showInformationMessage('Start all tests.');

    // TODO: in some cases throw an error: `Method not found: toJSON: CodeExpectedError: Method not found: toJSON`
    // Open global settings
    // await vscode.commands.executeCommand('workbench.action.openSettingsJson');
  });

  test('Extension activation', () => {
    const extension = vscode.extensions.getExtension('mhagnumdw.vscode-toggle-settings');
    assert.ok(extension, 'Extension should be definedX');
    assert.strictEqual(extension?.isActive, true, 'Extension should be active');
  });

  test('Settings are empty', () => {
    const config = vscode.workspace.getConfiguration('toggleSettings');
    const items = config.get('items') as ToggleSetting[];
    assert.strictEqual(items.length, 0, 'Settings should be empty');
  });

  test('Add settings to status bar', async () => {
    const settings: ToggleSetting[] = [
      {
        property: 'editor.renderWhitespace',
        icon: 'whitespace',
        values: ["none", "all"]
      }
    ];

    // Simula o usuário adicionando a configuração
    // TODO: dá o erro mas funciona: `Method not found: toJSON: CodeExpectedError: Method not found: toJSON`
    await vscode.workspace.getConfiguration(GROUP_NAME)
      .update('items', settings, vscode.ConfigurationTarget.Global);

    // Simula o usuário clicando no botão da barra de status
    await vscode.commands.executeCommand(GROUP_NAME + '.editor.renderWhitespace');
    await waitForConfigChange('editor.renderWhitespace');

    // Crie a assertiva para verificar se o valor foi alterado
    const newValue = vscode.workspace.getConfiguration().get('editor.renderWhitespace');
    assert.strictEqual(newValue, 'none');
  });

});

class MyVscode {

}
