# @mdck/cli 仕様詳細（remark+remark-directive版）

## 1. 概要

@mdck/cli は、remarkとremark-directiveによる拡張Markdown記法を用いたチェックリスト管理システムのコマンドラインインターフェースです。実行ロジックは@mdck/parser に 100%依存し、CLI 固有の機能として引数解析・実行制御・結果出力のみを担当します。

## 2. 依存関係仕様

### 2.1 実行時依存関係

```json
{
  "dependencies": {
    "@mdck/parser": "^1.0.0",
    "commander": "^14.0.0",
    "chalk": "^5.4.1",
    "ora": "^8.2.0"
  }
}
```

### 2.2 依存関係詳細

| パッケージ       | 用途                       | 使用箇所     |
| ---------------- | -------------------------- | ------------ |
| **@mdck/parser** | コア機能（パース・Lint）   | 全コマンド   |
| **commander**    | CLI 引数解析・サブコマンド | コマンド定義 |
| **chalk**        | 色付き出力・エラー強調     | 結果出力     |
| **ora**          | スピナー・プログレス表示   | 長時間処理   |

## 3. パッケージ構造

```

@mdck/cli/
├── src/
│   ├── index.ts              # エントリポイント
│   ├── commands/
│   │   ├── lint.ts           # lint コマンド
│   │   ├── generate.ts       # generate コマンド
│   │   ├── cache.ts          # cache コマンド
│   │   ├── config.ts         # config コマンド
│   │   ├── validate.ts       # validate コマンド
│   │   └── completion.ts     # completion コマンド
│   ├── formatters/
│   │   ├── console.ts        # コンソール出力
│   │   ├── json.ts           # JSON出力
│   │   ├── sarif.ts          # SARIF出力
│   │   └── junit.ts          # JUnit出力
│   ├── utils/
│   │   ├── logger.ts         # ログ出力
│   │   ├── file-finder.ts    # ファイル検索
│   │   └── exit-codes.ts     # 終了コード
│   └── types.ts              # 型定義
├── package.json
├── tsconfig.json
└── README.md

```

## 4. コマンド仕様

### 4.1 基本構文

```

mdck <command> [options] [files...]

```

### 4.2 グローバルオプション

| オプション  | 短縮形 | 説明             | デフォルト         |
| ----------- | ------ | ---------------- | ------------------ |
| `--config`  | `-c`   | 設定ファイルパス | `.mdck/config.yml` |
| `--format`  | `-f`   | 出力形式         | `console`          |
| `--verbose` | `-v`   | 詳細出力         | `false`            |
| `--quiet`   | `-q`   | 静音モード       | `false`            |
| `--help`    | `-h`   | ヘルプ表示       | -                  |
| `--version` | `-V`   | バージョン表示   | -                  |

### 4.3 出力形式

| 形式      | 説明                 | 用途           |
| --------- | -------------------- | -------------- |
| `console` | 色付きコンソール出力 | 開発・デバッグ |
| `json`    | JSON 形式            | スクリプト連携 |
| `sarif`   | SARIF 形式           | GitHub Actions |
| `junit`   | JUnit XML 形式       | CI/CD          |

## 5. コマンド詳細

### 5.1 lint コマンド

Markdown ファイルの静的検証を実行します。

```bash

mdck lint [files...] [options]

```

#### オプション

| オプション    | 短縮形 | 説明                 | デフォルト |
| ------------- | ------ | -------------------- | ---------- |
| `--fix`       |        | 自動修正を実行       | `false`    |
| `--rules`     | `-r`   | 特定ルールのみ実行   | 全ルール   |
| `--severity`  | `-s`   | 最小重要度           | `error`    |
| `--exit-code` |        | エラー時の終了コード | `1`        |

#### 使用例

```


# 全ファイルをlint

mdck lint

# 特定ファイルをlint

mdck lint checklists/templates/server-maintenance.md

# エラーのみ表示

mdck lint --severity error

# 自動修正付きlint

mdck lint --fix

# SARIF形式で出力（GitHub Actions用）

mdck lint --format sarif > results.sarif

```

#### 実装

```typescript
// src/commands/lint.ts
import { MdckParser } from '@mdck/parser';
import { Command } from 'commander';
import { createFormatter } from '../formatters';

export function createLintCommand(): Command {
  return new Command('lint')
    .description('Lint mdck files')
    .argument('[files...]', 'Files to lint')
    .option('--fix', 'Auto-fix issues')
    .option('-r, --rules <rules>', 'Specific rules to run')
    .option('-s, --severity <level>', 'Minimum severity level', 'error')
    .option('--exit-code <code>', 'Exit code on error', '1')
    .action(async (files: string[], options) => {
      const parser = new MdckParser();
      const formatter = createFormatter(options.format || 'console');

      try {
        // 設定読み込み
        await parser.loadConfig(options.config);

        // ファイル検索
        const targetFiles = files.length > 0 ? files : await findMdckFiles();

        // Lint実行（remarkベース@mdck/parserを使用）
        const results = await lintFiles(parser, targetFiles, options);

        // 結果出力
        formatter.output(results);

        // 終了コード設定
        const hasErrors = results.some((r) => r.severity === 'error');
        if (hasErrors) {
          process.exit(parseInt(options.exitCode));
        }
      } catch (error) {
        formatter.outputError(error);
        process.exit(1);
      }
    });
}

async function lintFiles(parser: MdckParser, files: string[], options: any) {
  const allResults = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const results = await parser.lint(content, file);

    // ルールフィルタリング
    const filteredResults = options.rules
      ? results.filter((r) => options.rules.includes(r.rule))
      : results;

    allResults.push(...filteredResults);
  }

  return allResults;
}
```

### 5.2 generate コマンド

テンプレートからチェックリストを生成します。

```bash

mdck generate <templateId> [options]
mdck gen <templateId> [options]  # エイリアス

```

#### オプション

| オプション  | 短縮形 | 説明                         | デフォルト                                   |
| ----------- | ------ | ---------------------------- | -------------------------------------------- |
| `--output`  | `-o`   | 出力ファイルパス             | `checklists/runs/YYYY-MM-DD_<templateId>.md` |
| `--expand`  | `-e`   | テンプレート展開             | `true`                                       |
| `--dry-run` |        | 実際の出力はせず結果のみ表示 | `false`                                      |

#### 使用例

```bash

# テンプレートからチェックリスト生成

mdck generate server-maintenance

# 出力先指定

mdck generate server-maintenance -o checklist.md

# ドライラン

mdck generate server-maintenance --dry-run

```

#### 実装

```typescript
// src/commands/generate.ts
export function createGenerateCommand(): Command {
  return new Command('generate')
    .alias('gen')
    .description('Generate checklist from template')
    .argument('<templateId>', 'Template ID to generate from')
    .option('-o, --output <path>', 'Output file path')
    .option('-e, --expand', 'Expand template references', true)
    .option('--dry-run', 'Show output without writing file')
    .action(async (templateId: string, options) => {
      const parser = new MdckParser();

      try {
        await parser.loadConfig(options.config);

        // remarkベースのテンプレート展開
        const expandedContent = await parser.expandTemplate(templateId);

        if (options.dryRun) {
          console.log(expandedContent);
          return;
        }

        // 出力パス決定
        const outputPath = options.output || generateOutputPath(templateId);

        // ファイル出力
        await fs.writeFile(outputPath, expandedContent, 'utf8');

        console.log(chalk.green(`✓ Generated: ${outputPath}`));
      } catch (error) {
        console.error(chalk.red(`✗ Generation failed: ${error.message}`));
        process.exit(1);
      }
    });
}

function generateOutputPath(templateId: string): string {
  const date = new Date().toISOString().split('T');
  return `runs/${date}_${templateId}.md`;
}
```

### 5.3 cache コマンド

キャッシュ管理を行います。

```bash

mdck cache <action> [options]

```

#### サブコマンド

| アクション | 説明                 |
| ---------- | -------------------- |
| `refresh`  | キャッシュを再構築   |
| `clear`    | キャッシュを削除     |
| `info`     | キャッシュ情報を表示 |

#### 使用例

```bash

# キャッシュ再構築（remarkベースのAST解析）

mdck cache refresh

# キャッシュ削除

mdck cache clear

# キャッシュ情報表示

mdck cache info

```

### 5.4 config コマンド

設定ファイルの管理を行います。

```bash

mdck config <action> [options]

```

#### サブコマンド

| アクション | 説明                   |
| ---------- | ---------------------- |
| `init`     | 初期設定ファイルを生成 |
| `show`     | 現在の設定を表示       |
| `validate` | 設定ファイルを検証     |

#### 使用例

```bash

# 初期設定生成（remarkベース設定）

mdck config init

# 設定表示

mdck config show

# 設定検証

mdck config validate

```

### 5.5 validate コマンド

プロジェクト全体の検証を行います。

```bash

mdck validate [options]

```

#### オプション

| オプション     | 説明            |
| :------------- | :-------------- |
| `--check-refs` | 外部参照の検証  |
| `--check-ids`  | ID 一意性の検証 |

## 6. 出力フォーマッター

### 6.1 Console フォーマッター

```typescript
// src/formatters/console.ts
import chalk from 'chalk';

export class ConsoleFormatter {
  output(results: LintResult[]): void {
    if (results.length === 0) {
      console.log(chalk.green('✓ No issues found'));
      return;
    }

    const grouped = this.groupByFile(results);

    for (const [file, fileResults] of grouped.entries()) {
      console.log(chalk.bold.underline(file));

      for (const result of fileResults) {
        const icon = this.getSeverityIcon(result.severity);
        const color = this.getSeverityColor(result.severity);

        console.log(
          `  ${icon} ${chalk[color](result.severity.toUpperCase())} ` +
            `${result.rule} ${result.message} ` +
            chalk.gray(`(line ${result.line})`)
        );
      }
      console.log();
    }

    this.outputSummary(results);
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error':
        return '✗';
      case 'warn':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '- ';
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'error':
        return 'red';
      case 'warn':
        return 'yellow';
      case 'info':
        return 'blue';
      default:
        return 'gray';
    }
  }

  private outputSummary(results: LintResult[]): void {
    const summary = this.calculateSummary(results);

    const parts = [];
    if (summary.errors > 0) parts.push(chalk.red(`${summary.errors} errors`));
    if (summary.warnings > 0)
      parts.push(chalk.yellow(`${summary.warnings} warnings`));
    if (summary.infos > 0) parts.push(chalk.blue(`${summary.infos} infos`));

    console.log(`Summary: ${parts.join(', ')}`);
  }
}
```

### 6.2 SARIF フォーマッター

```typescript
// src/formatters/sarif.ts
export class SarifFormatter {
  output(results: LintResult[]): void {
    const sarif = {
      version: '2.1.0',
      $schema:
        'https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'mdck',
              version: '1.0.0',
              rules: this.generateRules(results),
            },
          },
          results: results.map((result) => ({
            ruleId: result.rule,
            level: this.mapSeverity(result.severity),
            message: { text: result.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: result.file },
                  region: {
                    startLine: result.line,
                    startColumn: result.column || 1,
                  },
                },
              },
            ],
          })),
        },
      ],
    };

    console.log(JSON.stringify(sarif, null, 2));
  }

  private mapSeverity(severity: string): string {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
        return 'note';
      default:
        return 'note';
    }
  }
}
```

### 7.2 bash 補完スクリプト生成

```typescript
function generateBashCompletion(): string {
  return `
_mdck_completion() {
local cur prev opts
COMPREPLY=()
cur="${COMP_WORDS[COMP_CWORD]}"
prev="${COMP_WORDS[COMP_CWORD - 1]}"

    case ${COMP_CWORD} in
        1)
            opts="lint generate gen cache config validate completion"
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
        2)
            case ${prev} in
                generate|gen)
                    # テンプレートID補完（remarkベースキャッシュから）
                    local templates=$(mdck _completion-data templates 2>/dev/null)
                    COMPREPLY=( $(compgen -W "${templates}" -- ${cur}) )
                    return 0
                    ;;
                cache)
                    opts="refresh clear info"
                    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
                    return 0
                    ;;
                config)
                    opts="init show validate"
                    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
                    return 0
                    ;;
                completion)
                    opts="bash zsh fish"
                    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
                    return 0
                    ;;
            esac
            ;;
        *)
            # ファイル補完（.mdファイルのみ）
            COMPREPLY=( $(compgen -f -X '!*.md' -- ${cur}) )
            return 0
            ;;
    esac
    }
    complete -F _mdck_completion mdck
`;
}
```

## 8. メインエントリポイント

### 8.1 CLI 構造

```typescript
// src/index.ts
import { Command } from 'commander';
import { createLintCommand } from './commands/lint';
import { createGenerateCommand } from './commands/generate';
import { createCacheCommand } from './commands/cache';
import { createConfigCommand } from './commands/config';
import { createValidateCommand } from './commands/validate';
import {
  createCompletionCommand,
  createCompletionDataCommand,
} from './commands/completion';

const program = new Command();

program
  .name('mdck')
  .description('CLI for mdck (Markdown Check List)')
  .version('1.0.0');

// グローバルオプション
program
  .option('-c, --config <path>', 'Config file path', '.mdck/config.yml')
  .option('-f, --format <format>', 'Output format', 'console')
  .option('-v, --verbose', 'Verbose output')
  .option('-q, --quiet', 'Quiet mode');

// サブコマンド登録
program.addCommand(createLintCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createCacheCommand());
program.addCommand(createConfigCommand());
program.addCommand(createValidateCommand());
program.addCommand(createCompletionCommand());
program.addCommand(createCompletionDataCommand());

// エラーハンドリング
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  process.exit(1);
});

export default program;
```

# remarkベースのエラー

Error: Directive syntax error at line 15, column 3
Expected: ::template{#id=server-maintenance}
Found: ::Template{id=server-maintenance}
Fix: Use lowercase directive name and #id attribute

````

## 10. CI/CD 連携

### 10.1 GitHub Actions 例

```yaml

name: mdck-check
on: [push, pull_request]

jobs:
lint:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
with:
node-version: "18"
- run: npm install -g @mdck/cli
- run: mdck lint --format sarif > results.sarif
- uses: github/codeql-action/upload-sarif@v3
with:
sarif_file: results.sarif

````

### 10.2 設定例

```bash


# CI用の設定初期化（remarkベース）

mdck config init --preset ci

# テンプレート補完付きの生成

mdck generate <TAB>  # server-maintenance, security-audit, deploy-checklist

# 自動修正付きLint

mdck lint --fix --format console
```

```

## 11. パフォーマンス仕様

| 項目         | 目標値  | 測定条件                     |
| :----------- | :------ | :--------------------------- |
| 起動時間     | < 200ms | cold start                   |
| Lint 実行    | < 3s    | 100 ファイル（remarkベース） |
| 生成処理     | < 1s    | テンプレート展開込み         |
| メモリ使用量 | < 50MB  | 通常操作時                   |
| 補完応答     | < 100ms | テンプレートID補完           |

## 12. 使用例

### 12.1 開発時の使用

```

# プロジェクト初期化（remarkベース設定）

mdck config init

# 開発中のlint（ディレクティブ記法チェック）

mdck lint --fix

# テンプレートからチェックリスト生成

mdck gen server-maintenance

# キャッシュ更新（remarkベースAST）

mdck cache refresh

# シェル補完セットアップ

mdck completion bash > ~/.bash_completion.d/mdck

```

### 12.2 CI/CD での使用

```

# CI用lint（SARIF出力）

mdck lint --format sarif --severity error

# CI用lint（JUnit出力）

mdck lint --format junit --exit-code 1

# 設定検証

mdck config validate

# テンプレートの存在確認

mdck validate --check-refs

```

```
