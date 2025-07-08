# 開発チェックリスト例

このディレクトリには、mdckを使用した開発プロセスのチェックリスト例が含まれています。
mdck推奨のディレクトリ構造に従って構成されています。

## 📁 ディレクトリ構成

```
examples/dev/
├── checklists/                     # mdck推奨ディレクトリ構造
│   ├── templates/                  # 再利用可能なテンプレート
│   │   ├── common.md              # 共通開発テンプレート
│   │   ├── feature-development.md # 機能開発テンプレート
│   │   └── bug-fix.md             # バグ修正テンプレート
│   └── runs/                      # 生成されたチェックリスト
│       ├── project-setup-checklist.md
│       ├── code-review-example.md
│       ├── testing-checklist-example.md
│       ├── bug-fix-example.md
│       └── deployment-example.md
├── .mdck/                         # mdck設定ディレクトリ
│   ├── config.yml                 # デフォルト設定
│   ├── config-strict.yml          # 厳格設定
│   ├── config-development.yml     # 開発設定
│   └── README.md                  # 設定ファイル説明
├── scripts/                       # ユーティリティスクリプト
│   └── setup-config.sh           # 設定セットアップスクリプト
├── package.json                   # npm スクリプト定義
└── README.md                      # このファイル
```

## 🎯 使用方法

### 1. テンプレートの活用

各テンプレートは以下のように参照できます：

```markdown
::template{id="code-review-checklist" src="../templates/common.md"}
```

### 2. プロジェクト固有のカスタマイズ

テンプレートを参照した後、プロジェクト固有の項目を追加できます：

```markdown
## プロジェクト固有のチェック項目
- [ ] 独自の要件に基づくチェック項目
- [ ] 技術スタック固有の確認事項
```

### 3. 結果の記録

`:::result{}` ディレクティブを使用して、チェック結果を記録できます：

```markdown
:::result{}
## チェック結果
- 実施日: 2024年1月15日
- 担当者: 田中太郎
- 結果: 全項目クリア
:::
```

## 📋 利用可能なテンプレート

### checklists/templates/common.md
- `code-review-checklist`: コードレビューの基本チェック項目
- `testing-checklist`: テスト実行の基本チェック項目  
- `deployment-checklist`: デプロイメントの基本チェック項目

### checklists/templates/feature-development.md
- `feature-planning`: 機能開発の計画段階チェック項目
- `feature-implementation`: 機能実装段階チェック項目

### checklists/templates/bug-fix.md
- `bug-investigation`: バグ調査段階チェック項目
- `bug-fix-implementation`: バグ修正実装段階チェック項目

## 🔧 設定ファイル

### 環境別設定
- **config.yml**: デフォルト設定（バランス型）
- **config-strict.yml**: 厳格設定（CI/CD向け）
- **config-development.yml**: 開発設定（緩い設定）

### 設定の切り替え
```bash
# 開発環境設定を適用
npm run setup:dev

# 厳格設定を適用（CI/CD用）
npm run setup:strict

# デフォルト設定を適用
npm run setup:default
```

## 🚀 クイックスタート

### 1. 設定のセットアップ
```bash
# 対話的に環境を選択
./scripts/setup-config.sh

# または直接指定
npm run setup:dev
```

### 2. チェックリストのリント
```bash
# 現在の設定でリント
npm run lint

# 厳格設定でリント
npm run lint:strict

# 自動修正付きリント
npm run lint:fix
```

### 3. 設定の確認
```bash
# 設定を表示
npm run config:show

# キャッシュを再構築
npm run cache:rebuild
```

## 💡 ベストプラクティス

### ディレクトリ構造
- `checklists/templates/`: テンプレートファイルを配置
- `checklists/runs/`: 実際に使用するチェックリストを配置
- `.mdck/config.yml`: プロジェクト設定を定義

### テンプレート参照
- 相対パス `../templates/` でテンプレートを参照
- `mandatory=true` タグで必須項目を明示
- `:::result{}` セクションで結果を記録

### 設定管理
- 環境別に設定ファイルを使い分け
- CI/CDでは厳格設定を使用
- 開発時は緩い設定で効率化

## 🔍 mdckコマンドの使用

### リンティング
```bash
# 全ファイルをチェック
mdck lint

# 特定の設定でチェック
mdck lint --config .mdck/config-strict.yml

# 特定のルールのみ
mdck lint --rules M002,M003
```

### テンプレート生成
```bash
# テンプレートからチェックリスト生成
mdck generate code-review-checklist --var project="MyProject"
```

### 検証
```bash
# テンプレート参照の整合性チェック
mdck validate
```

## 📚 関連ドキュメント

- [mdck テンプレート仕様](../../docs/parser/mdck_template.md)
- [mdck CLI使用方法](../../docs/cli/mdck_cli.md)
- [パーサー設定詳細](../../docs/parser/mdck_parser.md)
- [VS Code拡張機能](../../docs/vscode-ext/mdck_vscode.md)

## 🤝 コントリビューション

このサンプルの改善提案や新しいテンプレートの追加は歓迎します。
プルリクエストを作成する前に、mdck推奨のディレクトリ構造に従ってください。