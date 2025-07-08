# @mdck/cli

mdck（Markdown Check List）のコマンドラインインターフェース - Markdownテンプレートのリンティング、検証、コンテンツ生成を行う強力なツール。

## 機能

- 🔍 **Markdownファイルのリント**: テンプレートの問題、循環参照、未定義テンプレートを検出
- 📝 **コンテンツ生成**: 変数と依存関係を使ったテンプレート展開
- 🗂️ **ファイル検証**: Markdownの構文と構造を検証
- ⚡ **スマートキャッシュ**: インテリジェントなキャッシュ管理による高速処理
- 📊 **複数の出力形式**: コンソール、JSON、SARIF、JUnit XML
- 🛠️ **設定可能なルール**: 特定のリンティングルールの有効/無効化

## インストール

```bash
# グローバルインストール
npm install -g @mdck/cli

# またはnpxで使用
npx @mdck/cli --help
```

## クイックスタート

```bash
# 現在のディレクトリの全Markdownファイルをリント
mdck lint

# テンプレートからコンテンツを生成
mdck generate my-template --output result.md

# ファイル構文を検証
mdck validate docs/**/*.md

# キャッシュをクリア
mdck cache --clear
```

## コマンド

### `mdck lint`

テンプレートの問題と構文の問題についてMarkdownファイルをリントします。

```bash
# 全Markdownファイルをリント
mdck lint

# 特定のファイルをリント
mdck lint docs/README.md src/**/*.md

# JSON形式で出力
mdck lint --format json --output report.json

# 特定のルールのみを有効化
mdck lint --rules M002,M003

# 特定のルールを無効化
mdck lint --disable-rules M004

# 可能な問題を自動修正
mdck lint --fix
```

#### オプション

- `--format <format>`: 出力形式（`console`, `json`, `sarif`, `junit`）
- `--output <file>`: ファイルに出力を書き込み
- `--rules <rules>`: 有効にするルールのカンマ区切りリスト
- `--disable-rules <rules>`: 無効にするルールのカンマ区切りリスト
- `--config <file>`: 設定ファイルのパス
- `--fix`: 修正可能な問題を自動修正
- `--cache/--no-cache`: キャッシュの有効/無効（デフォルト: 有効）

#### 終了コード

- `0`: エラーが見つからない
- `1`: リンティングエラーが見つかった
- `2`: 無効な引数または設定
- `3`: ファイルが見つからない
- `4`: 一般的なエラー

### `mdck generate`

変数置換を使ってテンプレートからコンテンツを生成します。

```bash
# テンプレートから生成
mdck generate my-template

# 変数を指定して生成
mdck generate button --var text="クリック" --var type="primary"

# ファイルに保存
mdck generate layout --output page.html --force

# キャッシュなしで生成
mdck generate header --no-cache
```

#### オプション

- `--output <file>`: 出力ファイル（デフォルト: 標準出力）
- `--force`: 既存ファイルを上書き
- `--var <key=value>`: テンプレート変数を設定（複数回使用可能）
- `--cache/--no-cache`: キャッシュの有効/無効（デフォルト: 有効）

### `mdck validate`

Markdownファイルの構文と構造を検証します。

```bash
# 全ファイルを検証
mdck validate

# 特定のファイルを検証
mdck validate docs/**/*.md

# キャッシュを無効にして検証
mdck validate --no-cache
```

#### オプション

- `--cache/--no-cache`: キャッシュの有効/無効（デフォルト: 有効）

### `mdck cache`

mdckキャッシュシステムを管理します。

```bash
# キャッシュ情報を表示
mdck cache --info

# 全キャッシュをクリア
mdck cache --clear

# キャッシュを再構築
mdck cache --rebuild
```

#### オプション

- `--clear`: 全キャッシュデータをクリア
- `--rebuild`: キャッシュを一から再構築
- `--info`: キャッシュ情報を表示

### `mdck completion`

シェル補完スクリプトを生成します。

```bash
# bash補完を生成
mdck completion --shell bash

# zsh補完を生成
mdck completion --shell zsh

# fish補完を生成
mdck completion --shell fish
```

#### オプション

- `--shell <shell>`: シェルタイプ（`bash`, `zsh`, `fish`）
- `--type <type>`: 補完タイプ（`template`, `rule`, `file`, `config`）

### `mdck config`

設定を管理します。

```bash
# 全設定を一覧表示
mdck config --list

# 設定値を取得
mdck config format

# 設定値を設定
mdck config format json

# 設定値を削除
mdck config --delete format

# グローバル設定を使用
mdck config --global format console
```

#### オプション

- `--list`: 全設定値を表示
- `--delete`: 設定キーを削除
- `--global`: グローバル設定を使用

## 設定

### 設定ファイル

プロジェクトルートに`.mdckrc.json`ファイルを作成：

```json
{
  "format": "console",
  "cache": true,
  "rules": {
    "M002": { "enabled": true, "severity": "error" },
    "M003": { "enabled": true, "severity": "warn" },
    "M004": { "enabled": true, "severity": "error" }
  },
  "exclude": [
    "node_modules/**",
    "dist/**",
    "*.tmp.md"
  ]
}
```

### 環境変数

- `MDCK_CACHE_DIR`: キャッシュディレクトリを上書き（デフォルト: `.mdck`）
- `MDCK_CONFIG`: 設定ファイルのパス
- `MDCK_NO_COLOR`: 色付き出力を無効化
- `MDCK_VERBOSE`: 詳細ログを有効化

## 出力形式

### コンソール（デフォルト）

色とフォーマットを使った人間が読みやすい出力：

```
✖ 2つの問題 (1エラー, 1警告)

docs/example.md
  1:1  error    重複テンプレートID 'header'  M002
  5:3  warning  未定義テンプレート参照        M003
```

### JSON

機械読み取り可能なJSON形式：

```json
{
  "summary": {
    "errorCount": 1,
    "warningCount": 1,
    "totalCount": 2
  },
  "results": [
    {
      "filePath": "docs/example.md",
      "line": 1,
      "column": 1,
      "severity": "error",
      "message": "重複テンプレートID 'header'",
      "ruleId": "M002"
    }
  ]
}
```

### SARIF

CI/CD統合のための静的解析結果交換形式：

```json
{
  "$schema": "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "mdck",
          "version": "1.0.0"
        }
      },
      "results": [...]
    }
  ]
}
```

### JUnit XML

テスト結果統合用：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="mdck-lint" tests="2" failures="1" errors="0">
  <testsuite name="docs_example_md" tests="2" failures="1" errors="0">
    <testcase name="M002-line-1" classname="docs/example.md">
      <failure message="重複テンプレートID 'header'" type="M002">
        ファイル: docs/example.md
        行: 1
        ルール: M002
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

## 使用例

### 基本的なリンティングワークフロー

```bash
# 1. 全ファイルをリントして結果を表示
mdck lint

# 2. 詳細なJSONレポートを生成
mdck lint --format json --output lint-report.json

# 3. 自動修正可能な問題を修正
mdck lint --fix

# 4. 修正を検証
mdck validate
```

### テンプレート生成ワークフロー

```bash
# 1. 利用可能なテンプレートを一覧表示
mdck cache --info

# 2. 変数を使ってコンテンツを生成
mdck generate email-template \
  --var recipient="田中太郎" \
  --var subject="ようこそ！" \
  --output welcome-email.md

# 3. 生成されたコンテンツを検証
mdck validate welcome-email.md
```

### CI/CD統合

```bash
# GitHub Actions / GitLab CI
mdck lint --format sarif --output results.sarif
mdck lint --format junit --output test-results.xml

# CIに適切な終了コードを返す
mdck lint || exit 1
```

### 高度な設定

```bash
# カスタム設定ファイル
mdck lint --config .mdck-strict.json

# 特定のルール設定
mdck lint --rules M002,M003 --format json

# パフォーマンス最適化
mdck lint --cache --verbose
```

## トラブルシューティング

### よくある問題

1. **キャッシュの問題**
   ```bash
   # キャッシュをクリアして再構築
   mdck cache --clear
   mdck cache --rebuild
   ```

2. **テンプレートが見つからない**
   ```bash
   # 利用可能なテンプレートを確認
   mdck cache --info
   
   # 新しいテンプレートを含めるためにキャッシュを再構築
   mdck cache --rebuild
   ```

3. **パフォーマンスの問題**
   ```bash
   # より良いパフォーマンスのためにキャッシュを有効化
   mdck lint --cache
   
   # デバッグのために詳細モードを使用
   mdck lint --verbose
   ```

### デバッグモード

```bash
# 詳細ログを有効化
mdck lint --verbose

# デバッグのためにキャッシュを無効化
mdck lint --no-cache --verbose
```

## 統合

### VS Code

統合リンティングとテンプレートサポートのためにmdck VS Code拡張機能をインストール。

### Gitフック

`.git/hooks/pre-commit`に追加：

```bash
#!/bin/sh
mdck lint --format console
exit $?
```

### Package.jsonスクリプト

```json
{
  "scripts": {
    "lint:md": "mdck lint",
    "lint:md:fix": "mdck lint --fix",
    "validate:md": "mdck validate",
    "docs:generate": "mdck generate docs-template --output README.md"
  }
}
```

## コントリビューション

コントリビューションガイドラインについては、メインプロジェクトの[CONTRIBUTING.md](../../CONTRIBUTING.md)をご覧ください。

## ライセンス

MIT License - 詳細は[LICENSE](../../LICENSE)をご覧ください。