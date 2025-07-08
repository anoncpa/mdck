// packages/vscode-ext/src/extension.ts
import * as vscode from 'vscode';
import { MdckParser } from '@mdck/parser';
import { MdckDiagnosticsProvider } from './providers/diagnostics';
import { MdckCompletionProvider } from './providers/completion';
import { MdckHoverProvider } from './providers/hover';
import { MdckCodeActionProvider } from './providers/code-action';

// この関数は拡張機能がアクティベートされたときに一度だけ呼び出されます。
export function activate(context: vscode.ExtensionContext) {
  console.log('mdck extension is now active!');
  
  // パーサーの動作確認
  const parser = new MdckParser();
  parser.parse('# Test');

  // プロバイダーの初期化
  const diagnosticsProvider = new MdckDiagnosticsProvider();
  const completionProvider = new MdckCompletionProvider();
  const hoverProvider = new MdckHoverProvider();
  const codeActionProvider = new MdckCodeActionProvider();

  // Hello Worldコマンドの登録
  const helloWorldCommand = vscode.commands.registerCommand(
    'mdck.helloWorld',
    () => {
      vscode.window.showInformationMessage('Hello World from mdck!');
    }
  );

  // ドキュメント変更時の診断実行
  const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
    async (event) => {
      await diagnosticsProvider.provideDiagnostics(event.document);
    }
  );

  // ドキュメントオープン時の診断実行
  const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
    async (document) => {
      await diagnosticsProvider.provideDiagnostics(document);
    }
  );

  // 補完プロバイダーの登録
  const completionRegistration = vscode.languages.registerCompletionItemProvider(
    ['markdown', 'markdown-checklist'],
    completionProvider,
    ':', '"', "'"  // トリガー文字
  );

  // ホバープロバイダーの登録
  const hoverRegistration = vscode.languages.registerHoverProvider(
    ['markdown', 'markdown-checklist'],
    hoverProvider
  );

  // コードアクションプロバイダーの登録
  const codeActionRegistration = vscode.languages.registerCodeActionsProvider(
    ['markdown', 'markdown-checklist'],
    codeActionProvider,
    {
      providedCodeActionKinds: [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.Refactor,
        vscode.CodeActionKind.Source
      ]
    }
  );

  // 既に開いているドキュメントの診断実行
  vscode.workspace.textDocuments.forEach(async (document) => {
    await diagnosticsProvider.provideDiagnostics(document);
  });

  // リソースの登録
  context.subscriptions.push(
    helloWorldCommand,
    onDidChangeTextDocument,
    onDidOpenTextDocument,
    diagnosticsProvider,
    completionRegistration,
    hoverRegistration,
    codeActionRegistration
  );
}

// この関数は拡張機能が非アクティブ化されたときに呼び出されます。
export function deactivate() {}
