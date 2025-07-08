# mdck 設定ファイル例

このディレクトリには、mdckプロジェクトで使用できる設定ファイルの例が含まれています。

## 📁 設定ファイル一覧

### config.yml (デフォルト設定)
標準的な開発環境向けの設定です。バランスの取れたルール設定で、ほとんどのプロジェクトに適用できます。

**特徴:**
- 全リンティングルールが有効（エラーレベル）
- キャッシュ有効
- カラー出力有効
- 外部参照サポート

### config-strict.yml (厳格設定)
CI/CD環境や本番環境向けの厳格な設定です。品質を重視し、警告でもビルドを失敗させます。

**特徴:**
- 厳格なリンティングルール
- 警告でもビルド失敗
- 外部参照無効（セキュリティ重視）
- JSON出力（CI/CD連携向け）

### config-development.yml (開発設定)
開発者向けの緩い設定です。開発効率を重視し、自動修正機能も有効にしています。

**特徴:**
- 緩いリンティングルール（警告レベル）
- 自動修正有効
- デバッグモード有効
- 部分的なテンプレート許可

## 🔧 設定項目の詳細

### lint セクション
リンティングに関する設定を定義します。

```json
{
  "lint": {
    "rules": {
      "M002": {
        "enabled": true,
        "severity": "error"
      }
    },
    "cache": true,
    "autoFix": false,
    "failOnWarning": false,
    "maxWarnings": 10
  }
}
```

#### 利用可能なルール
- **M002**: テンプレートID重複チェック
- **M003**: 未定義テンプレート参照チェック  
- **M004**: 循環参照チェック

#### 重要度レベル
- **error**: エラー（ビルド失敗）
- **warn**: 警告
- **info**: 情報

### parser セクション
パーサーの動作設定を定義します。

```json
{
  "parser": {
    "templatePaths": ["./templates/**/*.md"],
    "excludePatterns": ["**/node_modules/**"],
    "maxDepth": 10,
    "enableExternalReferences": true,
    "strictMode": false
  }
}
```

#### 主要設定項目
- **templatePaths**: テンプレートファイルの検索パス
- **excludePatterns**: 除外するファイルパターン
- **maxDepth**: テンプレート参照の最大深度
- **enableExternalReferences**: 外部ファイル参照の許可
- **strictMode**: 厳格モードの有効化

### output セクション
出力形式の設定を定義します。

```json
{
  "output": {
    "format": "console",
    "color": true,
    "verbose": false,
    "quiet": false,
    "logLevel": "info"
  }
}
```

#### 出力形式
- **console**: コンソール出力（開発向け）
- **json**: JSON形式（CI/CD向け）
- **sarif**: SARIF形式（セキュリティツール連携）
- **junit**: JUnit XML形式（テストレポート連携）

### validation セクション
検証ルールの設定を定義します。

```json
{
  "validation": {
    "requireMandatoryTags": true,
    "requireResultSections": true,
    "allowCustomItems": false,
    "enforceTagIds": true
  }
}
```

## 🚀 使用方法

### 1. 設定ファイルの選択
プロジェクトに適した設定ファイルを選択し、`.mdck/config.yml`としてコピーします。

```bash
# デフォルト設定を使用
cp .mdck/config.yml .mdck/config.yml

# 厳格設定を使用（CI/CD環境）
cp .mdck/config-strict.yml .mdck/config.yml

# 開発設定を使用（ローカル開発）
cp .mdck/config-development.yml .mdck/config.yml
```

### 2. CLIでの設定指定
コマンドライン引数で設定ファイルを指定することも可能です。

```bash
# 特定の設定ファイルを使用
mdck lint --config .mdck/config-strict.yml

# 設定値を一時的に上書き
mdck lint --rules M002,M003 --format json
```

### 3. 設定の確認
現在の設定を確認できます。

```bash
# 全設定を表示
mdck config --list

# 特定の設定値を取得
mdck config lint.rules.M002

# 設定値を変更
mdck config lint.autoFix true
```

## 🔍 設定のカスタマイズ例

### プロジェクト固有のルール設定
```json
{
  "lint": {
    "rules": {
      "M002": {
        "enabled": true,
        "severity": "error"
      },
      "M003": {
        "enabled": false
      },
      "M004": {
        "enabled": true,
        "severity": "warn"
      }
    }
  }
}
```

### 複数環境での設定管理
```bash
# 環境別設定ファイル
.mdck/
├── config.yml              # デフォルト
├── config-development.yml  # 開発環境
├── config-staging.yml      # ステージング環境
└── config-production.yml   # 本番環境

# 環境変数での切り替え
export MDCK_CONFIG=".mdck/config.${NODE_ENV}.json"
mdck lint --config $MDCK_CONFIG
```

### CI/CD での設定例
```yaml
# GitHub Actions例
- name: Lint with mdck
  run: |
    mdck lint \
      --config .mdck/config-strict.json \
      --format sarif \
      --output mdck-results.sarif
      
- name: Upload SARIF results
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: mdck-results.sarif
```

## 💡 ベストプラクティス

### 1. 環境別設定の使い分け
- **開発環境**: 緩い設定で開発効率を重視
- **CI/CD環境**: 厳格な設定で品質を保証
- **本番環境**: セキュリティを重視した設定

### 2. チーム内での設定統一
- プロジェクトルートに標準設定を配置
- `.mdck/config.json`をバージョン管理に含める
- チーム内でのルール設定を文書化

### 3. 段階的な導入
- 最初は警告レベルで導入
- チームが慣れてからエラーレベルに変更
- 新しいルールは段階的に有効化

### 4. パフォーマンスの最適化
- キャッシュ機能を有効化
- 不要なファイルを除外パターンに追加
- テンプレート参照の深度を適切に設定

## 🔗 関連ドキュメント

- [mdck CLI使用方法](../../docs/cli/mdck_cli.md)
- [パーサー設定詳細](../../docs/parser/mdck_parser.md)
- [リンティングルール詳細](../../docs/parser/mdck_linter.md)
- [VS Code拡張機能設定](../../docs/vscode-ext/mdck_vscode.md)