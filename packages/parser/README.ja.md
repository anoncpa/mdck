# @mdck/parser

mdck（Markdown Check List）のためのテンプレートサポートとリンティング機能を持つ強力なMarkdownパーサー。

## 機能

- 🔍 **テンプレートシステム**: 再利用可能なMarkdownテンプレートの定義と展開
- 🚨 **組み込みリンティング**: 循環参照、未定義テンプレート、重複の検出
- ⚡ **スマートキャッシュ**: インテリジェントなキャッシュ管理による高速ファイル処理
- 🔗 **外部ファイルサポート**: 複数ファイル間でのテンプレート参照
- 📊 **依存関係分析**: 自動依存関係グラフ構築
- 🛠️ **TypeScriptサポート**: 包括的な型定義による完全な型安全性

## インストール

```bash
npm install @mdck/parser
```

## クイックスタート

```typescript
import { MdckParser } from '@mdck/parser';

const parser = new MdckParser();

// mdckディレクティブを含むMarkdownをパース
const content = `
# マイドキュメント

:::template{id="greeting"}
こんにちは、**{{name}}**さん！
:::

:::template{id="greeting"}
mdckへようこそ！
:::
`;

const result = parser.parse(content);
console.log(result.directives); // 抽出されたディレクティブの配列
```

## テンプレートシステム

### テンプレートの定義

```markdown
:::template{id="button"}
<button class="btn btn-primary">{{text}}</button>
:::
```

### テンプレートの参照

```markdown
:::template{id="button" text="クリックしてください"}
:::
```

### 外部ファイル参照

```markdown
:::template{id="shared-header" src="./templates/common.md"}
:::
```

## リンティング

パーサーにはテンプレートの整合性を確保するための組み込みリンティングルールが含まれています：

```typescript
const lintReport = await parser.lint(content, 'example.md');

console.log(`エラー: ${lintReport.errorCount}`);
console.log(`警告: ${lintReport.warningCount}`);

lintReport.results.forEach(result => {
  console.log(`${result.severity}: ${result.message} (${result.ruleId})`);
});
```

### 利用可能なリンティングルール

- **M002**: 重複テンプレートID検出
- **M003**: 未定義テンプレート参照検出
- **M004**: 循環参照検出

## キャッシュ

パフォーマンス向上のためのキャッシュを有効化：

```typescript
const parser = new MdckParser();

// プロジェクトのキャッシュを初期化
parser.initializeCache('/path/to/project');

// キャッシュデータを取得
const cacheData = await parser.getCacheData();
console.log(`キャッシュされたテンプレート: ${cacheData.templates.size}`);

// ファイル変更時にキャッシュを更新
await parser.refreshCache(['/path/to/changed/file.md']);
```

## テンプレート展開

完全な依存関係解決によるテンプレート展開：

```typescript
const templateContent = `
:::template{id="header"}
# {{title}}
:::

:::template{id="header" title="ようこそ"}
:::
`;

const expansionResult = await parser.expandTemplate(
  templateContent,
  'header',
  '/path/to/file.md'
);

if (expansionResult.status === 'success') {
  const expandedMarkdown = parser.stringify(expansionResult.expandedAst);
  console.log(expandedMarkdown);
} else {
  console.error(`展開に失敗しました: ${expansionResult.message}`);
}
```

## API リファレンス

### MdckParser

#### メソッド

- `parse(content: string): ParseResult` - Markdownコンテンツをパース
- `lint(content: string, filePath?: string): Promise<LintReport>` - コンテンツをリント
- `stringify(ast: Root): string` - ASTをMarkdownに変換
- `initializeCache(projectRoot: string): void` - キャッシュを初期化
- `getCacheData(): Promise<CacheData | null>` - キャッシュデータを取得
- `refreshCache(targetFiles?: string[]): Promise<CacheUpdateResult | null>` - キャッシュを更新
- `expandTemplate(content: string, templateId: string, filePath?: string): Promise<TemplateExpansionResult>` - テンプレートを展開

#### 型定義

```typescript
interface ParseResult {
  ast: Root;                    // Markdown AST
  directives: MdckDirective[];  // 抽出されたディレクティブ
}

interface LintReport {
  filePath?: string;
  results: LintResult[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  duration: number;
  preprocessDuration: number;
}

interface LintResult {
  ruleId: LintRuleId;
  severity: LintSeverity;
  message: string;
  line: number;
  column?: number;
  fixable: boolean;
  filePath?: string;
  details?: Record<string, unknown>;
}
```

## 設定

### キャッシュ設定

```typescript
const parser = new MdckParser();
parser.initializeCache('/project/root', {
  maxConcurrency: 10,        // 最大並行ファイル処理数
  cacheDirectory: '.mdck',   // キャッシュディレクトリ名
});
```

### リント設定

```typescript
const lintConfig = {
  rules: new Map([
    ['M002', { enabled: true, severity: 'error' }],
    ['M003', { enabled: true, severity: 'warn' }],
    ['M004', { enabled: true, severity: 'error' }],
  ])
};

const report = await parser.lint(content, filePath, lintConfig);
```

## エラーハンドリング

パーサーは詳細なエラー情報を提供します：

```typescript
try {
  const result = await parser.expandTemplate(content, 'template-id');
  if (result.status === 'error') {
    switch (result.errorType) {
      case 'circular-reference':
        console.error('循環参照が検出されました:', result.details.referencePath);
        break;
      case 'undefined-reference':
        console.error('テンプレートが見つかりません:', result.details.templateId);
        break;
      case 'invalid-definition':
        console.error('無効なテンプレート定義:', result.message);
        break;
    }
  }
} catch (error) {
  console.error('パーサーエラー:', error.message);
}
```

## パフォーマンスのヒント

1. **キャッシュを使用**: 複数ファイルのプロジェクトではキャッシュを有効化
2. **バッチ操作**: 可能な限り複数ファイルを一緒に処理
3. **増分更新**: 変更されたファイルのみに`refreshCache()`を使用
4. **並行処理**: パーサーは自動的に並行ファイル処理を処理

## 使用例

### 基本的なテンプレート使用

```markdown
<!-- 再利用可能なコンポーネントを定義 -->
:::template{id="alert"}
<div class="alert alert-{{type}}">
  {{message}}
</div>
:::

<!-- テンプレートを使用 -->
:::template{id="alert" type="warning" message="作業を保存してください！"}
:::
```

### 依存関係を持つ複雑なテンプレート

```markdown
<!-- ベースレイアウトテンプレート -->
:::template{id="layout"}
<!DOCTYPE html>
<html>
<head><title>{{title}}</title></head>
<body>{{content}}</body>
</html>
:::

<!-- レイアウトを使用するページテンプレート -->
:::template{id="page"}
:::template{id="layout" title="{{pageTitle}}" content="{{pageContent}}"}
:::
:::

<!-- 最終的な使用 -->
:::template{id="page" pageTitle="ようこそ" pageContent="<h1>こんにちは世界</h1>"}
:::
```

## コントリビューション

コントリビューションガイドラインについては、メインプロジェクトの[CONTRIBUTING.md](../../CONTRIBUTING.md)をご覧ください。

## ライセンス

MIT License - 詳細は[LICENSE](../../LICENSE)をご覧ください。