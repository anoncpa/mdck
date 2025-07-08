// src/cache/cache-manager.ts
import { readFile, writeFile, mkdir, access, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { MetadataExtractor } from './metadata-extractor';
import type {
  CacheData,
  CacheManagerConfig,
  CacheUpdateResult,
  CacheValidationResult,
  FileChangeInfo,
  FileMetadata,
  CachedTemplateDefinition,
  DependencyGraph,
} from '../shared/cache-types';

/**
 * キャッシュ管理クラス
 * ファイルメタデータ、テンプレート定義、依存関係グラフを管理
 */
export class CacheManager {
  private readonly config: Required<CacheManagerConfig>;
  private readonly metadataExtractor: MetadataExtractor;
  private readonly cacheFilePath: string;
  private cacheData: CacheData | null = null;

  constructor(config: CacheManagerConfig) {
    this.config = {
      cacheDir: path.join(config.projectRoot, '.mdck', '.cache'),
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      maxConcurrency: 10,
      enableGitIntegration: true,
      ...config,
    };

    this.metadataExtractor = new MetadataExtractor();
    this.cacheFilePath = path.join(this.config.cacheDir, 'metadata.json');
  }

  /**
   * キャッシュデータを取得（必要に応じて更新）
   */
  public async getCacheData(): Promise<CacheData> {
    if (this.cacheData) {
      return this.cacheData;
    }

    // キャッシュファイルの存在確認
    if (await this.fileExists(this.cacheFilePath)) {
      try {
        const content = await readFile(this.cacheFilePath, 'utf8');
        const cachedData = JSON.parse(content, this.reviver);

        // キャッシュの有効性をチェック
        const validation = await this.validateCache(cachedData);
        if (validation.isValid) {
          this.cacheData = cachedData;
          return cachedData;
        }

        console.log(`Cache invalid: ${validation.reason}`);
      } catch (error) {
        console.warn('Failed to read cache file, rebuilding:', error);
      }
    }

    // キャッシュを再構築
    return await this.rebuildCache();
  }

  /**
   * キャッシュを更新
   */
  public async refreshCache(targetFiles?: string[]): Promise<CacheUpdateResult> {
    const startTime = Date.now();
    let updatedFiles = 0;
    let addedFiles = 0;
    let removedFiles = 0;
    const errors: { filePath: string; error: string }[] = [];

    try {
      // 現在のキャッシュデータを取得
      const currentCache = await this.getCacheData();

      // 対象ファイルの決定
      const filesToProcess = targetFiles || await this.findMarkdownFiles();

      // ファイル変更の検出
      const changes = await this.detectFileChanges(currentCache, filesToProcess);

      // 並列処理でファイルを更新
      const concurrency = Math.min(this.config.maxConcurrency, Math.max(1, changes.length));
      const chunks = this.chunkArray(changes, concurrency);

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async (change) => {
            try {
              await this.processFileChange(currentCache, change);
              
              switch (change.changeType) {
                case 'added':
                  addedFiles++;
                  break;
                case 'modified':
                  updatedFiles++;
                  break;
                case 'deleted':
                  removedFiles++;
                  break;
              }
            } catch (error) {
              errors.push({
                filePath: change.filePath,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          })
        );
      }

      // 依存関係グラフを再構築
      currentCache.dependencies = this.buildDependencyGraph(currentCache);
      currentCache.lastUpdated = Date.now();

      // キャッシュを保存
      await this.saveCacheData(currentCache);
      this.cacheData = currentCache;

      return {
        updatedFiles,
        addedFiles,
        removedFiles,
        duration: Date.now() - startTime,
        errors,
      };
    } catch (error) {
      throw new Error(`Cache refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * キャッシュを完全に再構築
   */
  public async rebuildCache(): Promise<CacheData> {
    const startTime = Date.now();
    console.log('Rebuilding cache...');

    // キャッシュディレクトリを作成
    await this.ensureCacheDirectory();

    // 新しいキャッシュデータを初期化
    const cacheData: CacheData = {
      version: '1.0.0',
      lastUpdated: Date.now(),
      projectRoot: this.config.projectRoot,
      files: new Map(),
      templates: new Map(),
      dependencies: {
        nodes: new Set(),
        edges: new Map(),
        reverseEdges: new Map(),
        cycles: [],
      },
    };

    // Markdownファイルを検索
    const markdownFiles = await this.findMarkdownFiles();

    // 並列処理でファイルを解析
    const concurrency = Math.min(this.config.maxConcurrency, markdownFiles.length);
    const chunks = this.chunkArray(markdownFiles, concurrency);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (filePath) => {
          try {
            const metadata = await this.metadataExtractor.extractFileMetadata(filePath);
            cacheData.files.set(filePath, metadata);

            // テンプレート定義をキャッシュに追加
            if (metadata.templateIds.length > 0) {
              const ast = await this.parseFile(filePath);
              const templateDefs = await this.metadataExtractor.extractTemplateDefinitions(filePath, ast);
              
              for (const templateDef of templateDefs) {
                cacheData.templates.set(templateDef.id, templateDef);
              }
            }
          } catch (error) {
            console.warn(`Failed to process file ${filePath}:`, error);
          }
        })
      );
    }

    // 依存関係グラフを構築
    cacheData.dependencies = this.buildDependencyGraph(cacheData);

    // キャッシュを保存
    await this.saveCacheData(cacheData);
    this.cacheData = cacheData;

    console.log(`Cache rebuilt in ${Date.now() - startTime}ms (${markdownFiles.length} files)`);
    return cacheData;
  }

  /**
   * キャッシュをクリア
   */
  public async clearCache(): Promise<void> {
    this.cacheData = null;
    
    if (await this.fileExists(this.cacheFilePath)) {
      try {
        const { unlink } = await import('fs/promises');
        await unlink(this.cacheFilePath);
      } catch (error) {
        console.warn('Failed to delete cache file:', error);
      }
    }
  }

  /**
   * キャッシュの有効性を検証
   */
  private async validateCache(cacheData: CacheData): Promise<CacheValidationResult> {
    // バージョンチェック
    if (cacheData.version !== '1.0.0') {
      return {
        isValid: false,
        reason: 'Cache version mismatch',
      };
    }

    // プロジェクトルートチェック
    if (cacheData.projectRoot !== this.config.projectRoot) {
      return {
        isValid: false,
        reason: 'Project root changed',
      };
    }

    // 有効期限チェック
    const age = Date.now() - cacheData.lastUpdated;
    if (age > this.config.maxAge) {
      return {
        isValid: false,
        reason: 'Cache expired',
      };
    }

    // ファイル変更チェック
    const changedFiles: string[] = [];
    const deletedFiles: string[] = [];

    for (const [filePath, metadata] of cacheData.files) {
      if (!(await this.fileExists(filePath))) {
        deletedFiles.push(filePath);
        continue;
      }

      try {
        const stats = await stat(filePath);
        if (stats.mtime.getTime() !== metadata.mtime || stats.size !== metadata.size) {
          changedFiles.push(filePath);
        }
      } catch (error) {
        deletedFiles.push(filePath);
      }
    }

    if (changedFiles.length > 0 || deletedFiles.length > 0) {
      return {
        isValid: false,
        reason: 'Files changed',
        changedFiles,
        deletedFiles,
      };
    }

    return { isValid: true };
  }

  /**
   * ファイル変更を検出
   */
  private async detectFileChanges(
    cacheData: CacheData,
    currentFiles: string[]
  ): Promise<FileChangeInfo[]> {
    const changes: FileChangeInfo[] = [];
    const cachedFiles = new Set(cacheData.files.keys());

    // 新規・変更ファイルの検出
    for (const filePath of currentFiles) {
      const cachedMetadata = cacheData.files.get(filePath);

      if (!cachedMetadata) {
        changes.push({
          filePath,
          changeType: 'added',
          newHash: await this.calculateFileHash(filePath),
        });
      } else {
        const currentHash = await this.calculateFileHash(filePath);
        if (currentHash !== cachedMetadata.hash) {
          changes.push({
            filePath,
            changeType: 'modified',
            oldHash: cachedMetadata.hash,
            newHash: currentHash,
          });
        }
      }

      cachedFiles.delete(filePath);
    }

    // 削除ファイルの検出
    for (const filePath of cachedFiles) {
      changes.push({
        filePath,
        changeType: 'deleted',
        oldHash: cacheData.files.get(filePath)?.hash,
      });
    }

    return changes;
  }

  /**
   * ファイル変更を処理
   */
  private async processFileChange(cacheData: CacheData, change: FileChangeInfo): Promise<void> {
    switch (change.changeType) {
      case 'added':
      case 'modified':
        // 既存のテンプレート定義を削除（modifiedの場合）
        if (change.changeType === 'modified') {
          const oldMetadata = cacheData.files.get(change.filePath);
          if (oldMetadata) {
            for (const templateId of oldMetadata.templateIds) {
              cacheData.templates.delete(templateId);
            }
          }
        }

        const metadata = await this.metadataExtractor.extractFileMetadata(change.filePath);
        cacheData.files.set(change.filePath, metadata);

        // 新しいテンプレート定義を追加
        if (metadata.templateIds.length > 0) {
          const ast = await this.parseFile(change.filePath);
          const templateDefs = await this.metadataExtractor.extractTemplateDefinitions(change.filePath, ast);
          
          for (const templateDef of templateDefs) {
            cacheData.templates.set(templateDef.id, templateDef);
          }
        }
        break;

      case 'deleted':
        const oldMetadata = cacheData.files.get(change.filePath);
        cacheData.files.delete(change.filePath);

        // 関連するテンプレート定義を削除
        if (oldMetadata) {
          for (const templateId of oldMetadata.templateIds) {
            cacheData.templates.delete(templateId);
          }
        }
        break;
    }
  }

  /**
   * 依存関係グラフを構築
   */
  private buildDependencyGraph(cacheData: CacheData): DependencyGraph {
    const nodes = new Set<string>();
    const edges = new Map<string, Set<string>>();
    const reverseEdges = new Map<string, Set<string>>();

    // ノードとエッジを構築
    for (const [templateId, templateDef] of cacheData.templates) {
      nodes.add(templateId);
      
      if (!edges.has(templateId)) {
        edges.set(templateId, new Set());
      }

      for (const depId of templateDef.dependencies) {
        edges.get(templateId)!.add(depId);
        
        if (!reverseEdges.has(depId)) {
          reverseEdges.set(depId, new Set());
        }
        reverseEdges.get(depId)!.add(templateId);
      }
    }

    // 循環参照を検出
    const cycles = this.detectCycles(edges);

    return {
      nodes,
      edges,
      reverseEdges,
      cycles,
    };
  }

  /**
   * 循環参照を検出
   */
  private detectCycles(edges: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // 循環を発見
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node]);
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = edges.get(node) || new Set();
      for (const neighbor of neighbors) {
        dfs(neighbor, [...path]);
      }

      recursionStack.delete(node);
    };

    for (const node of edges.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Markdownファイルを検索
   */
  private async findMarkdownFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const searchDir = async (dir: string): Promise<void> => {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // .mdck ディレクトリは除外
            if (entry.name !== '.mdck' && !entry.name.startsWith('.')) {
              await searchDir(fullPath);
            }
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // ディレクトリアクセスエラーは無視
      }
    };

    await searchDir(this.config.projectRoot);
    return files;
  }

  /**
   * ユーティリティメソッド
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureCacheDirectory(): Promise<void> {
    if (!existsSync(this.config.cacheDir)) {
      await mkdir(this.config.cacheDir, { recursive: true });
    }
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf8');
      const { createHash } = await import('crypto');
      return createHash('sha256').update(content, 'utf8').digest('hex');
    } catch {
      return '';
    }
  }

  private async parseFile(filePath: string) {
    const content = await readFile(filePath, 'utf8');
    const { processor } = await import('../core/processor');
    return processor.parse(content);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
      return array.length > 0 ? [array] : [];
    }
    
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async saveCacheData(cacheData: CacheData): Promise<void> {
    await this.ensureCacheDirectory();
    const content = JSON.stringify(cacheData, this.replacer, 2);
    await writeFile(this.cacheFilePath, content, 'utf8');
  }

  // JSON.stringify用のreplacer（MapとSetを配列に変換）
  private replacer(key: string, value: any): any {
    if (value instanceof Map) {
      return {
        __type: 'Map',
        entries: Array.from(value.entries()),
      };
    }
    if (value instanceof Set) {
      return {
        __type: 'Set',
        values: Array.from(value.values()),
      };
    }
    return value;
  }

  // JSON.parse用のreviver（配列をMapとSetに復元）
  private reviver(key: string, value: any): any {
    if (typeof value === 'object' && value !== null) {
      if (value.__type === 'Map') {
        return new Map(value.entries);
      }
      if (value.__type === 'Set') {
        return new Set(value.values);
      }
    }
    return value;
  }
}