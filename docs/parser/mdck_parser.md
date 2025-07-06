<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# @mdck/parser 仕様詳細（完全版）

## 1. 概要

@mdck/parserは、拡張Markdown記法によるチェックリスト管理システムのコアパッケージです。Parser と Linter を統合し、トークン列ベースの高速な解析・検証を提供します。純粋にパース・Lint機能に特化し、軽量で高速な動作を実現します。

## 2. 依存関係仕様

### 2.1 実行時依存関係

```json
{
  "dependencies": {
    "markdown-it": "^13.0.2",
    "yaml": "^2.3.4",
    "fast-xml-parser": "^4.3.2"
  }
}
```


### 2.2 開発時依存関係

```json
{
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/node": "^20.8.7",
    "@types/markdown-it": "^13.0.6",
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

| パッケージ | 用途 | 使用箇所 |
| :-- | :-- | :-- |
| **markdown-it** | Markdownトークン化・パース | Tokenizer クラス |
| **yaml** | config.yml読み込み | ConfigLoader クラス |
| **fast-xml-parser** | カスタムタグ属性解析 | utils.ts の parseCustomTagAttributes |

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
│   ├── index.ts              # 統合API
│   ├── core/
│   │   ├── tokenizer.ts      # markdown-it ラッパー
│   │   ├── template-processor.ts # テンプレート展開
│   │   └── file-resolver.ts  # 外部ファイル解決
│   ├── linter/
│   │   ├── rule-engine.ts    # ルール実行エンジン
│   │   ├── rules/            # M001-M061 ルール実装
│   │   │   ├── template-rules.ts # M001-M005
│   │   │   ├── item-rules.ts     # M010-M011
│   │   │   ├── result-rules.ts   # M020-M022
│   │   │   ├── syntax-rules.ts   # M030-M043
│   │   │   └── info-rules.ts     # M050-M061
│   │   └── config-loader.ts  # config.yml 読み込み
│   ├── cache/
│   │   ├── cache-manager.ts  # キャッシュ管理
│   │   └── metadata-extractor.ts # メタデータ抽出
│   ├── shared/
│   │   ├── types.ts          # 型定義
│   │   ├── constants.ts      # 定数
│   │   └── utils.ts          # ユーティリティ
│   └── git/
│       └── diff-analyzer.ts  # Git 差分解析
├── package.json
├── tsconfig.json
└── README.md
```


## 4. データフロー

```
Markdown Input
     ↓
[Tokenizer (markdown-it)] → Token[]
     ↓
[Template Processor] → Expanded Token[]
     ↓
[Linter Engine] → LintResult[]
     ↓
[Cache Manager] → CacheData
```


## 5. 統合API

### 5.1 メインクラス

```typescript
export class MdckParser {
  private tokenizer: Tokenizer;
  private templateProcessor: TemplateProcessor;
  private ruleEngine: RuleEngine;
  private cacheManager: CacheManager;
  private config: MdckConfig;

  constructor(options?: ParserOptions) {
    this.tokenizer = new Tokenizer();
    this.templateProcessor = new TemplateProcessor();
    this.cacheManager = new CacheManager(options?.projectRoot || process.cwd());
    this.config = this.getDefaultConfig();
    this.ruleEngine = new RuleEngine(this.config);
  }

  // 基本機能
  async parse(content: string, filePath?: string): Promise<ParseResult> {
    const tokens = this.tokenizer.tokenize(content);
    const templateDefinitions = await this.templateProcessor.collectDefinitions(tokens, filePath);
    const metadata = await this.extractMetadata(tokens, filePath);

    return {
      tokens,
      templateDefinitions,
      itemIds: metadata.itemIds,
      templateIds: metadata.templateIds,
      metadata
    };
  }

  async lint(content: string, filePath?: string): Promise<LintResult[]> {
    const parseResult = await this.parse(content, filePath);
    return await this.ruleEngine.lint(parseResult.tokens, filePath);
  }

  async process(content: string, filePath?: string): Promise<ProcessResult> {
    const parseResult = await this.parse(content, filePath);
    const lintResults = await this.ruleEngine.lint(parseResult.tokens, filePath);
    const cacheData = await this.cacheManager.getCacheData();

    return {
      ...parseResult,
      lintResults,
      cacheData
    };
  }

  // テンプレート展開
  async expandTemplate(templateId: string, definitions?: TemplateDefinitions): Promise<string> {
    const defs = definitions || await this.templateProcessor.collectAllDefinitions();
    const expandedTokens = await this.templateProcessor.expandTemplate(templateId, defs);
    return this.tokenizer.render(expandedTokens);
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
interface ParseResult {
  tokens: Token[];
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
  rule: string;           // M001-M061
  severity: 'error' | 'warn' | 'info';
  message: string;
  line: number;
  column?: number;
  fixable?: boolean;
  fix?: FixSuggestion;
}

interface TemplateDefinition {
  id: string;
  templateId?: string;    // TemplateId 属性の値
  tokens: Token[];
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

### 6.1 markdown-it の使用

```typescript
// src/core/tokenizer.ts
import MarkdownIt from 'markdown-it';

export class Tokenizer {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,           // HTML タグを許可（カスタムタグのため）
      linkify: false,       // 自動リンク化を無効
      typographer: false,   // タイポグラフィ機能を無効
      breaks: false         // 改行の自動変換を無効
    });
  }

  tokenize(content: string): Token[] {
    return this.md.parse(content, {});
  }

  render(tokens: Token[]): string {
    return this.md.renderer.render(tokens, this.md.options, {});
  }

  // カスタムタグ検出
  extractCustomTags(tokens: Token[]): CustomTagInfo[] {
    const customTags: CustomTagInfo[] = [];

    tokens.forEach(token => {
      if (token.type === 'html_block' || token.type === 'html_inline') {
        const tagMatch = token.content.match(/<(Template|Tag|Result)(\s[^>]*)?>/);
        if (tagMatch) {
          const tagInfo = this.parseCustomTag(token, tagMatch);
          customTags.push(tagInfo);
        }
      }
    });

    return customTags;
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
    const configFile = configPath || await this.findConfigFile();

    if (!configFile || !await this.fileExists(configFile)) {
      return this.getDefaultConfig();
    }

    try {
      const yamlContent = await readFile(configFile, 'utf8');
      const config = yaml.parse(yamlContent);
      return this.validateAndMergeConfig(config);
    } catch (error) {
      throw new Error(`Failed to parse config file: ${configFile} - ${error.message}`);
    }
  }

  private async findConfigFile(startDir = process.cwd()): Promise<string | null> {
    const configPaths = [
      '.mdck/config.yml',
      '.mdck/config.yaml',
      'mdck.config.yml'
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
}
```


### 6.3 fast-xml-parser の使用

```typescript
// src/shared/utils.ts
import { XMLParser } from 'fast-xml-parser';

export function parseCustomTagAttributes(tagContent: string): Record<string, string> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: true,
    trimValues: true
  });

  try {
    // <Tag itemId="1" isResultRequired /> から属性を抽出
    const attrMatch = tagContent.match(/\s([^>]+)/);
    if (!attrMatch) return {};

    const wrappedContent = `<temp ${attrMatch[1]} />`;
    const parsed = parser.parse(wrappedContent);

    return parsed.temp?.['@'] || parsed.temp || {};
  } catch (error) {
    console.warn('Failed to parse tag attributes:', tagContent, error);
    return {};
  }
}

export function extractTemplateId(tagContent: string): string | null {
  const templateIdMatch = tagContent.match(/TemplateId="([^"]+)"/);
  const idMatch = tagContent.match(/\sid="([^"]+)"/);
  return templateIdMatch?.[1] || idMatch?.[1] || null;
}

export function extractItemId(tagContent: string): string | null {
  const match = tagContent.match(/itemId="([^"]+)"/);
  return match?.[1] || null;
}
```


## 7. Node.js 標準ライブラリでの実装

### 7.1 ファイル検索（glob代替）

```typescript
// src/cache/cache-manager.ts
import { readdir, stat } from 'fs/promises';
import path from 'path';

export class CacheManager {
  private async findMdckFiles(dir: string, extensions = ['.md']): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentDir: string): Promise<void> {
      try {
        const entries = await readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            // .git, node_modules などの隠しディレクトリをスキップ
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              await walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // ディレクトリアクセスエラーは無視
        console.warn(`Cannot access directory: ${currentDir}`);
      }
    }

    await walk(dir);
    return files;
  }

  // 特定パターンのファイル検索
  private async findFilesByPattern(baseDir: string, patterns: string[]): Promise<string[]> {
    const allFiles = await this.findMdckFiles(baseDir);

    return allFiles.filter(file => {
      const relativePath = path.relative(baseDir, file);
      return patterns.some(pattern => {
        // 簡易的なglob風マッチング
        const regex = new RegExp(
          pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]')
        );
        return regex.test(relativePath);
      });
    });
  }
}
```


### 7.2 プロジェクトルート検出

```typescript
// src/shared/utils.ts
import { existsSync } from 'fs';
import path from 'path';

export function findProjectRoot(startDir = process.cwd()): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    // .mdck ディレクトリの存在をチェック
    const mdckDir = path.join(currentDir, '.mdck');
    if (existsSync(mdckDir)) {
      return currentDir;
    }

    // Git リポジトリルートもチェック
    const gitDir = path.join(currentDir, '.git');
    if (existsSync(gitDir)) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  return startDir; // 見つからない場合は開始ディレクトリを返す
}
```


## 8. テンプレート処理

### 8.1 テンプレート定義収集

```typescript
// src/core/template-processor.ts
export class TemplateProcessor {
  private definitions = new Map<string, TemplateDefinition>();
  private fileResolver: FileResolver;

  constructor() {
    this.fileResolver = new FileResolver();
  }

  async collectDefinitions(
    tokens: Token[],
    filePath?: string
  ): Promise<Map<string, TemplateDefinition>> {
    // 同一ファイル内の定義を収集
    await this.collectLocalDefinitions(tokens, filePath);

    // 外部ファイル参照を解決
    await this.resolveExternalReferences(tokens, filePath);

    return this.definitions;
  }

  private async collectLocalDefinitions(tokens: Token[], filePath?: string): Promise<void> {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (this.isTemplateDefinition(token)) {
        const def = await this.parseTemplateDefinition(tokens, i, filePath);

        // 重複チェック（M002）
        if (this.definitions.has(def.id)) {
          throw new Error(`Duplicate template definition: ${def.id}`);
        }

        this.definitions.set(def.id, def);
      }
    }
  }

  private isTemplateDefinition(token: Token): boolean {
    return token.type === 'html_block' &&
           token.content.includes('<Template') &&
           !token.content.includes('/>') &&
           token.nesting === 1;
  }

  async expandTemplate(
    templateId: string,
    definitions: Map<string, TemplateDefinition>,
    visited: Set<string> = new Set()
  ): Promise<Token[]> {
    // 循環参照チェック（M004）
    if (visited.has(templateId)) {
      throw new Error(`Circular reference detected: ${Array.from(visited).join(' → ')} → ${templateId}`);
    }

    visited.add(templateId);

    const definition = definitions.get(templateId);
    if (!definition) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const expandedTokens: Token[] = [];

    for (const token of definition.tokens) {
      if (this.isTemplateReference(token)) {
        const refId = extractTemplateId(token.content);
        if (refId) {
          const expandedRef = await this.expandTemplate(refId, definitions, new Set(visited));
          expandedTokens.push(...expandedRef);
        }
      } else {
        expandedTokens.push(token);
      }
    }

    visited.delete(templateId);
    return expandedTokens;
  }
}
```


### 8.2 外部ファイル解決

```typescript
// src/core/file-resolver.ts
export class FileResolver {
  private cache = new Map<string, Token[]>();

  async resolveExternalFile(srcPath: string, basePath?: string): Promise<Token[]> {
    const resolvedPath = this.resolvePath(srcPath, basePath);

    // キャッシュチェック
    if (this.cache.has(resolvedPath)) {
      return this.cache.get(resolvedPath)!;
    }

    // ファイル存在チェック（M005）
    if (!await this.fileExists(resolvedPath)) {
      throw new Error(`External file not found: ${srcPath}`);
    }

    const content = await readFile(resolvedPath, 'utf8');
    const tokenizer = new Tokenizer();
    const tokens = tokenizer.tokenize(content);

    this.cache.set(resolvedPath, tokens);
    return tokens;
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


## 9. Linter エンジン

### 9.1 ルールエンジン

```typescript
// src/linter/rule-engine.ts
export class RuleEngine {
  private rules: Map<string, LintRule> = new Map();
  private config: MdckConfig;

  constructor(config: MdckConfig) {
    this.config = config;
    this.loadRules();
  }

  async lint(tokens: Token[], filePath?: string): Promise<LintResult[]> {
    const results: LintResult[] = [];

    for (const [ruleId, rule] of this.rules) {
      if (this.isRuleEnabled(ruleId)) {
        try {
          const ruleResults = await rule.check(tokens, filePath, this.config);
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
    this.rules.set('M040', new TemplateSyntaxRule());
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
      return setting && setting !== 'off';
    });
  }
}
```


### 9.2 主要ルール実装例

```typescript
// src/linter/rules/template-rules.ts
export class TemplateIdImmutableRule extends BaseLintRule {
  id = 'M001';
  severity = 'error' as const;

  async check(tokens: Token[], filePath?: string): Promise<LintResult[]> {
    if (!filePath) return [];

    const diffAnalyzer = new GitDiffAnalyzer();
    const changes = await diffAnalyzer.analyzeTemplateIdChanges(filePath);

    return changes.map(change =>
      this.createResult(
        `TemplateId "${change.oldValue}" cannot be changed to "${change.newValue}"`,
        change.line
      )
    );
  }
}

export class ItemIdDuplicateRule extends BaseLintRule {
  id = 'M010';
  severity = 'error' as const;

  async check(tokens: Token[]): Promise<LintResult[]> {
    const itemIds = new Map<string, number>();
    const results: LintResult[] = [];

    tokens.forEach(token => {
      if (token.type === 'html_inline' && token.content.includes('<Tag')) {
        const itemId = extractItemId(token.content);
        if (itemId) {
          if (itemIds.has(itemId)) {
            results.push(this.createResult(
              `Duplicate itemId: "${itemId}"`,
              token.map![0]
            ));
          }
          itemIds.set(itemId, token.map![0]);
        }
      }
    });

    return results;
  }
}
```


## 10. キャッシュ管理

### 10.1 キャッシュマネージャー

```typescript
// src/cache/cache-manager.ts
export class CacheManager {
  private cacheDir: string;
  private metadataExtractor: MetadataExtractor;

  constructor(projectRoot: string) {
    this.cacheDir = path.join(projectRoot, '.mdck', '.cache');
    this.metadataExtractor = new MetadataExtractor();
  }

  async getCacheData(): Promise<CacheData> {
    const cacheFile = path.join(this.cacheDir, 'metadata.json');

    if (await this.fileExists(cacheFile)) {
      try {
        const content = await readFile(cacheFile, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        console.warn('Failed to read cache file, rebuilding:', error);
      }
    }

    return this.buildEmptyCache();
  }

  async refreshCache(files?: string[]): Promise<void> {
    await this.ensureCacheDir();

    const targetFiles = files || await this.findMdckFiles();
    const cacheData = await this.buildCacheFromFiles(targetFiles);

    await this.saveCacheData(cacheData);
  }

  private async buildCacheFromFiles(files: string[]): Promise<CacheData> {
    const templateIds: string[] = [];
    const itemIds: string[] = [];
    const externalRefs: Record<string, string> = {};

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf8');
        const metadata = await this.metadataExtractor.extract(content, file);

        templateIds.push(...metadata.templateIds);
        itemIds.push(...metadata.itemIds);
        Object.assign(externalRefs, metadata.externalRefs);
      } catch (error) {
        console.warn(`Failed to process file ${file}:`, error);
      }
    }

    return {
      templateIds: [...new Set(templateIds)],
      itemIds: [...new Set(itemIds)],
      externalRefs,
      lastUpdated: Date.now(),
      metadata: { fileCount: files.length }
    };
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create cache directory: ${this.cacheDir}`);
    }
  }
}
```


## 11. Git 連携

### 11.1 差分解析

```typescript
// src/git/diff-analyzer.ts
import { execSync } from 'child_process';

export class GitDiffAnalyzer {
  async analyzeTemplateIdChanges(filePath: string): Promise<TemplateIdChange[]> {
    const currentContent = await readFile(filePath, 'utf8');
    const previousContent = await this.getPreviousContent(filePath);

    if (!previousContent) return [];

    const currentIds = this.extractTemplateIds(currentContent);
    const previousIds = this.extractTemplateIds(previousContent);

    return this.findChanges(currentIds, previousIds);
  }

  private async getPreviousContent(filePath: string): Promise<string | null> {
    try {
      const result = execSync(`git show HEAD:"${filePath}"`, {
        encoding: 'utf8',
        timeout: 5000 // 5秒でタイムアウト
      });
      return result;
    } catch (error) {
      // 新規ファイルまたはGitリポジトリでない場合
      return null;
    }
  }

  private extractTemplateIds(content: string): Array<{id: string, line: number}> {
    const lines = content.split('\n');
    const templateIds: Array<{id: string, line: number}> = [];

    lines.forEach((line, index) => {
      const match = line.match(/<Template[^>]*TemplateId="([^"]+)"/);
      if (match) {
        templateIds.push({
          id: match[1],
          line: index + 1
        });
      }
    });

    return templateIds;
  }

  private findChanges(
    current: Array<{id: string, line: number}>,
    previous: Array<{id: string, line: number}>
  ): TemplateIdChange[] {
    const changes: TemplateIdChange[] = [];
    const previousMap = new Map(previous.map(item => [item.line, item.id]));

    current.forEach(item => {
      const previousId = previousMap.get(item.line);
      if (previousId && previousId !== item.id) {
        changes.push({
          oldValue: previousId,
          newValue: item.id,
          line: item.line
        });
      }
    });

    return changes;
  }
}
```


## 12. パフォーマンス最適化

### 12.1 パフォーマンス仕様

| 項目 | 目標値 | 実装方針 |
| :-- | :-- | :-- |
| パース速度 | > 15 MB/s | markdown-it の高速化設定 |
| Lint実行時間 | < 2s (100ファイル) | 並列処理・早期終了 |
| メモリ使用量 | < 100MB | トークン再利用・キャッシュ制限 |
| キャッシュ読み込み | < 100ms | JSON形式・圧縮保存 |
| 外部ファイル解決 | < 500ms | ファイルキャッシュ |

### 12.2 最適化実装

```typescript
// パフォーマンス最適化設定
export class PerformanceOptimizer {
  // 並列処理によるLint高速化
  async lintParallel(files: string[]): Promise<LintResult[]> {
    const batchSize = 10;
    const results: LintResult[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(file => this.lintSingleFile(file))
      );
      results.push(...batchResults.flat());
    }

    return results;
  }

  // メモリ使用量制限
  private limitCacheSize(cache: Map<string, any>, maxSize: number): void {
    if (cache.size > maxSize) {
      const keysToDelete = Array.from(cache.keys()).slice(0, cache.size - maxSize);
      keysToDelete.forEach(key => cache.delete(key));
    }
  }
}
```


## 13. エラーハンドリング

### 13.1 エラー階層

```typescript
export abstract class MdckError extends Error {
  abstract code: string;
  abstract severity: 'fatal' | 'error' | 'warn';

  constructor(message: string, public filePath?: string, public line?: number) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ParseError extends MdckError {
  code = 'PARSE_ERROR';
  severity = 'fatal' as const;
}

export class LintError extends MdckError {
  code: string;
  severity: 'error' | 'warn';

  constructor(code: string, message: string, filePath?: string, line?: number, severity: 'error' | 'warn' = 'error') {
    super(message, filePath, line);
    this.code = code;
    this.severity = severity;
  }
}

export class ConfigError extends MdckError {
  code = 'CONFIG_ERROR';
  severity = 'fatal' as const;
}
```


## 14. 使用例

### 14.1 基本的な使用

```typescript
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


### 14.2 他パッケージでの使用

```typescript
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


## 15. パッケージサイズ最適化

### 15.1 最終的なバンドルサイズ

| 項目 | サイズ |
| :-- | :-- |
| 実行時依存関係 | ~850KB |
| TypeScript出力 | ~200KB |
| 合計 | ~1.05MB |

### 15.2 tree-shaking 対応

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

この仕様により、@mdck/parserは軽量で高速、かつ拡張可能なチェックリスト解析・検証パッケージとして機能します。依存関係を最小限に抑え、Node.js標準ライブラリを活用することで、メンテナンス性とパフォーマンスの両立を実現しています。
