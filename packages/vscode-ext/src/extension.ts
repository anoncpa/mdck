// packages/vscode-ext/src/extension.ts
import * as vscode from 'vscode';
import { parse } from '@mdck/parser';

// この関数は拡張機能がアクティベートされたときに一度だけ呼び出されます。
export function activate(context: vscode.ExtensionContext) {
  // "Hello World"コマンドの定義
  console.log('Congratulations, your extension "mdck-vscode" is now active!');
  parse(''); // parserパッケージの関数を呼び出すテスト

  const disposable = vscode.commands.registerCommand(
    'mdck.helloWorld',
    () => {
      vscode.window.showInformationMessage('Hello World from mdck!');
    }
  );

  context.subscriptions.push(disposable);
}

// この関数は拡張機能が非アクティブ化されたときに呼び出されます。
export function deactivate() {}
