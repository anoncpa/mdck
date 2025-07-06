# CLI での入力補完機能

CLI でコマンドに入力補完を実装し、特にテンプレート ID 補完を@mdck/parser のキャッシュデータを活用して実現します。

## 1. 補完機能の実装方針

### 1.1 アーキテクチャ

```

Shell (bash/zsh/fish)
↓
Completion Script
↓
@mdck/cli completion command
↓
@mdck/parser cache data

```

### 1.2 補完対象

| 対象                | 説明                      | データ取得元              |
| ------------------- | ------------------------- | ------------------------- |
| **テンプレート ID** | `mdck generate <TAB>`     | @mdck/parser キャッシュ   |
| **ルール名**        | `mdck lint --rules <TAB>` | 静的定義                  |
| **ファイルパス**    | `mdck lint <TAB>`         | ファイルシステム          |
| **設定キー**        | `mdck config <TAB>`       | .mdck/config.yml スキーマ |

## 2. 実装詳細

### 2.1 completion コマンドの追加

```typescript
// src/commands/completion.ts
import { MdckParser } from "@mdck/parser";
import { Command } from "commander";

export function createCompletionCommand(): Command {
  return new Command("completion")
    .description("Generate shell completion scripts")
    .argument("<shell>", "Shell type (bash|zsh|fish)")
    .action(async (shell: string) => {
      switch (shell) {
        case "bash":
          console.log(generateBashCompletion());
          break;
        case "zsh":
          console.log(generateZshCompletion());
          break;
        case "fish":
          console.log(generateFishCompletion());
          break;
        default:
          console.error(`Unsupported shell: ${shell}`);
          process.exit(1);
      }
    });
}

// 内部コマンド：動的補完データ提供
export function createCompletionDataCommand(): Command {
  return new Command("_completion-data")
    .description("Internal: provide completion data")
    .argument("<type>", "Completion type")
    .option("--config <path>", "Config file path")
    .action(async (type: string, options) => {
      const parser = new MdckParser();
      await parser.loadConfig(options.config);

      switch (type) {
        case "templates":
          const cacheData = await parser.getCacheData();
          console.log(cacheData.templateIds.join("\n"));
          break;
        case "rules":
          console.log(getAllRuleIds().join("\n"));
          break;
        case "files":
          const files = await findMdckFiles();
          console.log(files.join("\n"));
          break;
      }
    });
}
```

### 2.2 bash 補完スクリプト生成

```typescript
function generateBashCompletion(): string {
  return `
_mdck_completion() {
local cur prev opts
COMPREPLY=()
cur="\${COMP_WORDS[COMP_CWORD]}"
prev="\${COMP_WORDS[COMP_CWORD-1]}"

    case \${COMP_CWORD} in
        1)
            opts="lint generate gen cache config validate completion"
            COMPREPLY=( \$(compgen -W "\${opts}" -- \${cur}) )
            return 0
            ;;
        2)
            case \${prev} in
                generate|gen)
                    # テンプレートID補完
                    local templates=\$(mdck _completion-data templates 2>/dev/null)
                    COMPREPLY=( \$(compgen -W "\${templates}" -- \${cur}) )
                    return 0
                    ;;
                cache)
                    opts="refresh clear info"
                    COMPREPLY=( \$(compgen -W "\${opts}" -- \${cur}) )
                    return 0
                    ;;
                config)
                    opts="init show validate"
                    COMPREPLY=( \$(compgen -W "\${opts}" -- \${cur}) )
                    return 0
                    ;;
                completion)
                    opts="bash zsh fish"
                    COMPREPLY=( \$(compgen -W "\${opts}" -- \${cur}) )
                    return 0
                    ;;
            esac
            ;;
        *)
            # ファイル補完（.mdファイルのみ）
            COMPREPLY=( \$(compgen -f -X '!*.md' -- \${cur}) )
            return 0
            ;;
    esac
    }

complete -F _mdck_completion mdck
`;
}
```

### 2.3 zsh 補完スクリプト生成

```typescript
function generateZshCompletion(): string {
  return `
#compdef mdck

_mdck() {
    local context state line
    typeset -A opt_args

    _arguments -C \\
        '1: :->commands' \\
        '2: :->args' \\
        '*: :->files'

    case \$state in
        commands)
            _values 'mdck commands' \\
                'lint[Lint mdck files]' \\
                'generate[Generate checklist from template]' \\
                'gen[Generate checklist from template]' \\
                'cache[Manage cache]' \\
                'config[Manage configuration]' \\
                'validate[Validate project]' \\
                'completion[Generate completion scripts]'
            ;;
        args)
            case \$words[2] in
                generate|gen)
                    # テンプレートID補完
                    local templates
                    templates=(\${(f)"\$(mdck _completion-data templates 2>/dev/null)"})
                    _describe 'template IDs' templates
                    ;;
                cache)
                    _values 'cache actions' \\
                        'refresh[Refresh cache]' \\
                        'clear[Clear cache]' \\
                        'info[Show cache info]'
                    ;;
                config)
                    _values 'config actions' \\
                        'init[Initialize config]' \\
                        'show[Show config]' \\
                        'validate[Validate config]'
                    ;;
                completion)
                    _values 'shells' \\
                        'bash[Bash completion]' \\
                        'zsh[Zsh completion]' \\
                        'fish[Fish completion]'
                    ;;
            esac
            ;;
        files)
            _files -g '*.md'
            ;;
    esac
}

_mdck "\$@"
`;
}
```

## 3. セットアップ手順

### 3.1 補完スクリプト生成・インストール

```bash

# bash用

mdck completion bash > /usr/local/etc/bash_completion.d/mdck

# または

mdck completion bash >> ~/.bashrc

# zsh用

mdck completion zsh > /usr/local/share/zsh/site-functions/_mdck

# または

mdck completion zsh >> ~/.zshrc

# fish用

mdck completion fish > ~/.config/fish/completions/mdck.fish

```


## 4. 高度な補完機能

### 4.1 コンテキスト依存補完

```typescript
// オプション値の動的補完
export async function getOptionCompletions(
  option: string,
  partial: string
): Promise<string[]> {
  const parser = new MdckParser();

  switch (option) {
    case "--rules":
      return getAllRuleIds().filter((id) => id.startsWith(partial));

    case "--severity":
      return ["error", "warn", "info"].filter((s) => s.startsWith(partial));

    case "--format":
      return ["console", "json", "sarif", "junit"].filter((f) =>
        f.startsWith(partial)
      );

    case "--config":
      const configFiles = await findConfigFiles();
      return configFiles.filter((f) => f.includes(partial));

    default:
      return [];
  }
}
```

### 4.2 キャッシュベース補完の最適化

```typescript
// 高速化のためキャッシュを事前読み込み
export class CompletionCache {
  private static instance: CompletionCache;
  private cache: Map<string, string[]> = new Map();
  private lastUpdate = 0;
  private readonly CACHE_TTL = 5000; // 5秒

  static getInstance(): CompletionCache {
    if (!this.instance) {
      this.instance = new CompletionCache();
    }
    return this.instance;
  }

  async getTemplateIds(): Promise<string[]> {
    const now = Date.now();

    if (this.cache.has("templates") && now - this.lastUpdate < this.CACHE_TTL) {
      return this.cache.get("templates")!;
    }

    const parser = new MdckParser();
    const cacheData = await parser.getCacheData();

    this.cache.set("templates", cacheData.templateIds);
    this.lastUpdate = now;

    return cacheData.templateIds;
  }
}
```

## 5. 使用例

### 5.1 テンプレート補完

```bash

\$ mdck generate <TAB>
server-maintenance    security-audit    deploy-checklist

\$ mdck gen sec<TAB>
security-audit

\$ mdck generate security-audit<TAB>

# オプション補完

--output  --expand  --dry-run

```

### 5.2 ルール補完

```bash

\$ mdck lint --rules <TAB>
M001  M002  M010  M020  M030  M040  M050  M060

\$ mdck lint --rules M0<TAB>
M001  M002  M010

```

### 5.3 ファイル補完

```bash

\$ mdck lint <TAB>
template.md         checklist.md        checklists/templates/
checklists/         shared/

\$ mdck lint checklists/templates/<TAB>
server-maintenance.md    security-audit.md    common.md

```

この実装により、@mdck/cli は他の現代的な CLI ツール（kubectl、docker、git など）と同等の補完体験を提供できます。特にテンプレート ID 補完は、@mdck/parser のキャッシュシステムと組み合わせることで、リアルタイムで利用可能なテンプレートを提示できる強力な機能となります。
