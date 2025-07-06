# mdck VS Code 拡張機能 仕様詳細

## 1. 概要

mdck（Markdown Check List）VS Code 拡張機能は、拡張 Markdown 記法を用いたチェックリスト作成・管理を支援する開発者向けツールです。

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
    { "include": "#template-block" },
    { "include": "#tag-inline" },
    { "include": "#result-block" }
  ],
  "repository": {
    "template-block": {
      "name": "entity.name.tag.tsx",
      "begin": "<Template\\b[^>]*>",
      "end": "</Template>",
      "patterns": [
        { "include": "#template-attributes" },
        { "include": "#tag-inline" },
        { "include": "#result-block" }
      ]
    },
    "tag-inline": {
      "name": "entity.name.tag.tsx",
      "match": "<Tag\\b[^/>]*/>"
    },
    "result-block": {
      "name": "entity.name.tag.tsx",
      "begin": "<Result>",
      "end": "</Result>"
    }
  }
}
```

### 3.2 カラーテーマ設定

| スコープ                     | デフォルト色        | 用途                                          |
| :--------------------------- | :------------------ | :-------------------------------------------- |
| markup.heading.template.mdck | entity.name.tag.tsx | Template タグ（React コンポーネントと同色）   |
| entity.name.type.tag.mdck    | entity.name.tag.tsx | Tag タグ（React コンポーネントと同色）        |
| string.unquoted.result.mdck  | entity.name.tag.tsx | Result ブロック（React コンポーネントと同色） |

## 4. キャッシュシステム

### 4.1 キャッシュファイル構造

```
.mdck/
├── .cache/
│   ├── template-ids.json     # TemplateId一覧
│   ├── item-ids.json         # itemId一覧
│   ├── metadata.json         # メタデータ
│   └── lint-results.json     # 最新のlint結果
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
  lastUpdated: number;
}
```

## 5. 入力補完機能

### 5.1 補完プロバイダー

```typescript
// ✅ キャッシュデータも@mdck/parserから取得
import { MdckParser, CacheData } from "@mdck/parser";

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

    if (linePrefix.includes('itemId="')) {
      return this.createCompletionItems(cacheData.itemIds);
    }

    if (linePrefix.includes('TemplateId="')) {
      return this.createCompletionItems(cacheData.templateIds);
    }

    return [];
  }

  private createCompletionItems(ids: string[]): vscode.CompletionItem[] {
    // VS Code固有の変換処理のみ
    return ids.map((id) => {
      const item = new vscode.CompletionItem(
        id,
        vscode.CompletionItemKind.Reference
      );
      item.insertText = id;
      return item;
    });
  }
}
```

### 5.2 補完候補

| トリガー       | 補完内容                                  | 説明                 |
| :------------- | :---------------------------------------- | :------------------- |
| `<Te`          | `<Template TemplateId="$1">$0</Template>` | Template 定義        |
| `<Ta`          | `<Tag itemId="$1" />`                     | Tag 参照             |
| `<Re`          | `<Result>$0</Result>`                     | Result 部            |
| `itemId="`     | キャッシュから itemId 一覧                | 既存 ID 補完         |
| `TemplateId="` | キャッシュから TemplateId 一覧            | 既存 TemplateID 補完 |

## 6. 診断機能（Linter 連携）

### 6.1 診断プロバイダー

```typescript
// ✅ @mdck/parserに完全依存
import { MdckParser, LintResult } from "@mdck/parser";

export class MdckDiagnosticProvider {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
  }

  async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    // @mdck/parserの機能のみ使用
    const lintResults = await this.parser.lint(document.getText());

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
M020: Missing required Result block [Error]
M011: Invalid itemId format: "invalid-id" [Warning]
M060: Custom item detected (no Tag) [Info]
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
        case "M020": // 必須Result欠落
          actions.push(this.createInsertResultAction(document, range));
          break;
        case "M006": // タグ名大文字化
          actions.push(this.createCapitalizeTagAction(document, range));
          break;
        case "M043": // JSX形式
          actions.push(this.createSelfClosingTagAction(document, range));
          break;
      }
    }

    return actions;
  }
}
```

### 7.2 リファクタリング機能

| アクション          | 説明                       | キーバインド   |
| :------------------ | :------------------------- | :------------- |
| Insert Result Block | 必須 Result ブロックを挿入 | `Ctrl+Shift+R` |

## 8. ホバー機能

### 8.1 ホバープロバイダー

```typescript
export class MdckHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    const wordRange = document.getWordRangeAtPosition(position);
    const word = document.getText(wordRange);

    // Template参照時のプレビュー
    if (this.isTemplateReference(document, position)) {
      const templateContent = this.getTemplateContent(word);
      return new vscode.Hover(
        new vscode.MarkdownString(templateContent),
        wordRange
      );
    }

    return undefined;
  }
}
```

## 9. ショートカット・コマンド

### 9.1 エディタコマンド

```typescript
export const commands = {
  "mdck.insertTemplate": "Insert Template",
  "mdck.insertTag": "Insert Tag",
  "mdck.insertResult": "Insert Result",
  "mdck.generateChecklist": "Generate Checklist from Template",
  "mdck.validateAll": "Validate All mdck Files",
  "mdck.refreshCache": "Refresh Cache",
};
```

### 9.2 キーバインド設定

```jsonc
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

## 10. 設定項目

### 10.1 拡張機能設定

```jsonc
{
  "mdck.enableLinting": true,
  "mdck.autoSave": true,
  "mdck.cacheRefreshInterval": 5000,
  "mdck.itemIdFormat": "^[a-zA-Z0-9_-]+$",
  "mdck.autoFixOnSave": true,
  "mdck.showInfoDiagnostics": false
}
```

### 10.2 ワークスペース設定例

```jsonc
{
  "files.associations": {
    "*.md": "markdown-checklist"
  },
  "mdck.templatePaths": [
    "checklists/templates/**/*.md",
    "shared/templates/**/*.md"
  ]
}
```

## 11. ステータスバー連携

### 11.1 ステータス表示

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
        ? new vscode.ThemeColor("statusBarItem.errorBackground")
        : undefined;
  }
}
```

## 12. ファイル監視・同期

### 12.1 ファイルウォッチャー

```typescript
// ✅ ファイル変更通知のみ、解析は@mdck/parserに委譲
export class MdckFileWatcher {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
    this.setupWatcher();
  }

  private async onFileChanged(uri: vscode.Uri): Promise<void> {
    // ファイル変更を@mdck/parserに通知するだけ
    await this.parser.onFileChanged(uri.fsPath);

    // VS Code固有の処理（診断更新など）
    this.triggerDiagnosticUpdate(uri);
  }
}
```
