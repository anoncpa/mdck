# mdck キャッシュ・Git連携仕様詳細（remark+remark-directive版）

## 1. 概要

@mdck/parserのキャッシュ管理とGit連携機能は、remarkとremark-directiveを使用したAST（mdast）ベースの高速な解析・検証をサポートします。VSCode拡張機能での入力補完やCLIでの効率的な静的解析を実現するため、テンプレートID・項目ID・外部参照などのメタデータを.mdck/.cacheディレクトリに保存・管理します。

## 2. キャッシュ管理システム

### 2.1 キャッシュディレクトリ構造

```

project-root/
├── .mdck/
│   ├── config.yml
│   └── .cache/
│       ├── metadata.json     \# 全体メタデータ
│       ├── files.json        \# ファイル別キャッシュ
│       ├── templates.json    \# テンプレート定義キャッシュ
│       └── dependencies.json \# 依存関係グラフ
└── docs/
└── templates/
├── common.md
└── parent.md

```

### 2.2 キャッシュマネージャー

```typescript
// src/cache/cache-manager.ts
import type { Root } from 'mdast';
import type { Directive } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';
import { remark } from 'remark';
import remarkDirective from 'remark-directive';

export class CacheManager {
  private cacheDir: string;
  private metadataExtractor: MetadataExtractor;
  private parser: ReturnType<typeof remark>;

  constructor(projectRoot: string) {
    this.cacheDir = path.join(projectRoot, '.mdck', '.cache');
    this.metadataExtractor = new MetadataExtractor();
    this.parser = remark().use(remarkDirective);
  }

  async getCacheData(): Promise<CacheData> {
    const cacheFile = path.join(this.cacheDir, 'metadata.json');

    if (await this.fileExists(cacheFile)) {
      try {
        const content = await readFile(cacheFile, 'utf8');
        const cacheData = JSON.parse(content);

        // キャッシュの有効性をチェック
        if (await this.isCacheValid(cacheData)) {
          return cacheData;
        }
      } catch (error) {
        console.warn('Failed to read cache file, rebuilding:', error);
      }
    }

    return this.buildEmptyCache();
  }

  async refreshCache(files?: string[]): Promise<void> {
    await this.ensureCacheDir();

    const targetFiles = files || (await this.findMdckFiles());
    const cacheData = await this.buildCacheFromFiles(targetFiles);

    await this.saveCacheData(cacheData);
    await this.saveDependencyGraph(cacheData);
  }

  private async buildCacheFromFiles(files: string[]): Promise<CacheData> {
    const templateIds: string[] = [];
    const itemIds: string[] = [];
    const externalRefs: Record<string, string> = {};
    const templateDefinitions: Record<string, TemplateDefinition> = {};
    const fileDependencies: Record<string, string[]> = {};

    for (const file of files) {
      try {
        const content = await readFile(file, 'utf8');
        const ast = this.parser.parse(content) as Root;
        const metadata = await this.metadataExtractor.extract(ast, file);

        templateIds.push(...metadata.templateIds);
        itemIds.push(...metadata.itemIds);
        Object.assign(externalRefs, metadata.externalRefs);
        Object.assign(templateDefinitions, metadata.templateDefinitions);
        fileDependencies[file] = metadata.dependencies;
      } catch (error) {
        console.warn(`Failed to process file ${file}:`, error);
      }
    }

    return {
      templateIds: [...new Set(templateIds)],
      itemIds: [...new Set(itemIds)],
      externalRefs,
      templateDefinitions,
      fileDependencies,
      lastUpdated: Date.now(),
      metadata: {
        fileCount: files.length,
        schemaVersion: '2.0.0', // remarkベース
      },
    };
  }

  private async isCacheValid(cacheData: CacheData): Promise<boolean> {
    if (
      !cacheData.metadata?.schemaVersion ||
      cacheData.metadata.schemaVersion !== '2.0.0'
    ) {
      return false;
    }

    // ファイルの変更時刻をチェック
    for (const file of Object.keys(cacheData.fileDependencies || {})) {
      try {
        const stats = await stat(file);
        if (stats.mtimeMs > cacheData.lastUpdated) {
          return false;
        }
      } catch {
        // ファイルが削除された場合
        return false;
      }
    }

    return true;
  }

  async invalidateCache(): Promise<void> {
    try {
      await this.removeCacheDir();
    } catch (error) {
      console.warn('Failed to remove cache directory:', error);
    }
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create cache directory: ${this.cacheDir}`);
    }
  }

  private async saveCacheData(cacheData: CacheData): Promise<void> {
    const cacheFile = path.join(this.cacheDir, 'metadata.json');
    await writeFile(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
  }

  private async saveDependencyGraph(cacheData: CacheData): Promise<void> {
    const dependencyFile = path.join(this.cacheDir, 'dependencies.json');
    await writeFile(
      dependencyFile,
      JSON.stringify(cacheData.fileDependencies, null, 2),
      'utf8'
    );
  }
}
```

### 2.3 メタデータ抽出

```typescript
// src/cache/metadata-extractor.ts
import type { Root } from 'mdast';
import type { Directive } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

export class MetadataExtractor {
  async extract(ast: Root, filePath?: string): Promise<FileMetadata> {
    const templateIds: string[] = [];
    const itemIds: string[] = [];
    const externalRefs: Record<string, string> = {};
    const templateDefinitions: Record<string, TemplateDefinition> = {};
    const dependencies: string[] = [];

    visit(ast, 'directive', (node: Directive) => {
      if (node.name === 'template') {
        const templateId = this.extractTemplateId(node);

        if (templateId) {
          if (node.type === 'containerDirective') {
            // テンプレート定義
            templateIds.push(templateId);
            templateDefinitions[templateId] = {
              id: templateId,
              filePath,
              startLine: node.position?.start.line || 0,
              endLine: node.position?.end.line || 0,
              dependencies: this.extractTemplateDependencies(node),
            };
          } else if (node.type === 'leafDirective') {
            // テンプレート参照
            dependencies.push(templateId);

            // 外部ファイル参照
            const src = node.attributes?.src;
            if (src) {
              externalRefs[templateId] = src;
            }
          }
        }
      } else if (node.name === 'tag') {
        const itemId = this.extractItemId(node);
        if (itemId) {
          itemIds.push(itemId);
        }
      }
    });

    return {
      templateIds: [...new Set(templateIds)],
      itemIds: [...new Set(itemIds)],
      externalRefs,
      templateDefinitions,
      dependencies: [...new Set(dependencies)],
      filePath,
      lastModified: Date.now(),
    };
  }

  private extractTemplateId(directive: Directive): string | null {
    if (!directive.attributes) return null;

    // #id=value 形式の属性を探す
    for (const [key, value] of Object.entries(directive.attributes)) {
      if (key === '#id' || key === 'id') {
        return value;
      }
    }

    return null;
  }

  private extractItemId(directive: Directive): string | null {
    return this.extractTemplateId(directive); // 同じロジック
  }

  private extractTemplateDependencies(containerDirective: Directive): string[] {
    const dependencies: string[] = [];

    visit(containerDirective, 'leafDirective', (node: Directive) => {
      if (node.name === 'template') {
        const templateId = this.extractTemplateId(node);
        if (templateId) {
          dependencies.push(templateId);
        }
      }
    });

    return dependencies;
  }
}
```

### 2.4 型定義

```typescript
// src/shared/cache-types.ts
interface CacheData {
  templateIds: string[];
  itemIds: string[];
  externalRefs: Record<string, string>;
  templateDefinitions: Record<string, TemplateDefinition>;
  fileDependencies: Record<string, string[]>;
  lastUpdated: number;
  metadata: {
    fileCount: number;
    schemaVersion: string;
  };
}

interface FileMetadata {
  templateIds: string[];
  itemIds: string[];
  externalRefs: Record<string, string>;
  templateDefinitions: Record<string, TemplateDefinition>;
  dependencies: string[];
  filePath?: string;
  lastModified: number;
}

interface TemplateDefinition {
  id: string;
  filePath?: string;
  startLine: number;
  endLine: number;
  dependencies: string[];
}
```

## 3. Git連携システム

### 3.1 差分解析

```typescript
// src/git/diff-analyzer.ts
import { execSync } from 'child_process';
import { remark } from 'remark';
import remarkDirective from 'remark-directive';
import type { Root } from 'mdast';
import type { Directive } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

export class GitDiffAnalyzer {
  private parser: ReturnType<typeof remark>;

  constructor() {
    this.parser = remark().use(remarkDirective);
  }

  async analyzeTemplateIdChanges(
    filePath: string
  ): Promise<TemplateIdChange[]> {
    const currentContent = await readFile(filePath, 'utf8');
    const previousContent = await this.getPreviousContent(filePath);

    if (!previousContent) return [];

    const currentIds = this.extractTemplateIds(currentContent);
    const previousIds = this.extractTemplateIds(previousContent);

    return this.findChanges(currentIds, previousIds);
  }

  async analyzeStructuralChanges(
    filePath: string
  ): Promise<StructuralChange[]> {
    const currentContent = await readFile(filePath, 'utf8');
    const previousContent = await this.getPreviousContent(filePath);

    if (!previousContent) return [];

    const currentAst = this.parser.parse(currentContent) as Root;
    const previousAst = this.parser.parse(previousContent) as Root;

    return this.compareASTStructure(currentAst, previousAst);
  }

  private async getPreviousContent(filePath: string): Promise<string | null> {
    try {
      const result = execSync(`git show HEAD:"${filePath}"`, {
        encoding: 'utf8',
        timeout: 5000, // 5秒でタイムアウト
      });
      return result;
    } catch (error) {
      // 新規ファイルまたはGitリポジトリでない場合
      return null;
    }
  }

  private extractTemplateIds(
    content: string
  ): Array<{ id: string; line: number }> {
    const ast = this.parser.parse(content) as Root;
    const templateIds: Array<{ id: string; line: number }> = [];

    visit(ast, 'directive', (node: Directive) => {
      if (node.name === 'template' && node.attributes) {
        const templateId = this.extractTemplateId(node);
        if (templateId) {
          templateIds.push({
            id: templateId,
            line: node.position?.start.line || 0,
          });
        }
      }
    });

    return templateIds;
  }

  private extractTemplateId(directive: Directive): string | null {
    if (!directive.attributes) return null;

    // #id=value 形式の属性を探す
    for (const [key, value] of Object.entries(directive.attributes)) {
      if (key === '#id' || key === 'id') {
        return value;
      }
    }

    return null;
  }

  private findChanges(
    current: Array<{ id: string; line: number }>,
    previous: Array<{ id: string; line: number }>
  ): TemplateIdChange[] {
    const changes: TemplateIdChange[] = [];
    const previousMap = new Map(previous.map((item) => [item.line, item.id]));

    current.forEach((item) => {
      const previousId = previousMap.get(item.line);
      if (previousId && previousId !== item.id) {
        changes.push({
          oldValue: previousId,
          newValue: item.id,
          line: item.line,
          type: 'template-id-change',
        });
      }
    });

    return changes;
  }

  private compareASTStructure(
    currentAst: Root,
    previousAst: Root
  ): StructuralChange[] {
    const changes: StructuralChange[] = [];

    const currentDirectives = this.extractDirectiveMetadata(currentAst);
    const previousDirectives = this.extractDirectiveMetadata(previousAst);

    // 新規追加されたディレクティブ
    currentDirectives.forEach((current) => {
      const previous = previousDirectives.find((p) => p.id === current.id);
      if (!previous) {
        changes.push({
          type: 'directive-added',
          directiveType: current.directiveType,
          id: current.id,
          line: current.line,
        });
      }
    });

    // 削除されたディレクティブ
    previousDirectives.forEach((previous) => {
      const current = currentDirectives.find((c) => c.id === previous.id);
      if (!current) {
        changes.push({
          type: 'directive-removed',
          directiveType: previous.directiveType,
          id: previous.id,
          line: previous.line,
        });
      }
    });

    return changes;
  }

  private extractDirectiveMetadata(ast: Root): DirectiveMetadata[] {
    const directives: DirectiveMetadata[] = [];

    visit(ast, 'directive', (node: Directive) => {
      const id = this.extractTemplateId(node);
      if (id) {
        directives.push({
          id,
          directiveType: node.name,
          nodeType: node.type,
          line: node.position?.start.line || 0,
          attributes: node.attributes || {},
        });
      }
    });

    return directives;
  }
}
```

### 3.2 Git フック連携

```typescript
// src/git/git-hooks.ts
import { GitDiffAnalyzer } from './diff-analyzer.js';

export class GitHookManager {
  private diffAnalyzer: GitDiffAnalyzer;

  constructor() {
    this.diffAnalyzer = new GitDiffAnalyzer();
  }

  async validatePreCommit(stagedFiles: string[]): Promise<GitValidationResult> {
    const errors: GitValidationError[] = [];
    const warnings: GitValidationWarning[] = [];

    for (const file of stagedFiles.filter((f) => f.endsWith('.md'))) {
      try {
        // M001: template id変更チェック
        const templateIdChanges =
          await this.diffAnalyzer.analyzeTemplateIdChanges(file);
        templateIdChanges.forEach((change) => {
          errors.push({
            rule: 'M001',
            file,
            line: change.line,
            message: `Template id "${change.oldValue}" cannot be changed to "${change.newValue}"`,
            severity: 'error',
          });
        });

        // 構造的変更の検出
        const structuralChanges =
          await this.diffAnalyzer.analyzeStructuralChanges(file);
        structuralChanges.forEach((change) => {
          if (change.type === 'directive-removed') {
            warnings.push({
              rule: 'W001',
              file,
              line: change.line,
              message: `${change.directiveType} directive "${change.id}" was removed`,
              severity: 'warn',
            });
          }
        });
      } catch (error) {
        console.warn(`Failed to analyze git diff for ${file}:`, error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async setupGitHooks(projectRoot: string): Promise<void> {
    const hookDir = path.join(projectRoot, '.git', 'hooks');
    const preCommitHook = path.join(hookDir, 'pre-commit');

    const hookContent = `#!/bin/sh

# mdck pre-commit hook

npx mdck git validate-staged || exit 1
`;

    await writeFile(preCommitHook, hookContent, { mode: 0o755 });
    console.log('Git pre-commit hook installed successfully');
  }
}
```

### 3.3 型定義

```typescript
// src/shared/git-types.ts
interface TemplateIdChange {
  oldValue: string;
  newValue: string;
  line: number;
  type: 'template-id-change';
}

interface StructuralChange {
  type: 'directive-added' | 'directive-removed' | 'directive-modified';
  directiveType: string;
  id: string;
  line: number;
}

interface DirectiveMetadata {
  id: string;
  directiveType: string;
  nodeType: string;
  line: number;
  attributes: Record<string, string>;
}

interface GitValidationResult {
  valid: boolean;
  errors: GitValidationError[];
  warnings: GitValidationWarning[];
}

interface GitValidationError {
  rule: string;
  file: string;
  line: number;
  message: string;
  severity: 'error';
}

interface GitValidationWarning {
  rule: string;
  file: string;
  line: number;
  message: string;
  severity: 'warn';
}
```

## 4. パフォーマンス最適化

### 4.1 キャッシュ最適化

```typescript

// src/cache/performance-optimizer.ts
export class CachePerformanceOptimizer {
// 増分キャッシュ更新
async incrementalUpdate(changedFiles: string[], cacheData: CacheData): Promise<CacheData> {
const updatedCacheData = { ...cacheData };

    for (const file of changedFiles) {
      // 変更されたファイルのみ再解析
      const content = await readFile(file, 'utf8');
      const ast = this.parser.parse(content) as Root;
      const metadata = await this.metadataExtractor.extract(ast, file);

      // 古いデータを削除
      this.removeFileFromCache(file, updatedCacheData);

      // 新しいデータを追加
      this.addFileToCache(file, metadata, updatedCacheData);
    }

    updatedCacheData.lastUpdated = Date.now();
    return updatedCacheData;
    }

// 並列処理によるキャッシュ構築
async buildCacheParallel(files: string[]): Promise<CacheData> {
const batchSize = 10;
const results: FileMetadata[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(file => this.processFile(file))
      );
      results.push(...batchResults);
    }

    return this.mergeCacheResults(results);
    }

// メモリ効率的なキャッシュ
private limitCacheSize(cacheData: CacheData, maxItems: number): CacheData {
if (Object.keys(cacheData.templateDefinitions).length > maxItems) {
const sortedEntries = Object.entries(cacheData.templateDefinitions)
.sort((a, b) => (b[^1].lastAccessed || 0) - (a[^1].lastAccessed || 0))
.slice(0, maxItems);

      cacheData.templateDefinitions = Object.fromEntries(sortedEntries);
    }

    return cacheData;
    }
}

```

### 4.2 パフォーマンス仕様

| 項目               | 目標値               | 実装方針                  |
| :----------------- | :------------------- | :------------------------ |
| キャッシュ読み込み | < 50ms               | JSON形式・圧縮保存        |
| 増分更新           | < 200ms (10ファイル) | 変更ファイルのみ再解析    |
| 全体キャッシュ更新 | < 2s (100ファイル)   | 並列処理・バッチ更新      |
| Git差分解析        | < 500ms              | AST差分・効率的な比較     |
| メモリ使用量       | < 50MB               | キャッシュサイズ制限・LRU |

## 5. VSCode拡張連携

### 5.1 入力補完データ提供

```typescript
// src/cache/vscode-provider.ts
export class VSCodeCacheProvider {
  private cacheManager: CacheManager;

  constructor(projectRoot: string) {
    this.cacheManager = new CacheManager(projectRoot);
  }

  async getCompletionData(): Promise<CompletionData> {
    const cacheData = await this.cacheManager.getCacheData();

    return {
      templateIds: cacheData.templateIds.map((id) => ({
        label: id,
        kind: 'template',
        detail: 'Template ID',
        insertText: `::template{#id=${id}}`,
        documentation: `Reference to template: ${id}`,
      })),
      itemIds: cacheData.itemIds.map((id) => ({
        label: id,
        kind: 'tag',
        detail: 'Item ID',
        insertText: `::tag{#id=${id}}`,
        documentation: `Tag with item ID: ${id}`,
      })),
    };
  }

  async watchForChanges(
    callback: (data: CompletionData) => void
  ): Promise<void> {
    // ファイル変更監視とキャッシュ更新
    const watcher = chokidar.watch('**/*.md', {
      ignored: ['.mdck/.cache/**', 'node_modules/**'],
      persistent: true,
    });

    watcher.on('change', async (filePath) => {
      await this.cacheManager.refreshCache([filePath]);
      const completionData = await this.getCompletionData();
      callback(completionData);
    });
  }
}
```

## 6. remarkとremark-directiveの利点

### 6.1 キャッシュシステムでの利点

1. **構造化されたAST**: mdastによる型安全なディレクティブ解析で、属性抽出や構造解析が容易
2. **標準的なエコシステム**: remarkのプラグインシステムとの親和性により、将来的な機能拡張が容易
3. **効率的な差分解析**: AST比較による正確な構造変更検出
4. **メタデータ抽出の信頼性**: ディレクティブの構造化された扱いにより、誤検出が少ない

### 6.2 Git連携での利点

1. **正確な変更検出**: ディレクティブレベルでの変更追跡
2. **属性変更の検出**: `#id`属性の変更を正確に検出
3. **構造的整合性**: AST比較による構造変更の確実な検出

この更新により、新しいディレクティブ記法とremarkベースのアーキテクチャに対応した、高性能で信頼性の高いキャッシュ・Git連携システムが実現されます。
