# 開発チェックリスト例

このディレクトリには、mdckを使用した開発プロセスのチェックリスト例が含まれています。

## 📁 ディレクトリ構成

```
examples/dev/
├── templates/                    # 再利用可能なテンプレート
│   ├── common.md                # 共通開発テンプレート
│   ├── feature-development.md   # 機能開発テンプレート
│   └── bug-fix.md              # バグ修正テンプレート
├── project-setup-checklist.md   # プロジェクトセットアップ例
├── code-review-example.md       # コードレビュー例
├── testing-checklist-example.md # テスト実行例
├── bug-fix-example.md          # バグ修正例
├── deployment-example.md       # デプロイメント例
└── README.md                   # このファイル
```

## 🎯 使用方法

### 1. テンプレートの活用

各テンプレートは以下のように参照できます：

```markdown
::template{id="code-review-checklist" src="./templates/common.md"}
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

### common.md
- `code-review-checklist`: コードレビューの基本チェック項目
- `testing-checklist`: テスト実行の基本チェック項目  
- `deployment-checklist`: デプロイメントの基本チェック項目

### feature-development.md
- `feature-planning`: 機能開発の計画段階チェック項目
- `feature-implementation`: 機能実装段階チェック項目

### bug-fix.md
- `bug-investigation`: バグ調査段階チェック項目
- `bug-fix-implementation`: バグ修正実装段階チェック項目

## 🔧 カスタマイズ方法

### 1. 新しいテンプレートの作成

```markdown
:::template{id="your-custom-template"}
## カスタムチェックリスト
- [ ] カスタム項目1 ::tag{id="custom1" mandatory=true}
- [ ] カスタム項目2 ::tag{id="custom2"}

:::result{}
## 結果記録エリア
:::
:::
```

### 2. 既存テンプレートの拡張

既存のテンプレートを参照した後、追加項目を定義：

```markdown
::template{id="code-review-checklist" src="./templates/common.md"}

## 追加のチェック項目
- [ ] プロジェクト固有の要件
- [ ] 特別な技術要件
```

## 🚀 実際の使用例

### 新機能開発の場合
1. `project-setup-checklist.md` をコピー
2. 機能名と要件に合わせて内容を更新
3. 開発進行に合わせてチェック項目を実行
4. 結果を `:::result{}` セクションに記録

### バグ修正の場合
1. `bug-fix-example.md` をコピー
2. バグの詳細情報を更新
3. 調査・修正・テストの各段階でチェック実行
4. 修正結果と検証結果を記録

## 💡 ベストプラクティス

### チェック項目の設計
- **mandatory=true**: 必須項目には必ずタグを付ける
- **具体的**: 曖昧でない具体的な項目にする
- **測定可能**: 完了判定が明確な項目にする

### 結果の記録
- **詳細**: 後から振り返れる程度の詳細を記録
- **客観的**: 主観的でない事実ベースの記録
- **継続的改善**: 問題点や改善案も記録

### テンプレートの管理
- **バージョン管理**: テンプレートの変更履歴を管理
- **レビュー**: テンプレート変更時はチームでレビュー
- **文書化**: テンプレートの使用方法を文書化

## 🔍 mdckコマンドの使用

### リンティング
```bash
# チェックリストの構文チェック
mdck lint examples/dev/

# 特定ファイルのチェック
mdck lint examples/dev/code-review-example.md
```

### テンプレート生成
```bash
# テンプレートからチェックリスト生成
mdck generate code-review-checklist --var project="MyProject"
```

### 検証
```bash
# テンプレート参照の整合性チェック
mdck validate examples/dev/
```

## 📚 関連ドキュメント

- [mdck パーサー仕様](../../docs/parser/mdck_parser.md)
- [mdck CLI使用方法](../../docs/cli/mdck_cli.md)
- [VS Code拡張機能](../../docs/vscode-ext/mdck_vscode.md)

## 🤝 コントリビューション

このサンプルの改善提案や新しいテンプレートの追加は歓迎します。
プルリクエストを作成する前に、既存のテンプレート構造に従ってください。