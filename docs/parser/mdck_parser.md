# @mdck/parser 仕様詳細（完全版）

## 1. 概要

@mdck/parserは、拡張Markdown記法によるチェックリスト管理システムのコアパッケージです。Parser と Linter を統合し、remarkとremark-directiveを使用したAST（mdast）ベースの高速な解析・検証を提供します。純粋にパース・Lint機能に特化し、軽量で高速な動作を実現します。

## 2. 依存関係仕様

### 2.1 実行時依存関係

```json
{
  "dependencies": {
    "remark": "^15.0.1",
    "remark-directive": "^3.0.0",
    "unified": "^11.0.4",
    "mdast-util-directive": "^3.0.0",
    "yaml": "^2.3.4"
  }
}
```

### 2.2 開発時依存関係

```json
{
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/node": "^20.8.7",
    "@types/mdast": "^4.0.3",
    "vitest": "^0.34.6",
    "eslint": "^8.52.0",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "tsup": "^7.2.0",
    "rimraf": "^5.0.5"
  }
}
```

### 2.3 依存関係の詳細

| パッケージ               | 用途                             | 使用箇所                  |
| :----------------------- | :------------------------------- | :------------------------ |
| **remark**               | Markdownパース・レンダリング     | Tokenizer クラス          |
| **remark-directive**     | ディレクティブ記法解析           | DirectiveProcessor クラス |
| **unified**              | プラグイン統合・処理パイプライン | Parser統合                |
| **mdast-util-directive** | ディレクティブASTユーティリティ  | AST操作                   |
| **yaml**                 | config.yml読み込み               | ConfigLoader クラス       |

### 2.4 Node.js 標準ライブラリ使用

```typescript

// ファイルI/O
import { readFile, writeFile, mkdir, access, readdir } from 'fs/promises';
import { existsSync } from 'fs';

// パス操作
import path from 'path';

// Git操作
import { execSync } from 'child_process';

```

## 3. パッケージ構造

```

@mdck/parser/
├── src/
│   ├── index.ts              \# 統合API
│   ├── core/
│   │   ├── parser.ts         \# remark統合パーサー
│   │   ├── directive-processor.ts \# ディレクティブ処理
│   │   └── file-resolver.ts  \# 外部ファイル解決
│   ├── linter/
│   │   ├── rule-engine.ts    \# ルール実行エンジン
│   │   ├── rules/            \# M001-M061 ルール実装
│   │   │   ├── template-rules.ts \# M001-M005
│   │   │   ├── item-rules.ts     \# M010-M011
│   │   │   ├── result-rules.ts   \# M020-M022
│   │   │   ├── syntax-rules.ts   \# M030-M043
│   │   │   └── info-rules.ts     \# M050-M061
│   │   └── config-loader.ts  \# config.yml 読み込み
│   ├── cache/
│   │   ├── cache-manager.ts  \# キャッシュ管理
│   │   └── metadata-extractor.ts \# メタデータ抽出
│   ├── shared/
│   │   ├── types.ts          \# 型定義
│   │   ├── constants.ts      \# 定数
│   │   └── utils.ts          \# ユーティリティ
│   └── git/
│       └── diff-analyzer.ts  \# Git 差分解析
├── package.json
├── tsconfig.json
└── README.md

```

## 4. データフロー

```

Markdown Input
↓
[Remark Parser] → mdast (AST)
↓
[Directive Processor] → Expanded AST
↓
[Linter Engine] → LintResult[]
↓
[Cache Manager] → CacheData

```

## 5. 統合API

### 5.1 メインクラス

```typescript
export class MdckParser {
  private parser: RemarkParser;
  private directiveProcessor: DirectiveProcessor;
  private ruleEngine: RuleEngine;
  private cacheManager: CacheManager;
  private config: MdckConfig;

  constructor(options?: ParserOptions) {
    this.parser = new RemarkParser();
    this.directiveProcessor = new DirectiveProcessor();
    this.cacheManager = new CacheManager(options?.projectRoot || process.cwd());
    this.config = this.getDefaultConfig();
    this.ruleEngine = new RuleEngine(this.config);
  }

  // 基本機能
  async parse(content: string, filePath?: string): Promise<ParseResult> {
    const ast = this.parser.parse(content);
    const templateDefinitions =
      await this.directiveProcessor.collectDefinitions(ast, filePath);
    const metadata = await this.extractMetadata(ast, filePath);

    return {
      ast,
      templateDefinitions,
      itemIds: metadata.itemIds,
      templateIds: metadata.templateIds,
      metadata,
    };
  }

  async lint(content: string, filePath?: string): Promise<LintResult[]> {
    const parseResult = await this.parse(content, filePath);
    return await this.ruleEngine.lint(parseResult.ast, filePath);
  }

  async process(content: string, filePath?: string): Promise<ProcessResult> {
    const parseResult = await this.parse(content, filePath);
    const lintResults = await this.ruleEngine.lint(parseResult.ast, filePath);
    const cacheData = await this.cacheManager.getCacheData();

    return {
      ...parseResult,
      lintResults,
      cacheData,
    };
  }

  // テンプレート展開
  async expandTemplate(
    templateId: string,
    definitions?: TemplateDefinitions
  ): Promise<string> {
    const defs =
      definitions || (await this.directiveProcessor.collectAllDefinitions());
    const expandedAst = await this.directiveProcessor.expandTemplate(
      templateId,
      defs
    );
    return this.parser.stringify(expandedAst);
  }

  // キャッシュ管理
  async getCacheData(): Promise<CacheData> {
    return await this.cacheManager.getCacheData();
  }

  async refreshCache(projectRoot?: string): Promise<void> {
    if (projectRoot) {
      this.cacheManager = new CacheManager(projectRoot);
    }
    await this.cacheManager.refreshCache();
  }

  async invalidateCache(): Promise<void> {
    await this.cacheManager.invalidateCache();
  }

  // Git 連携
  async analyzeGitDiff(filePath: string): Promise<GitDiffResult> {
    const diffAnalyzer = new GitDiffAnalyzer();
    return await diffAnalyzer.analyzeTemplateIdChanges(filePath);
  }

  // 設定管理
  async loadConfig(configPath?: string): Promise<void> {
    const configLoader = new ConfigLoader();
    this.config = await configLoader.loadConfig(configPath);
    this.ruleEngine = new RuleEngine(this.config);
  }

  updateConfig(config: Partial<MdckConfig>): void {
    this.config = { ...this.config, ...config };
    this.ruleEngine = new RuleEngine(this.config);
  }
}
```

### 5.2 型定義

```typescript
import type { Root, Node } from 'mdast';
import type { Directive } from 'mdast-util-directive';

interface ParseResult {
  ast: Root;
  templateDefinitions: Map<string, TemplateDefinition>;
  itemIds: string[];
  templateIds: string[];
  metadata: FileMetadata;
}

interface ProcessResult extends ParseResult {
  lintResults: LintResult[];
  cacheData: CacheData;
}

interface LintResult {
  rule: string; // M001-M061
  severity: 'error' | 'warn' | 'info';
  message: string;
  line: number;
  column?: number;
  fixable?: boolean;
  fix?: FixSuggestion;
}

interface TemplateDefinition {
  id: string;
  templateId?: string;
  ast: Root;
  filePath?: string;
  startLine: number;
  endLine: number;
  dependencies: string[]; // 参照している他のテンプレート
}

interface CacheData {
  templateIds: string[];
  itemIds: string[];
  externalRefs: Record<string, string>;
  lastUpdated: number;
  metadata: ProjectMetadata;
}

interface MdckConfig {
  rules: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  settings: {
    itemIdFormat: string;
    maxResultLength: number;
    allowCustomItems: boolean;
    autoFixEnabled: boolean;
    templatePaths: string[];
  };
  cache?: {
    enabled: boolean;
    refreshInterval: number;
    maxSize: number;
  };
}
```

## 6. 依存関係使用実装

### 6.1 remarkとremark-directiveの使用

```typescript
// src/core/parser.ts
import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import { unified } from 'unified';
import type { Root } from 'mdast';

export class RemarkParser {
  private processor: ReturnType<typeof unified>;

  constructor() {
    this.processor = remark().use(remarkDirective).data('settings', {
      bullet: '-',
      emphasis: '*',
      strong: '*',
      fence: '`',
      fences: true,
      incrementListMarker: false,
    });
  }

  parse(content: string): Root {
    const result = this.processor.parse(content);
    return result as Root;
  }

  stringify(ast: Root): string {
    return this.processor.stringify(ast);
  }

  // ディレクティブ検出
  extractDirectives(ast: Root): DirectiveInfo[] {
    const directives: DirectiveInfo[] = [];

    function visit(node: Node) {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const directive = node as Directive;
        if (['template', 'tag', 'result'].includes(directive.name)) {
          directives.push({
            type: directive.type,
            name: directive.name,
            attributes: directive.attributes || {},
            position: directive.position,
            children: directive.children || [],
          });
        }
      }

      if ('children' in node && node.children) {
        node.children.forEach(visit);
      }
    }

    visit(ast);
    return directives;
  }
}
```

### 6.2 yaml の使用

```typescript
// src/linter/config-loader.ts
import * as yaml from 'yaml';
import { readFile, access } from 'fs/promises';
import path from 'path';

export class ConfigLoader {
  async loadConfig(configPath?: string): Promise<MdckConfig> {
    const configFile = configPath || (await this.findConfigFile());

    if (!configFile || !(await this.fileExists(configFile))) {
      return this.getDefaultConfig();
    }

    try {
      const yamlContent = await readFile(configFile, 'utf8');
      const config = yaml.parse(yamlContent);
      return this.validateAndMergeConfig(config);
    } catch (error) {
      throw new Error(
        `Failed to parse config file: ${configFile} - ${error.message}`
      );
    }
  }

  private async findConfigFile(
    startDir = process.cwd()
  ): Promise<string | null> {
    const configPaths = [
      '.mdck/config.yml',
      '.mdck/config.yaml',
      'mdck.config.yml',
    ];

    for (const configPath of configPaths) {
      const fullPath = path.join(startDir, configPath);
      try {
        await access(fullPath);
        return fullPath;
      } catch {
        // ファイルが存在しない場合は次を試す
      }
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getDefaultConfig(): MdckConfig {
    return {
      rules: {
        M001: 'error',
        M002: 'error',
        M003: 'error',
        M004: 'error',
        M005: 'error',
        M010: 'error',
        M011: 'warn',
        M020: 'error',
        M021: 'warn',
        M022: 'warn',
        M030: 'error',
        M040: 'error',
        M041: 'error',
        M042: 'error',
        M043: 'error',
        M050: 'error',
        M060: 'info',
        M061: 'warn',
      },
      settings: {
        itemIdFormat: '^[a-zA-Z0-9_-]+\$',
        maxResultLength: 2000,
        allowCustomItems: true,
        autoFixEnabled: true,
        templatePaths: ['./templates/**/*.md'],
      },
      cache: {
        enabled: true,
        refreshInterval: 5000,
        maxSize: 1000,
      },
    };
  }
}
```

### 6.3 mdast-util-directiveの使用

```typescript
// src/shared/utils.ts
import {
  directiveFromMarkdown,
  directiveToMarkdown,
} from 'mdast-util-directive';
import type { Directive } from 'mdast-util-directive';

export function parseDirectiveAttributes(
  directive: Directive
): Record<string, string | boolean> {
  const attributes: Record<string, string | boolean> = {};

  if (directive.attributes) {
    Object.entries(directive.attributes).forEach(([key, value]) => {
      // \#id=value → id: value
      if (key.startsWith('\#')) {
        attributes[key.slice(1)] = value;
      }
      // mandatory=true → mandatory: true
      else if (value === 'true' || value === 'false') {
        attributes[key] = value === 'true';
      }
      // その他の属性
      else {
        attributes[key] = value;
      }
    });
  }

  return attributes;
}

export function extractTemplateId(directive: Directive): string | null {
  const attributes = parseDirectiveAttributes(directive);
  return (attributes.id as string) || null;
}

export function extractItemId(directive: Directive): string | null {
  const attributes = parseDirectiveAttributes(directive);
  return (attributes.id as string) || null;
}

export function isMandatory(directive: Directive): boolean {
  const attributes = parseDirectiveAttributes(directive);
  return attributes.mandatory === true;
}
```

## 7. ディレクティブ処理

### 7.1 ディレクティブプロセッサー

```typescript

// src/core/directive-processor.ts
import type { Root, Node } from 'mdast';
import type { Directive } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

export class DirectiveProcessor {
private definitions = new Map<string, TemplateDefinition>();
private fileResolver: FileResolver;

constructor() {
this.fileResolver = new FileResolver();
}

async collectDefinitions(
ast: Root,
filePath?: string
): Promise<Map<string, TemplateDefinition>> {
// 同一ファイル内の定義を収集
await this.collectLocalDefinitions(ast, filePath);

    // 外部ファイル参照を解決
    await this.resolveExternalReferences(ast, filePath);

    return this.definitions;
    }

private async collectLocalDefinitions(ast: Root, filePath?: string): Promise<void> {
visit(ast, 'containerDirective', (node: Directive) => {
if (node.name === 'template' \&\& node.attributes) {
const templateId = extractTemplateId(node);

        if (!templateId) {
          throw new Error('Template directive missing id attribute');
        }

        // 重複チェック（M002）
        if (this.definitions.has(templateId)) {
          throw new Error(`Duplicate template definition: ${templateId}`);
        }

        const def: TemplateDefinition = {
          id: templateId,
          ast: {
            type: 'root',
            children: node.children || []
          },
          filePath,
          startLine: node.position?.start.line || 0,
          endLine: node.position?.end.line || 0,
          dependencies: this.extractDependencies(node)
        };

        this.definitions.set(templateId, def);
      }
    });
    }

private extractDependencies(node: Directive): string[] {
const dependencies: string[] = [];

    visit(node, 'leafDirective', (leafNode: Directive) => {
      if (leafNode.name === 'template' && leafNode.attributes) {
        const refId = extractTemplateId(leafNode);
        if (refId) {
          dependencies.push(refId);
        }
      }
    });

    return dependencies;
    }

async expandTemplate(
templateId: string,
definitions: Map<string, TemplateDefinition>,
visited: Set<string> = new Set()
): Promise<Root> {
// 循環参照チェック（M004）
if (visited.has(templateId)) {
throw new Error(`Circular reference detected: ${Array.from(visited).join(' → ')} → ${templateId}`);
}

    visited.add(templateId);

    const definition = definitions.get(templateId);
    if (!definition) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const expandedAst: Root = {
      type: 'root',
      children: []
    };

    // 定義のASTを展開
    for (const child of definition.ast.children) {
      if (child.type === 'leafDirective' && (child as Directive).name === 'template') {
        const refId = extractTemplateId(child as Directive);
        if (refId) {
          const expandedRef = await this.expandTemplate(refId, definitions, new Set(visited));
          expandedAst.children.push(...expandedRef.children);
        }
      } else {
        expandedAst.children.push(child);
      }
    }

    visited.delete(templateId);
    return expandedAst;
    }
}

```

### 7.2 外部ファイル解決

```typescript
// src/core/file-resolver.ts
import type { Root } from 'mdast';
import { RemarkParser } from './parser.js';

export class FileResolver {
  private cache = new Map<string, Root>();
  private parser: RemarkParser;

  constructor() {
    this.parser = new RemarkParser();
  }

  async resolveExternalFile(srcPath: string, basePath?: string): Promise<Root> {
    const resolvedPath = this.resolvePath(srcPath, basePath);

    // キャッシュチェック
    if (this.cache.has(resolvedPath)) {
      return this.cache.get(resolvedPath)!;
    }

    // ファイル存在チェック（M005）
    if (!(await this.fileExists(resolvedPath))) {
      throw new Error(`External file not found: ${srcPath}`);
    }

    const content = await readFile(resolvedPath, 'utf8');
    const ast = this.parser.parse(content);

    this.cache.set(resolvedPath, ast);
    return ast;
  }

  private resolvePath(srcPath: string, basePath?: string): string {
    if (path.isAbsolute(srcPath)) {
      return srcPath;
    }

    const base = basePath ? path.dirname(basePath) : process.cwd();
    return path.resolve(base, srcPath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
```

## 8. Linter エンジン

### 8.1 ルールエンジン

```typescript

// src/linter/rule-engine.ts
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

export class RuleEngine {
private rules: Map<string, LintRule> = new Map();
private config: MdckConfig;

constructor(config: MdckConfig) {
this.config = config;
this.loadRules();
}

async lint(ast: Root, filePath?: string): Promise<LintResult[]> {
const results: LintResult[] = [];

    for (const [ruleId, rule] of this.rules) {
      if (this.isRuleEnabled(ruleId)) {
        try {
          const ruleResults = await rule.check(ast, filePath, this.config);
          results.push(...ruleResults);
        } catch (error) {
          console.warn(`Rule ${ruleId} failed:`, error);
        }
      }
    }

    return this.filterBySeverity(results);
    }

private loadRules(): void {
// テンプレート関連ルール（M001-M005）
this.rules.set('M001', new TemplateIdImmutableRule());
this.rules.set('M002', new TemplateDuplicateRule());
this.rules.set('M003', new TemplateUndefinedRule());
this.rules.set('M004', new CircularReferenceRule());
this.rules.set('M005', new ExternalFileNotFoundRule());

    // 項目関連ルール（M010-M011）
    this.rules.set('M010', new ItemIdDuplicateRule());
    this.rules.set('M011', new ItemIdFormatRule());

    // 結果関連ルール（M020-M022）
    this.rules.set('M020', new RequiredResultMissingRule());
    this.rules.set('M021', new ResultLengthExceedsRule());
    this.rules.set('M022', new ResultContentEmptyRule());

    // 構文関連ルール（M030-M043）
    this.rules.set('M030', new CheckboxFormatRule());
    this.rules.set('M040', new DirectiveSyntaxRule());
    this.rules.set('M041', new TagSyntaxRule());
    this.rules.set('M042', new ResultSyntaxRule());
    this.rules.set('M043', new SelfClosingTagRule());

    // その他（M050-M061）
    this.rules.set('M050', new GitConflictRule());
    this.rules.set('M060', new CustomItemRule());
    this.rules.set('M061', new UnusedTemplateRule());
    }

private isRuleEnabled(ruleId: string): boolean {
const setting = this.config.rules[ruleId];
return setting !== 'off';
}

private filterBySeverity(results: LintResult[]): LintResult[] {
return results.filter(result => {
const setting = this.config.rules[result.rule];
return setting \&\& setting !== 'off';
});
}
}

```

### 8.2 主要ルール実装例

```typescript
// src/linter/rules/template-rules.ts
import type { Root } from 'mdast';
import type { Directive } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

export class TemplateIdImmutableRule extends BaseLintRule {
  id = 'M001';
  severity = 'error' as const;

  async check(ast: Root, filePath?: string): Promise<LintResult[]> {
    if (!filePath) return [];

    const diffAnalyzer = new GitDiffAnalyzer();
    const changes = await diffAnalyzer.analyzeTemplateIdChanges(filePath);

    return changes.map((change) =>
      this.createResult(
        `Template id "${change.oldValue}" cannot be changed to "${change.newValue}"`,
        change.line
      )
    );
  }
}

export class ItemIdDuplicateRule extends BaseLintRule {
  id = 'M010';
  severity = 'error' as const;

  async check(ast: Root): Promise<LintResult[]> {
    const itemIds = new Map<string, number>();
    const results: LintResult[] = [];

    visit(ast, 'leafDirective', (node: Directive) => {
      if (node.name === 'tag' && node.attributes) {
        const itemId = extractItemId(node);
        if (itemId) {
          if (itemIds.has(itemId)) {
            results.push(
              this.createResult(
                `Duplicate item id: "${itemId}"`,
                node.position?.start.line || 0
              )
            );
          }
          itemIds.set(itemId, node.position?.start.line || 0);
        }
      }
    });

    return results;
  }
}

export class RequiredResultMissingRule extends BaseLintRule {
  id = 'M020';
  severity = 'error' as const;

  async check(ast: Root): Promise<LintResult[]> {
    const results: LintResult[] = [];

    visit(ast, 'leafDirective', (node: Directive, index, parent) => {
      if (node.name === 'tag' && isMandatory(node)) {
        // 直後のresultディレクティブを探す
        const resultNode = this.findNextResultDirective(parent, index);

        if (!resultNode) {
          results.push(
            this.createResult(
              'Missing required result block',
              node.position?.start.line || 0,
              true,
              {
                insertAfter: node.position?.end.line || 0,
                text: '\n::result{}\n\n::',
              }
            )
          );
        }
      }
    });

    return results;
  }

  private findNextResultDirective(
    parent: any,
    currentIndex: number
  ): Directive | null {
    if (!parent || !parent.children) return null;

    for (let i = currentIndex + 1; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (child.type === 'containerDirective' && child.name === 'result') {
        return child as Directive;
      }
      // 別のリスト項目に達したら検索終了
      if (child.type === 'listItem') {
        break;
      }
    }

    return null;
  }
}
```

## 10. 使用例

### 10.1 基本的な使用

```

import { MdckParser } from '@mdck/parser';

const parser = new MdckParser();

// 設定ファイル読み込み
await parser.loadConfig('.mdck/config.yml');

// ファイル処理
const result = await parser.process(markdownContent, 'template.md');

console.log('Template IDs:', result.templateIds);
console.log('Item IDs:', result.itemIds);
console.log('Lint Results:', result.lintResults);

// キャッシュ更新
await parser.refreshCache();

```

### 10.2 他パッケージでの使用

```

// @mdck/cli での使用例
import { MdckParser } from '@mdck/parser';

export class CliProcessor {
private parser = new MdckParser();

async lintFiles(files: string[]): Promise<void> {
await this.parser.loadConfig();

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const results = await this.parser.lint(content, file);

      this.outputResults(results);
    }
    }
}

// @mdck/vscode-ext での使用例
export class MdckDiagnosticProvider {
private parser = new MdckParser();

async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
const lintResults = await this.parser.lint(document.getText(), document.fileName);

    const diagnostics = lintResults.map(result =>
      new vscode.Diagnostic(
        new vscode.Range(result.line - 1, 0, result.line - 1, 999),
        result.message,
        this.convertSeverity(result.severity)
      )
    );

    this.diagnosticCollection.set(document.uri, diagnostics);
    }
}

```

### 11.2 tree-shaking 対応

```json
{
  "name": "@mdck/parser",
  "version": "1.0.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 12. remarkとremark-directiveの利点

### 12.1 技術的利点

1. **標準的なMarkdownエコシステム**: remarkは広く使われているMarkdownプロセッサーで、豊富なプラグインエコシステムがあります
2. **型安全なAST**: mdastによる型安全なAST操作で、堅牢なパースが可能です
3. **ディレクティブ記法**: remark-directiveにより、`::`記法による自然なMarkdown拡張が実現できます
4. **プラグインアーキテクチャ**: 統一されたプラグインシステムで拡張性が高いです

### 12.2 パフォーマンス利点

1. **最適化されたパーサー**: remarkは高度に最適化されており、大きなファイルでも高速に処理できます
2. **メモリ効率**: AST構造により、メモリ使用量を抑えた処理が可能です
3. **キャッシュ機能**: AST をキャッシュすることで、再解析のコストを削減できます

この仕様により、@mdck/parserは標準的なMarkdownエコシステムに準拠した、軽量で高速、かつ拡張可能なチェックリスト解析・検証パッケージとして機能します。remarkとremark-directiveを活用することで、メンテナンス性とパフォーマンスの両立を実現しています。
