// src/__tests__/unit/cache-manager.test.ts
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { CacheManager } from '../../cache/cache-manager';
import type { CacheManagerConfig } from '../../shared/cache-types';

describe('CacheManager', () => {
  const testProjectRoot = path.join(__dirname, 'test-cache-project');
  const testCacheDir = path.join(testProjectRoot, '.mdck', '.cache');
  let cacheManager: CacheManager;

  beforeEach(async () => {
    // テストプロジェクトディレクトリを作成
    await mkdir(testProjectRoot, { recursive: true });
    
    const config: CacheManagerConfig = {
      projectRoot: testProjectRoot,
      maxAge: 1000 * 60 * 60, // 1時間
      maxConcurrency: 5,
    };
    
    cacheManager = new CacheManager(config);
  });

  afterEach(async () => {
    // テストディレクトリをクリーンアップ
    if (existsSync(testProjectRoot)) {
      await rm(testProjectRoot, { recursive: true });
    }
  });

  describe('基本的なキャッシュ操作', () => {
    it('空のプロジェクトでキャッシュを初期化できる', async () => {
      const cacheData = await cacheManager.getCacheData();
      
      expect(cacheData.version).toBe('1.0.0');
      expect(cacheData.projectRoot).toBe(testProjectRoot);
      expect(cacheData.files.size).toBe(0);
      expect(cacheData.templates.size).toBe(0);
    });

    it('Markdownファイルを含むプロジェクトでキャッシュを構築できる', async () => {
      // テストファイルを作成
      const testFile1 = path.join(testProjectRoot, 'test1.md');
      const testFile2 = path.join(testProjectRoot, 'test2.md');
      
      await writeFile(testFile1, `# Test File 1

:::template{id="template1"}
# Template 1
- [ ] Task 1
:::
`);

      await writeFile(testFile2, `# Test File 2

:::template{id="template2"}
# Template 2
::template{id="template1"}
:::
`);

      const cacheData = await cacheManager.getCacheData();
      
      expect(cacheData.files.size).toBe(2);
      expect(cacheData.templates.size).toBe(2);
      
      // ファイルメタデータの確認
      const file1Metadata = cacheData.files.get(testFile1);
      expect(file1Metadata).toBeDefined();
      expect(file1Metadata!.templateIds).toEqual(['template1']);
      
      const file2Metadata = cacheData.files.get(testFile2);
      expect(file2Metadata).toBeDefined();
      expect(file2Metadata!.templateIds).toEqual(['template2']);
      expect(file2Metadata!.referenceIds).toEqual(['template1']);
      
      // テンプレート定義の確認
      const template1 = cacheData.templates.get('template1');
      expect(template1).toBeDefined();
      expect(template1!.filePath).toBe(testFile1);
      
      const template2 = cacheData.templates.get('template2');
      expect(template2).toBeDefined();
      expect(template2!.dependencies).toEqual(['template1']);
    });

    it('重複テンプレートIDがある場合はエラー情報を記録する', async () => {
      const testFile = path.join(testProjectRoot, 'duplicate.md');
      
      await writeFile(testFile, `# Duplicate Template Test

:::template{id="duplicate"}
# First Template
:::

:::template{id="duplicate"}
# Second Template
:::
`);

      const cacheData = await cacheManager.getCacheData();
      
      const fileMetadata = cacheData.files.get(testFile);
      expect(fileMetadata).toBeDefined();
      expect(fileMetadata!.errors).toBeDefined();
      expect(fileMetadata!.errors!.length).toBeGreaterThan(0);
      expect(fileMetadata!.errors![0].type).toBe('duplicate-definition');
      expect(fileMetadata!.errors![0].templateId).toBe('duplicate');
    });
  });

  describe('依存関係グラフ', () => {
    it('依存関係グラフを正しく構築する', async () => {
      // 依存関係のあるテンプレートファイルを作成
      await writeFile(path.join(testProjectRoot, 'templates.md'), `
:::template{id="base"}
# Base Template
- [ ] Base task
:::

:::template{id="child1"}
# Child 1
::template{id="base"}
- [ ] Child 1 task
:::

:::template{id="child2"}
# Child 2
::template{id="base"}
::template{id="child1"}
- [ ] Child 2 task
:::
`);

      const cacheData = await cacheManager.getCacheData();
      const deps = cacheData.dependencies;
      
      expect(deps.nodes.size).toBe(3);
      expect(deps.nodes.has('base')).toBe(true);
      expect(deps.nodes.has('child1')).toBe(true);
      expect(deps.nodes.has('child2')).toBe(true);
      
      // エッジの確認
      expect(deps.edges.get('child1')?.has('base')).toBe(true);
      expect(deps.edges.get('child2')?.has('base')).toBe(true);
      expect(deps.edges.get('child2')?.has('child1')).toBe(true);
      
      // 逆エッジの確認
      expect(deps.reverseEdges.get('base')?.has('child1')).toBe(true);
      expect(deps.reverseEdges.get('base')?.has('child2')).toBe(true);
      expect(deps.reverseEdges.get('child1')?.has('child2')).toBe(true);
    });

    it('循環参照を検出する', async () => {
      await writeFile(path.join(testProjectRoot, 'circular.md'), `
:::template{id="a"}
# Template A
::template{id="b"}
:::

:::template{id="b"}
# Template B
::template{id="c"}
:::

:::template{id="c"}
# Template C
::template{id="a"}
:::
`);

      const cacheData = await cacheManager.getCacheData();
      const deps = cacheData.dependencies;
      
      expect(deps.cycles.length).toBeGreaterThan(0);
      const cycle = deps.cycles[0];
      expect(cycle).toContain('a');
      expect(cycle).toContain('b');
      expect(cycle).toContain('c');
    });
  });

  describe('キャッシュの更新', () => {
    it('ファイル変更を検出してキャッシュを更新する', async () => {
      const testFile = path.join(testProjectRoot, 'update-test.md');
      
      // 初期ファイルを作成
      await writeFile(testFile, `# Initial Content

:::template{id="initial"}
# Initial Template
:::
`);

      // 初回キャッシュ構築
      const initialCache = await cacheManager.getCacheData();
      expect(initialCache.templates.has('initial')).toBe(true);
      
      // ファイルを変更
      await writeFile(testFile, `# Updated Content

:::template{id="updated"}
# Updated Template
:::
`);

      // キャッシュを更新
      const updateResult = await cacheManager.refreshCache();
      expect(updateResult.updatedFiles).toBe(1);
      
      // 更新後のキャッシュを確認
      const updatedCache = await cacheManager.getCacheData();
      expect(updatedCache.templates.has('initial')).toBe(false);
      expect(updatedCache.templates.has('updated')).toBe(true);
    });

    it('ファイル削除を検出してキャッシュから除去する', async () => {
      const testFile = path.join(testProjectRoot, 'delete-test.md');
      
      // ファイルを作成
      await writeFile(testFile, `:::template{id="to-delete"}
# Template to Delete
:::`);

      // 初回キャッシュ構築
      await cacheManager.getCacheData();
      
      // ファイルを削除
      await rm(testFile);
      
      // キャッシュを更新
      const updateResult = await cacheManager.refreshCache();
      expect(updateResult.removedFiles).toBe(1);
      
      // 削除後のキャッシュを確認
      const updatedCache = await cacheManager.getCacheData();
      expect(updatedCache.files.has(testFile)).toBe(false);
      expect(updatedCache.templates.has('to-delete')).toBe(false);
    });
  });

  describe('キャッシュの永続化', () => {
    it('キャッシュをファイルに保存し、再読み込みできる', async () => {
      const testFile = path.join(testProjectRoot, 'persist-test.md');
      
      await writeFile(testFile, `:::template{id="persist"}
# Persistent Template
:::`);

      // キャッシュを構築
      const originalCache = await cacheManager.getCacheData();
      expect(originalCache.templates.has('persist')).toBe(true);
      
      // 新しいCacheManagerインスタンスを作成
      const newCacheManager = new CacheManager({
        projectRoot: testProjectRoot,
      });
      
      // キャッシュが復元されることを確認
      const restoredCache = await newCacheManager.getCacheData();
      expect(restoredCache.templates.has('persist')).toBe(true);
      expect(restoredCache.files.size).toBe(originalCache.files.size);
    });
  });
});