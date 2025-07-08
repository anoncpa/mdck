# @mdck/parser 実装状況

## ✅ 完了済み機能

### コアパーサー
- [x] remarkとremark-directiveを使用したMarkdown解析
- [x] mdckディレクティブの抽出（template, tag, result）
- [x] ASTの生成とStringify機能
- [x] 外部ファイル解決機能

### テンプレート機能
- [x] テンプレート定義の収集
- [x] テンプレート参照の解決
- [x] 外部ファイル参照のサポート
- [x] 循環参照検出
- [x] テンプレート展開機能

### Lintエンジン
- [x] 前処理ベースのLint処理
- [x] M002: 重複テンプレートID検出
- [x] M003: 未定義テンプレート参照検出
- [x] M004: 循環参照検出
- [x] 並列ルール実行
- [x] ルール設定のカスタマイズ
- [x] 重要度の上書き機能

### キャッシュ機能
- [x] ファイルメタデータの管理
- [x] テンプレート定義のキャッシュ
- [x] 依存関係グラフの構築
- [x] ファイル変更検出
- [x] 増分キャッシュ更新
- [x] キャッシュの永続化
- [x] エラー情報の記録

### テスト
- [x] 単体テスト（file-resolver, template-expander, rule-engine）
- [x] 統合テスト（external-file）
- [x] 実際のLintテストケース
- [x] キャッシュ機能テスト

## 🚧 次に実装すべき機能（優先度順）

### 1. 追加のLintルール（高優先度）
- [ ] M005: 外部ファイル未発見
- [ ] M006: ディレクティブ名大文字化違反
- [ ] M010: tag id 重複
- [ ] M011: tag id 形式不正

### 2. result関連ルール（中優先度）
- [ ] M020: 必須 result 欠落
- [ ] M021: result 文字数超過
- [ ] M022: result 内容空

### 3. 構文チェックルール（中優先度）
- [ ] M030: チェックボックス記法不正
- [ ] M040-M043: ディレクティブ構文エラー

### 4. 情報系ルール（低優先度）
- [ ] M051: template id 属性形式不正
- [ ] M060: カスタム項目検出
- [ ] M061: 未使用 template

### 5. キャッシュ機能（低優先度）
- [ ] メタデータキャッシュ
- [ ] Git連携
- [ ] ファイル変更検出

## 🎯 動作可能な最小限の実装

現在の実装は既に動作可能な最小限の機能を提供しています：

1. **基本的なMarkdown解析**
2. **テンプレート定義と参照の処理**
3. **主要なLintルール（M002, M003, M004）**
4. **設定可能なLintエンジン**

## 📝 使用例

```typescript
import { MdckParser } from '@mdck/parser';

const parser = new MdckParser();

// 基本的な解析
const result = parser.parse(markdownContent);

// Lint実行
const lintReport = await parser.lint(markdownContent, 'file.md');

// テンプレート展開
const expanded = await parser.expandTemplate(content, 'templateId', 'file.md');
```