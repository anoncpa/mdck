# mdck - Markdown Check List

mdck（Markdown Check List）テンプレートを扱うための強力なVS Code拡張機能。インテリジェントなリンティング、自動補完、テンプレート管理機能を提供します。

## 機能

- 🔍 **リアルタイムリンティング**: テンプレートの問題、循環参照、未定義テンプレートの即座な検出
- ✨ **スマート自動補完**: テンプレートID、ディレクティブ、構文のIntelliSense
- 🏷️ **ホバー情報**: ホバー時の詳細なテンプレート情報
- 🛠️ **クイックフィックス**: 一般的なテンプレートの問題の自動修正
- 📝 **テンプレートスニペット**: 一般的なmdckパターンの事前構築スニペット
- 🎨 **シンタックスハイライト**: mdckディレクティブの強化されたハイライト
- ⚡ **パフォーマンス**: インテリジェントなキャッシュによる高速処理

## インストール

1. VS Codeを開く
2. 拡張機能に移動（Ctrl+Shift+X）
3. "mdck"を検索
4. インストールをクリック

またはコマンドラインからインストール：
```bash
code --install-extension mdck.mdck-vscode
```

## クイックスタート

1. Markdownファイル（`.md`）を開く
2. mdckディレクティブを入力開始：
   ```markdown
   :::template{id="my-template"}
   # こんにちは {{name}}さん！
   :::
   ```
3. 即座のフィードバックと自動補完を取得

## 詳細機能

### 🔍 リアルタイムリンティング

拡張機能はmdckテンプレートの問題を自動的に検出してハイライトします：

- **重複テンプレートID**: 同じテンプレートIDが複数回定義された場合に警告
- **未定義参照**: 存在しないテンプレートへの参照をハイライト
- **循環依存関係**: テンプレート間の循環参照を検出
- **構文エラー**: mdckディレクティブの構文を検証

### ✨ スマート自動補完

入力中にインテリジェントな提案を取得：

- **テンプレートID**: 利用可能なテンプレートIDの自動補完
- **ディレクティブ名**: `template`、`tag`、`result`の提案
- **属性**: 属性名と値の補完
- **ファイルパス**: 外部ファイル参照の自動補完

### 🏷️ ホバー情報

テンプレート参照にホバーして以下を表示：

- テンプレート定義の場所
- テンプレートコンテンツのプレビュー
- 依存関係情報
- 使用統計

### 🛠️ クイックフィックス

一般的な問題の自動修正：

- **未定義参照の修正**: 不足しているテンプレート定義を作成
- **重複の削除**: 重複するテンプレートIDを削除または名前変更
- **ディレクティブのフォーマット**: 構文とフォーマットの問題を修正
- **テンプレートの整理**: テンプレート定義のソートと整理

## サポートされるファイルタイプ

- `.md` - Markdownファイル
- `.markdown` - Markdownファイル
- `markdown-checklist`言語IDを持つファイル

## コマンド

コマンドパレット（Ctrl+Shift+P）からこれらのコマンドにアクセス：

- **mdck: 現在のファイルをリント** - アクティブファイルでリンティングを実行
- **mdck: 全ファイルを検証** - ワークスペース内の全Markdownファイルを検証
- **mdck: キャッシュを更新** - テンプレートキャッシュを更新
- **mdck: テンプレート一覧を表示** - 利用可能な全テンプレートを表示
- **mdck: テンプレートから生成** - テンプレートからコンテンツを生成

## 設定

VS Code設定で拡張機能を設定：

### 基本設定

```json
{
  "mdck.enable": true,
  "mdck.linting.enable": true,
  "mdck.completion.enable": true,
  "mdck.hover.enable": true,
  "mdck.codeActions.enable": true
}
```

### リンティング設定

```json
{
  "mdck.linting.rules": {
    "M002": "error",    // 重複テンプレートID
    "M003": "warning",  // 未定義テンプレート参照
    "M004": "error"     // 循環参照
  },
  "mdck.linting.onSave": true,
  "mdck.linting.onType": true,
  "mdck.linting.delay": 500
}
```

### キャッシュ設定

```json
{
  "mdck.cache.enable": true,
  "mdck.cache.autoRefresh": true,
  "mdck.cache.directory": ".mdck",
  "mdck.cache.maxFiles": 1000
}
```

### ファイル関連付け

```json
{
  "mdck.files.include": ["**/*.md", "**/*.markdown"],
  "mdck.files.exclude": ["**/node_modules/**", "**/dist/**"],
  "mdck.files.watchGlob": "**/*.md"
}
```

## スニペット

拡張機能は一般的なmdckパターンのための便利なスニペットを提供：

### テンプレート定義
- トリガー: `mdck-template`
```markdown
:::template{id="$1"}
$2
:::
```

### テンプレート参照
- トリガー: `mdck-ref`
```markdown
:::template{id="$1"$2}
:::
```

### 変数付きテンプレート
- トリガー: `mdck-var`
```markdown
:::template{id="$1" $2="$3"}
:::
```

### 外部テンプレート参照
- トリガー: `mdck-external`
```markdown
:::template{id="$1" src="$2"}
:::
```

## キーボードショートカット

- **Ctrl+Shift+L** - 現在のファイルをリント
- **Ctrl+Shift+T** - テンプレート一覧を表示
- **F2** - テンプレートIDを名前変更
- **Ctrl+.** - クイックフィックスを表示

## ステータスバー

拡張機能は以下を表示するステータスバー項目を追加：

- 現在のファイル内のテンプレート数
- キャッシュステータス
- リンティングステータス
- コマンドへのクイックアクセス

## ワークスペース機能

### マルチファイルテンプレートサポート

拡張機能はワークスペース全体でテンプレートを自動発見：

- 全Markdownファイルでテンプレート定義をスキャン
- 依存関係グラフを構築
- ファイル間自動補完を提供
- ファイル間循環参照を検出

### プロジェクト設定

ワークスペースルートに`.mdckrc.json`ファイルを作成：

```json
{
  "include": ["docs/**/*.md", "src/**/*.md"],
  "exclude": ["**/node_modules/**", "**/dist/**"],
  "rules": {
    "M002": { "enabled": true, "severity": "error" },
    "M003": { "enabled": true, "severity": "warning" },
    "M004": { "enabled": true, "severity": "error" }
  },
  "cache": {
    "enabled": true,
    "directory": ".mdck"
  }
}
```

## mdck CLIとの統合

拡張機能はmdck CLIとシームレスに連携：

- 同じキャッシュディレクトリを共有
- 同じ設定形式を使用
- 一貫したリンティング結果を提供
- 同じテンプレート構文をサポート

## トラブルシューティング

### よくある問題

1. **テンプレートが自動補完に表示されない**
   - ファイルがワークスペースに含まれているか確認
   - キャッシュを更新: `Ctrl+Shift+P` → "mdck: キャッシュを更新"
   - 設定のファイルパターンを確認

2. **リンティングが動作しない**
   - `mdck.linting.enable`がtrueであることを確認
   - ファイルタイプがサポートされているか確認
   - 出力パネル（表示 → 出力 → mdck）でエラーを確認

3. **パフォーマンスの問題**
   - `mdck.files.include`の範囲を縮小
   - `mdck.linting.delay`を増加
   - 不要な機能を無効化

### デバッグ情報

デバッグログを有効化：

```json
{
  "mdck.debug.enable": true,
  "mdck.debug.level": "verbose"
}
```

詳細ログについては出力パネル（表示 → 出力 → mdck）を確認。

### 拡張機能のリセット

拡張機能の状態をリセットするには：

1. 拡張機能を無効化
2. `.mdck`キャッシュディレクトリを削除
3. VS Codeを再読み込み
4. 拡張機能を再有効化

## 使用例

### 基本的なテンプレート使用

```markdown
<!-- 再利用可能なアラートテンプレートを定義 -->
:::template{id="alert"}
<div class="alert alert-{{type}}">
  <strong>{{title}}</strong>
  {{message}}
</div>
:::

<!-- テンプレートを使用 -->
:::template{id="alert" type="warning" title="警告" message="作業を保存してください！"}
:::
```

### ファイル間テンプレート

**templates/common.md:**
```markdown
:::template{id="page-header"}
# {{title}}
*最終更新: {{date}}*
:::
```

**docs/readme.md:**
```markdown
:::template{id="page-header" src="../templates/common.md" title="ドキュメント" date="2024-01-01"}
:::

ドキュメントへようこそ！
```

### 複雑なテンプレート依存関係

```markdown
<!-- ベースレイアウト -->
:::template{id="layout"}
<!DOCTYPE html>
<html>
<head><title>{{title}}</title></head>
<body>{{content}}</body>
</html>
:::

<!-- ナビゲーションコンポーネント -->
:::template{id="nav"}
<nav>{{links}}</nav>
:::

<!-- 両方を使用するページテンプレート -->
:::template{id="page"}
:::template{id="layout" title="{{pageTitle}}" content=":::template{id=\"nav\" links=\"{{navLinks}}\"}:::\n{{pageContent}}"}
:::
:::
```

## コントリビューション

コントリビューションを歓迎します！詳細については[コントリビューションガイド](CONTRIBUTING.md)をご覧ください。

### 開発セットアップ

1. リポジトリをクローン
2. 依存関係をインストール: `npm install`
3. VS Codeで開く
4. F5を押して拡張機能開発ホストを起動
5. 変更を加えてテスト

### ビルド

```bash
npm run build
```

### テスト

```bash
npm test
```

## 変更履歴

リリースノートについては[CHANGELOG.md](CHANGELOG.md)をご覧ください。

## ライセンス

MIT License - 詳細は[LICENSE](../../LICENSE)をご覧ください。

## サポート

- 📖 [ドキュメント](https://github.com/your-org/mdck)
- 🐛 [問題を報告](https://github.com/your-org/mdck/issues)
- 💬 [ディスカッション](https://github.com/your-org/mdck/discussions)
- 📧 [メールサポート](mailto:support@mdck.dev)