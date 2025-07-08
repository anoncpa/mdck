// src/run-cache-test.ts - キャッシュ機能の簡単なテスト
import { MdckParser } from './index';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

async function testCacheFeatures() {
  const testDir = path.join(process.cwd(), 'tmp_cache_test');
  
  try {
    console.log('=== mdck Cache機能テスト ===\n');
    
    // テストディレクトリを作成
    await mkdir(testDir, { recursive: true });
    
    // MdckParserを初期化
    const parser = new MdckParser();
    parser.initializeCache(testDir, {
      maxConcurrency: 2, // 並列数を制限してメモリ使用量を削減
    });
    
    console.log('1. 空のプロジェクトでキャッシュ初期化');
    const emptyCache = await parser.getCacheData();
    console.log(`   Files: ${emptyCache?.files.size || 0}`);
    console.log(`   Templates: ${emptyCache?.templates.size || 0}\n`);
    
    // テストファイルを作成
    const testFile1 = path.join(testDir, 'templates.md');
    await writeFile(testFile1, `# Templates File

:::template{id="base"}
# Base Template
- [ ] Base task
:::

:::template{id="child"}
# Child Template
::template{id="base"}
- [ ] Child task
:::
`);
    
    const testFile2 = path.join(testDir, 'usage.md');
    await writeFile(testFile2, `# Usage File

:::template{id="usage"}
# Usage Template
::template{id="base"}
::template{id="child"}
- [ ] Usage task
:::
`);
    
    console.log('2. ファイル追加後のキャッシュ更新');
    const updateResult = await parser.refreshCache();
    console.log(`   Added files: ${updateResult?.addedFiles || 0}`);
    console.log(`   Duration: ${updateResult?.duration || 0}ms\n`);
    
    const updatedCache = await parser.getCacheData();
    console.log('3. 更新後のキャッシュ状態');
    console.log(`   Files: ${updatedCache?.files.size || 0}`);
    console.log(`   Templates: ${updatedCache?.templates.size || 0}\n`);
    
    // 依存関係グラフの確認
    if (updatedCache?.dependencies) {
      console.log('4. 依存関係グラフ');
      const deps = updatedCache.dependencies;
      console.log(`   Nodes: [${Array.from(deps.nodes).join(', ')}]`);
      console.log('   Dependencies:');
      for (const [from, toSet] of deps.edges) {
        if (toSet.size > 0) {
          console.log(`     ${from} -> [${Array.from(toSet).join(', ')}]`);
        }
      }
      console.log();
    }
    
    // ファイルメタデータの確認
    console.log('5. ファイルメタデータ');
    if (updatedCache?.files) {
      for (const [filePath, metadata] of updatedCache.files) {
        const fileName = path.basename(filePath);
        console.log(`   ${fileName}:`);
        console.log(`     Template IDs: [${metadata.templateIds.join(', ')}]`);
        console.log(`     Reference IDs: [${metadata.referenceIds.join(', ')}]`);
        if (metadata.errors) {
          console.log(`     Errors: ${metadata.errors.length}`);
        }
      }
    }
    console.log();
    
    // 重複テンプレートのテスト
    const duplicateFile = path.join(testDir, 'duplicate.md');
    await writeFile(duplicateFile, `:::template{id="duplicate"}
# First Template
:::

:::template{id="duplicate"}
# Second Template
:::
`);
    
    console.log('6. 重複テンプレートのテスト');
    await parser.refreshCache();
    const finalCache = await parser.getCacheData();
    
    const duplicateMetadata = finalCache?.files.get(duplicateFile);
    if (duplicateMetadata?.errors) {
      console.log(`   Errors detected: ${duplicateMetadata.errors.length}`);
      console.log(`   Error type: ${duplicateMetadata.errors[0].type}`);
      console.log(`   Template ID: ${duplicateMetadata.errors[0].templateId}`);
    } else {
      console.log('   No errors detected');
    }
    console.log();
    
    // Lintとの連携テスト
    console.log('7. Lintとの連携テスト');
    const lintResult = await parser.lint(await import('fs/promises').then(fs => fs.readFile(duplicateFile, 'utf8')), duplicateFile);
    console.log(`   Lint errors: ${lintResult.errorCount}`);
    console.log(`   Lint warnings: ${lintResult.warningCount}`);
    if (lintResult.results.length > 0) {
      console.log(`   First error: ${lintResult.results[0].message}`);
    }
    console.log();
    
    console.log('=== キャッシュ機能テスト完了 ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // クリーンアップ
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true });
      console.log('Test directory cleaned up');
    }
  }
}

// スクリプト実行
if (require.main === module) {
  testCacheFeatures().catch(console.error);
}

export { testCacheFeatures };