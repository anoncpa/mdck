# mdck - Markdown Check List

:::warning
このパッケージは実験的に作成されたものであり、
現在はnpmjsに登録されていないため、npm installは実行できません。
また、大幅に仕様を変える可能性もあるためご注意ください。
:::

Markdownテンプレートの作成、管理、検証を行う強力なツールキット。インテリジェントなリンティングとファイル間依存関係の追跡機能を提供します。

## 🚀 概要

mdck（Markdown Check List）は、再利用可能なMarkdownテンプレートを扱うための包括的なソリューションです。パーサー、CLIツール、VS Code拡張機能を提供し、テンプレートベースのコンテンツ生成により保守性の高いドキュメントの作成を支援します。

## 📦 パッケージ

このモノレポには以下のパッケージが含まれています：

### [@mdck/parser](./packages/parser)
テンプレート展開とリンティング機能を持つコアパーシングエンジン。

```bash
npm install @mdck/parser
```

**機能:**
- テンプレートの定義と展開
- 組み込みリンティングルール（重複ID、循環参照、未定義テンプレート）
- パフォーマンス向上のためのスマートキャッシュ
- 外部ファイルサポート
- TypeScriptサポート

### [@mdck/cli](./packages/cli)
リンティング、検証、コンテンツ生成のためのコマンドラインインターフェース。

```bash
npm install -g @mdck/cli
```

**機能:**
- テンプレートの問題に対するMarkdownファイルのリンティング
- テンプレートからのコンテンツ生成
- 複数の出力形式（コンソール、JSON、SARIF、JUnit）
- ファイル検証とキャッシュ管理

### [mdck VS Code拡張機能](./packages/vscode-ext)
リアルタイムリンティングと自動補完機能を持つインテリジェントなVS Code拡張機能。

**機能:**
- リアルタイムテンプレートリンティング
- テンプレートIDのスマート自動補完
- ホバー情報とクイックフィックス
- テンプレートスニペットとシンタックスハイライト

## 🎯 クイックスタート

### 1. CLIをインストール

```bash
npm install -g @mdck/cli
```

### 2. テンプレートを作成

```markdown
<!-- templates/button.md -->
:::template{id="button"}
<button class="btn btn-{{type}}">{{text}}</button>
:::
```

### 3. テンプレートを使用

```markdown
<!-- docs/readme.md -->
:::template{id="button" type="primary" text="開始する"}
:::
```

### 4. リンティングと検証

```bash
mdck lint docs/
mdck generate button --var type="primary" --var text="クリック"
```

## 🔧 テンプレート構文

### テンプレート定義

```markdown
:::template{id="alert"}
<div class="alert alert-{{type}}">
  <strong>{{title}}</strong>
  {{message}}
</div>
:::
```

### テンプレート参照

```markdown
:::template{id="alert" type="warning" title="警告" message="作業を保存してください！"}
:::
```

### 外部テンプレート参照

```markdown
:::template{id="shared-header" src="./templates/common.md"}
:::
```

## 🛠️ 開発

### 前提条件

- Node.js 18+
- pnpm

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-org/mdck.git
cd mdck

# 依存関係をインストール
pnpm install

# 全パッケージをビルド
pnpm build

# テストを実行
pnpm test
```

### パッケージスクリプト

```bash
# 全パッケージをビルド
pnpm build

# 全パッケージのテストを実行
pnpm test

# 全パッケージをリント
pnpm lint

# ビルド成果物をクリーン
pnpm clean
```

## 📖 ドキュメント

- [パーサーAPIドキュメント](./packages/parser/README.ja.md)
- [CLI使用ガイド](./packages/cli/README.ja.md)
- [VS Code拡張機能ガイド](./packages/vscode-ext/README.ja.md)
- [コントリビューションガイドライン](./CONTRIBUTING.md)

## 🤝 コントリビューション

コントリビューションを歓迎します！詳細については[コントリビューションガイド](./CONTRIBUTING.md)をご覧ください：

- 開発環境のセットアップ
- コードスタイルと規約
- テスト要件
- プルリクエストプロセス

## 📄 ライセンス

MIT License - 詳細は[LICENSE](./LICENSE)をご覧ください。

## 🙏 謝辞

- [remark](https://github.com/remarkjs/remark)と[remark-directive](https://github.com/remarkjs/remark-directive)で構築
- 現代的なドキュメントツールとテンプレートシステムからインスピレーションを得ています
