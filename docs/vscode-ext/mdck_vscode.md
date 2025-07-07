# mdck VS Code 拡張機能 仕様詳細（remark+remark-directive版）

## 1. 概要

mdck（Markdown Check List）VS Code 拡張機能は、remarkとremark-directiveによる拡張Markdown記法を用いたチェックリスト作成・管理を支援する開発者向けツールです。

## 2. 基本機能

### 2.1 対象ファイル

| 項目             | 仕様                                        |
| :--------------- | :------------------------------------------ |
| ファイル拡張子   | `.md`                                       |
| 言語識別子       | `markdown-checklist`                        |
| 対象ディレクトリ | `checklists/templates/`, `checklists/runs/` |

### 2.2 パッケージ構成

```

vscode-ext/
├── package.json
├── src/
│   ├── extension.ts          # エントリポイント
│   ├── parser/               # @mdck/parserの呼び出し
│   ├── providers/            # 補完・診断・アクション
│   ├── cache/                # キャッシュ管理
│   └── utils/                # ユーティリティ
├── syntaxes/
│   └── markdown-checklist.tmLanguage.json
└── snippets/
└── mdck.json

```

### 2.3 VS Code 拡張が担当する範囲

| 機能                   | VS Code 拡張の責務        | @mdck/parser の責務  |
| :--------------------- | :------------------------ | :------------------- |
| シンタックスハイライト | TextMate Grammar 提供     | なし                 |
| 診断表示               | Diagnostic 変換・表示     | Lint 実行・結果生成  |
| 補完機能               | CompletionItem 変換・表示 | キャッシュデータ提供 |
| コードアクション       | CodeAction 変換・表示     | 修正案生成           |
| ホバー                 | Hover 表示                | コンテンツ取得       |
| ファイル監視           | VS Code API 呼び出し      | ファイル変更処理     |

## 3. シンタックスハイライト

### 3.1 TextMate Grammar 仕様

```json
{
  "scopeName": "text.html.markdown.checklist",
  "patterns": [
    { "include": "#template-directive" },
    { "include": "#tag-directive" },
    { "include": "#result-directive" }
  ],
  "repository": {
    "template-directive": {
      "name": "entity.name.tag.tsx",
      "patterns": [
        {
          "name": "markup.heading.template.mdck",
          "begin": "::template\\{",
          "end": "\\}",
          "patterns": [{ "include": "#directive-attributes" }]
        },
        {
          "name": "markup.heading.template.mdck",
          "begin": "::template\\{[^}]*\\}",
          "end": "::",
          "patterns": [
            { "include": "#tag-directive" },
            { "include": "#result-directive" }
          ]
        }
      ]
    },
    "tag-directive": {
      "name": "entity.name.type.tag.mdck",
      "match": "::tag\\{[^}]*\\}"
    },
    "result-directive": {
      "name": "string.unquoted.result.mdck",
      "begin": "::result\\{[^}]*\\}",
      "end": "::"
    },
    "directive-attributes": {
      "patterns": [
        {
          "name": "entity.other.attribute-name.id.mdck",
          "match": "#id\\s*=\\s*[^\\s}]+"
        },
        {
          "name": "entity.other.attribute-name.src.mdck",
          "match": "src\\s*=\\s*[^\\s}]+"
        },
        {
          "name": "entity.other.attribute-name.mandatory.mdck",
          "match": "mandatory\\s*=\\s*(true|false)"
        }
      ]
    }
  }
}
```

### 3.2 カラーテーマ設定

| スコープ                     | デフォルト色        | 用途                                                  |
| :--------------------------- | :------------------ | :---------------------------------------------------- |
| markup.heading.template.mdck | entity.name.tag.tsx | template ディレクティブ（React コンポーネントと同色） |
| entity.name.type.tag.mdck    | entity.name.tag.tsx | tag ディレクティブ（React コンポーネントと同色）      |
| string.unquoted.result.mdck  | entity.name.tag.tsx | result ディレクティブ（React コンポーネントと同色）   |

## 4. キャッシュシステム

### 4.1 キャッシュファイル構造

```

.mdck/
├── .cache/
│   ├── metadata.json         # 統合メタデータ
│   ├── files.json            # ファイル別キャッシュ
│   ├── templates.json        # テンプレート定義キャッシュ
│   └── dependencies.json     # 依存関係グラフ
└── config.yml                # 設定ファイル

```

### 4.2 キャッシュ管理 API

```typescript
interface CacheManager {
  loadCache(): Promise<MdckCache>;
  saveCache(cache: MdckCache): Promise<void>;
  invalidateCache(): Promise<void>;
  updateFromFiles(files: string[]): Promise<void>;
}

interface MdckCache {
  templateIds: string[];
  itemIds: string[];
  externalRefs: { [id: string]: string }; // id -> filePath
  templateDefinitions: { [id: string]: TemplateDefinition };
  fileDependencies: { [filePath: string]: string[] };
  lastUpdated: number;
  metadata: {
    fileCount: number;
    schemaVersion: string; // "2.0.0" (remarkベース)
  };
}
```

## 5. 入力補完機能

### 5.1 補完プロバイダー

```typescript
// remarkとremark-directiveベースの@mdck/parserから取得
import { MdckParser, CacheData } from '@mdck/parser';

export class MdckCompletionProvider implements vscode.CompletionItemProvider {
  private parser: MdckParser;

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);

    // @mdck/parserからキャッシュデータを取得
    const cacheData = await this.parser.getCacheData();

    if (linePrefix.includes('#id=')) {
      return this.createCompletionItems(
        cacheData.itemIds.concat(cacheData.templateIds)
      );
    }

    if (linePrefix.includes('::')) {
      return this.createDirectiveCompletions();
    }

    return [];
  }

  private createCompletionItems(ids: string[]): vscode.CompletionItem[] {
    return ids.map((id) => {
      const item = new vscode.CompletionItem(
        id,
        vscode.CompletionItemKind.Reference
      );
      item.insertText = id;
      return item;
    });
  }

  private createDirectiveCompletions(): vscode.CompletionItem[] {
    return [
      {
        label: 'template',
        kind: vscode.CompletionItemKind.Snippet,
        insertText: 'template{#id=\$1}\n\$0\n::',
        documentation: 'Template definition block',
      },
      {
        label: 'tag',
        kind: vscode.CompletionItemKind.Snippet,
        insertText: 'tag{#id=\$1}',
        documentation: 'Tag directive',
      },
      {
        label: 'result',
        kind: vscode.CompletionItemKind.Snippet,
        insertText: 'result{}\n\$0\n::',
        documentation: 'Result block',
      },
    ];
  }
}
```

### 5.2 補完候補

| トリガー | 補完内容                     | 説明             |
| :------- | :--------------------------- | :--------------- |
| `::te`   | `::template{#id=$1}\n$0\n::` | Template 定義    |
| `::ta`   | `::tag{#id=$1}`              | Tag 参照         |
| `::re`   | `::result{}\n$0\n::`         | Result 部        |
| `#id="`  | キャッシュから id 一覧       | 既存 ID 補完     |
| `src="`  | 相対パス補完                 | 外部ファイル参照 |

## 6. 診断機能（Linter 連携）

### 6.1 診断プロバイダー

```typescript
// remarkとremark-directiveベースの@mdck/parserに完全依存
import { MdckParser, LintResult } from '@mdck/parser';

export class MdckDiagnosticProvider {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
  }

  async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    // @mdck/parserの機能のみ使用
    const lintResults = await this.parser.lint(
      document.getText(),
      document.fileName
    );

    const diagnostics = lintResults.map((result) =>
      this.createDiagnostic(result)
    );
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  private createDiagnostic(result: LintResult): vscode.Diagnostic {
    // VS Code固有の変換処理のみ
    return new vscode.Diagnostic(
      new vscode.Range(result.line - 1, 0, result.line - 1, 999),
      result.message,
      this.getSeverity(result.severity)
    );
  }
}
```

### 6.2 エラー表示例

```

M020: Missing required result block [Error]
M011: Invalid id format: "invalid-id" [Warning]
M006: Directive name must be lowercase: "Template" should be "template" [Error]
M060: Custom item detected (no tag directive) [Info]

```

## 7. コードアクション機能

### 7.1 自動修正アクション

```typescript
export class MdckCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      switch (diagnostic.code) {
        case 'M020': // 必須result欠落
          actions.push(this.createInsertResultAction(document, range));
          break;
        case 'M006': // ディレクティブ名小文字化
          actions.push(this.createLowercaseDirectiveAction(document, range));
          break;
        case 'M007': // 属性名規則
          actions.push(this.createFixAttributeNameAction(document, range));
          break;
        case 'M043': // ディレクティブ形式
          actions.push(this.createFixDirectiveFormatAction(document, range));
          break;
      }
    }

    return actions;
  }

  private createInsertResultAction(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Insert result block',
      vscode.CodeActionKind.QuickFix
    );

    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, range.end, '\n::result{}\n\n::');
    action.edit = edit;

    return action;
  }

  private createLowercaseDirectiveAction(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Convert directive name to lowercase',
      vscode.CodeActionKind.QuickFix
    );

    const text = document.getText(range);
    const fixedText = text.replace(
      /::([A-Z])/g,
      (match, p1) => `::${p1.toLowerCase()}`
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, fixedText);
    action.edit = edit;

    return action;
  }
}
```

### 7.2 リファクタリング機能

| アクション           | 説明                       | キーバインド   |
| :------------------- | :------------------------- | :------------- |
| Insert Result Block  | 必須 result ブロックを挿入 | `Ctrl+Shift+R` |
| Convert to Lowercase | ディレクティブ名を小文字化 | `Ctrl+Shift+L` |

## 8. ホバー機能

### 8.1 ホバープロバイダー

```typescript

export class MdckHoverProvider implements vscode.HoverProvider {
private parser: MdckParser;

constructor() {
this.parser = new MdckParser();
}

async provideHover(
document: vscode.TextDocument,
position: vscode.Position
): Promise<vscode.Hover | undefined> {
const range = document.getWordRangeAtPosition(position);
const word = document.getText(range);

    // template参照時のプレビュー
    if (this.isTemplateReference(document, position)) {
      const cacheData = await this.parser.getCacheData();
      const templateDef = cacheData.templateDefinitions[word];

      if (templateDef) {
        const content = `**Template: ${word}**\n\nFile: ${templateDef.filePath}\nLine: ${templateDef.startLine}`;
        return new vscode.Hover(
          new vscode.MarkdownString(content),
          range
        );
      }
    }

    return undefined;
    }

private isTemplateReference(document: vscode.TextDocument, position: vscode.Position): boolean {
const line = document.lineAt(position).text;
return line.includes('::template{') \&\& line.includes('#id=');
}
}

```

## 9. ショートカット・コマンド

### 9.1 エディタコマンド

```typescript
export const commands = {
  'mdck.insertTemplate': 'Insert Template',
  'mdck.insertTag': 'Insert Tag',
  'mdck.insertResult': 'Insert Result',
  'mdck.generateChecklist': 'Generate Checklist from Template',
  'mdck.validateAll': 'Validate All mdck Files',
  'mdck.refreshCache': 'Refresh Cache',
  'mdck.convertToDirectives': 'Convert HTML tags to directives',
};
```

### 9.2 キーバインド設定

```json
[
  {
    "command": "mdck.insertTemplate",
    "key": "ctrl+alt+t",
    "when": "editorTextFocus && resourceExtname == .md"
  },
  {
    "command": "mdck.insertTag",
    "key": "ctrl+alt+g",
    "when": "editorTextFocus && resourceExtname == .md"
  },
  {
    "command": "mdck.insertResult",
    "key": "ctrl+alt+r",
    "when": "editorTextFocus && resourceExtname == .md"
  }
]
```

## 11. 設定項目

### 11.1 拡張機能設定

```

{
"mdck.enableLinting": true,
"mdck.autoSave": true,
"mdck.cacheRefreshInterval": 5000,
"mdck.itemIdFormat": "^[a-zA-Z0-9_-]+\$",
"mdck.autoFixOnSave": true,
"mdck.showInfoDiagnostics": false,
"mdck.enforceDirectiveCase": true,
"mdck.enforceDirectiveFormat": true
}

```

### 11.2 ワークスペース設定例

```json
{
  "files.associations": {
    "*.md": "markdown-checklist"
  },
  "mdck.templatePaths": [
    "checklists/templates/**/*.md",
    "shared/templates/**/*.md"
  ],
  "mdck.directiveValidation": {
    "allowHTMLTags": false,
    "strictAttributeNames": true
  }
}
```

## 12. ステータスバー連携

### 12.1 ステータス表示

```typescript
export class MdckStatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  updateStatus(stats: {
    templates: number;
    items: number;
    errors: number;
    warnings: number;
  }): void {
    this.statusBarItem.text = `mdck: ${stats.templates}T ${stats.items}I`;
    this.statusBarItem.tooltip = `Templates: ${stats.templates}, Items: ${stats.items}, Errors: ${stats.errors}`;
    this.statusBarItem.backgroundColor =
      stats.errors > 0
        ? new vscode.ThemeColor('statusBarItem.errorBackground')
        : undefined;
  }
}
```

## 13. ファイル監視・同期

### 13.1 ファイルウォッチャー

```typescript
// ファイル変更通知のみ、解析はremarkベース@mdck/parserに委譲
export class MdckFileWatcher {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
    this.setupWatcher();
  }

  private async onFileChanged(uri: vscode.Uri): Promise<void> {
    // ファイル変更をremarkベース@mdck/parserに通知するだけ
    await this.parser.refreshCache([uri.fsPath]);

    // VS Code固有の処理（診断更新など）
    this.triggerDiagnosticUpdate(uri);
  }

  private setupWatcher(): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');

    watcher.onDidChange(this.onFileChanged.bind(this));
    watcher.onDidCreate(this.onFileChanged.bind(this));
    watcher.onDidDelete(async (uri) => {
      await this.parser.invalidateCache();
      this.triggerDiagnosticUpdate(uri);
    });
  }
}
```

## 14. Markdown プレビュー統合

### 14.1 remark-directive プレビュー支援

```typescript
// package.jsonでmarkdown-it pluginとして統合
export function activate(context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(md: any) {
      // ディレクティブをHTMLにレンダリング
      return md.use(directiveToHtmlPlugin);
    },
  };
}

function directiveToHtmlPlugin(md: any) {
  md.renderer.rules.directive = function (tokens: any[], idx: number) {
    const token = tokens[idx];
    const directiveName = token.meta.name;
    const attributes = token.meta.attributes || {};

    switch (directiveName) {
      case 'template':
        return `<div class="mdck-template" data-id="${attributes.id}">`;
      case 'tag':
        return `<span class="mdck-tag" data-id="${attributes.id}">🏷️</span>`;
      case 'result':
        return `<div class="mdck-result">`;
      default:
        return '';
    }
  };
}
```
