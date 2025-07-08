// src/commands/completion.ts
import { Command } from 'commander';
import { MdckParser } from '@mdck/parser';
import type { CompletionOptions, CliResult } from '../types';
import { logger } from '../utils/logger';
import { ExitCodes } from '../utils/exit-codes';

/**
 * completionコマンドの実装
 */
export function createCompletionCommand(): Command {
  const command = new Command('completion');

  command
    .description('Generate shell completion scripts or provide completions')
    .option('--shell <shell>', 'Shell type (bash, zsh, fish)')
    .option('--type <type>', 'Completion type (template, rule, file, config)')
    .option('--current <text>', 'Current input text for completion')
    .option('--install', 'Install completion script')
    .action(async (options: CompletionOptions & { install?: boolean }) => {
      const result = await executeCompletionCommand(options);
      process.exit(result.exitCode);
    });

  return command;
}

/**
 * completionコマンドの実行
 */
export async function executeCompletionCommand(options: CompletionOptions & { install?: boolean }): Promise<CliResult> {
  try {
    // インストールスクリプト生成
    if (options.install) {
      return generateInstallScript(options.shell || 'bash');
    }

    // 補完候補生成
    if (options.type) {
      return generateCompletions(options);
    }

    // デフォルト: 補完スクリプト出力
    return generateCompletionScript(options.shell || 'bash');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Completion command failed: ${message}`);

    return {
      success: false,
      exitCode: ExitCodes.GENERAL_ERROR,
      message,
    };
  }
}

/**
 * 補完候補を生成
 */
async function generateCompletions(options: CompletionOptions): Promise<CliResult> {
  const completions: string[] = [];

  switch (options.type) {
    case 'template':
      completions.push(...await getTemplateCompletions(options.current));
      break;
    case 'rule':
      completions.push(...getRuleCompletions(options.current));
      break;
    case 'file':
      completions.push(...await getFileCompletions(options.current));
      break;
    case 'config':
      completions.push(...getConfigCompletions(options.current));
      break;
    default:
      return {
        success: false,
        exitCode: ExitCodes.INVALID_ARGUMENT,
        message: `Unknown completion type: ${options.type}`,
      };
  }

  // 補完候補を出力
  for (const completion of completions) {
    console.log(completion);
  }

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    data: { completions },
  };
}

/**
 * テンプレート補完候補を取得
 */
async function getTemplateCompletions(current?: string): Promise<string[]> {
  try {
    const parser = new MdckParser();
    const projectRoot = process.cwd();
    parser.initializeCache(projectRoot);

    const cacheData = await parser.getCacheData();
    if (!cacheData) {
      return [];
    }

    const templateIds = Array.from(cacheData.templates.keys());
    
    if (current) {
      return templateIds.filter(id => id.startsWith(current));
    }

    return templateIds.sort();
  } catch {
    return [];
  }
}

/**
 * ルール補完候補を取得
 */
function getRuleCompletions(current?: string): string[] {
  const rules = [
    'M002', 'M003', 'M004', 'M005', 'M006',
    'M010', 'M011', 'M020', 'M021', 'M022',
    'M030', 'M040', 'M041', 'M042', 'M043',
    'M051', 'M060', 'M061'
  ];

  if (current) {
    return rules.filter(rule => rule.startsWith(current.toUpperCase()));
  }

  return rules;
}

/**
 * ファイル補完候補を取得
 */
async function getFileCompletions(current?: string): Promise<string[]> {
  try {
    const { FileFinder } = await import('../utils/file-finder');
    const fileFinder = new FileFinder();
    const searchResult = await fileFinder.findMarkdownFiles();

    let files = searchResult.files.map(file => {
      // 相対パスに変換
      const cwd = process.cwd();
      return file.startsWith(cwd) ? file.slice(cwd.length + 1) : file;
    });

    if (current) {
      files = files.filter(file => file.startsWith(current));
    }

    return files.sort();
  } catch {
    return [];
  }
}

/**
 * 設定補完候補を取得
 */
function getConfigCompletions(current?: string): string[] {
  const configKeys = [
    'rules',
    'format',
    'cache.enabled',
    'cache.maxAge',
    'lint.rules',
    'lint.format',
    'generate.defaultTemplate',
  ];

  if (current) {
    return configKeys.filter(key => key.startsWith(current));
  }

  return configKeys;
}

/**
 * 補完スクリプトを生成
 */
function generateCompletionScript(shell: string): CliResult {
  let script = '';

  switch (shell) {
    case 'bash':
      script = generateBashCompletionScript();
      break;
    case 'zsh':
      script = generateZshCompletionScript();
      break;
    case 'fish':
      script = generateFishCompletionScript();
      break;
    default:
      return {
        success: false,
        exitCode: ExitCodes.INVALID_ARGUMENT,
        message: `Unsupported shell: ${shell}`,
      };
  }

  console.log(script);

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    data: { shell, script },
  };
}

/**
 * インストールスクリプトを生成
 */
function generateInstallScript(shell: string): CliResult {
  let instructions = '';

  switch (shell) {
    case 'bash':
      instructions = `# Add this to your ~/.bashrc:
eval "$(mdck completion --shell bash)"

# Or save to a file and source it:
mdck completion --shell bash > ~/.mdck-completion.bash
echo 'source ~/.mdck-completion.bash' >> ~/.bashrc`;
      break;
    case 'zsh':
      instructions = `# Add this to your ~/.zshrc:
eval "$(mdck completion --shell zsh)"

# Or save to a file and source it:
mdck completion --shell zsh > ~/.mdck-completion.zsh
echo 'source ~/.mdck-completion.zsh' >> ~/.zshrc`;
      break;
    case 'fish':
      instructions = `# Save completion script:
mdck completion --shell fish > ~/.config/fish/completions/mdck.fish`;
      break;
    default:
      return {
        success: false,
        exitCode: ExitCodes.INVALID_ARGUMENT,
        message: `Unsupported shell: ${shell}`,
      };
  }

  console.log(instructions);

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    data: { shell, instructions },
  };
}

/**
 * Bash補完スクリプト
 */
function generateBashCompletionScript(): string {
  return `_mdck_completion() {
    local cur prev words cword
    _init_completion || return

    case $prev in
        --format|-f)
            COMPREPLY=($(compgen -W "console json sarif junit" -- "$cur"))
            return
            ;;
        --shell)
            COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur"))
            return
            ;;
        generate)
            local templates=$(mdck completion --type template --current "$cur" 2>/dev/null)
            COMPREPLY=($(compgen -W "$templates" -- "$cur"))
            return
            ;;
    esac

    case $cword in
        1)
            COMPREPLY=($(compgen -W "lint generate cache validate completion" -- "$cur"))
            ;;
        *)
            case ${words[1]} in
                lint|validate)
                    local files=$(mdck completion --type file --current "$cur" 2>/dev/null)
                    COMPREPLY=($(compgen -W "$files" -- "$cur"))
                    ;;
            esac
            ;;
    esac
}

complete -F _mdck_completion mdck`;
}

/**
 * Zsh補完スクリプト
 */
function generateZshCompletionScript(): string {
  return `#compdef mdck

_mdck() {
    local context state line
    typeset -A opt_args

    _arguments -C \\
        '1: :_mdck_commands' \\
        '*::arg:->args'

    case $state in
        args)
            case $words[1] in
                lint|validate)
                    _files -g "*.md"
                    ;;
                generate)
                    _mdck_templates
                    ;;
            esac
            ;;
    esac
}

_mdck_commands() {
    local commands
    commands=(
        'lint:Lint mdck files'
        'generate:Generate content from templates'
        'cache:Manage cache'
        'validate:Validate mdck files'
        'completion:Generate completion scripts'
    )
    _describe 'commands' commands
}

_mdck_templates() {
    local templates
    templates=($(mdck completion --type template 2>/dev/null))
    _describe 'templates' templates
}

_mdck "$@"`;
}

/**
 * Fish補完スクリプト
 */
function generateFishCompletionScript(): string {
  return `# mdck completion for fish shell

# Commands
complete -c mdck -n '__fish_use_subcommand' -a 'lint' -d 'Lint mdck files'
complete -c mdck -n '__fish_use_subcommand' -a 'generate' -d 'Generate content from templates'
complete -c mdck -n '__fish_use_subcommand' -a 'cache' -d 'Manage cache'
complete -c mdck -n '__fish_use_subcommand' -a 'validate' -d 'Validate mdck files'
complete -c mdck -n '__fish_use_subcommand' -a 'completion' -d 'Generate completion scripts'

# Lint command options
complete -c mdck -n '__fish_seen_subcommand_from lint' -s f -l format -a 'console json sarif junit' -d 'Output format'
complete -c mdck -n '__fish_seen_subcommand_from lint' -s o -l output -d 'Output file'
complete -c mdck -n '__fish_seen_subcommand_from lint' -l rules -d 'Rules to enable'
complete -c mdck -n '__fish_seen_subcommand_from lint' -l disable-rules -d 'Rules to disable'
complete -c mdck -n '__fish_seen_subcommand_from lint' -l fix -d 'Auto-fix problems'
complete -c mdck -n '__fish_seen_subcommand_from lint' -l cache -d 'Use cache'
complete -c mdck -n '__fish_seen_subcommand_from lint' -l verbose -d 'Verbose output'
complete -c mdck -n '__fish_seen_subcommand_from lint' -l quiet -d 'Quiet mode'

# Generate command options
complete -c mdck -n '__fish_seen_subcommand_from generate' -s o -l output -d 'Output file'
complete -c mdck -n '__fish_seen_subcommand_from generate' -s f -l force -d 'Overwrite existing files'
complete -c mdck -n '__fish_seen_subcommand_from generate' -l var -d 'Set template variables'

# Cache command options
complete -c mdck -n '__fish_seen_subcommand_from cache' -l clear -d 'Clear cache'
complete -c mdck -n '__fish_seen_subcommand_from cache' -l rebuild -d 'Rebuild cache'
complete -c mdck -n '__fish_seen_subcommand_from cache' -l info -d 'Show cache info'

# File completion for lint and validate
complete -c mdck -n '__fish_seen_subcommand_from lint validate' -a '(find . -name "*.md" -type f)'

# Template completion for generate
complete -c mdck -n '__fish_seen_subcommand_from generate' -a '(mdck completion --type template 2>/dev/null)'`;
}