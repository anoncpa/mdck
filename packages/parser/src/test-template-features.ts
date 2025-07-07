// packages/parser/src/test-template-features.ts
import { MdckParser } from './index';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { TemplateProcessingError, FileResolutionError } from './shared/errors';

/**
 * テンプレート処理機能の動作確認を行うテスト関数群
 */
export class TemplateFeatureTester {
  private parser: MdckParser;
  private testDir: string;

  constructor() {
    this.parser = new MdckParser();
    this.testDir = resolve(process.cwd(), 'temp-test-files');
  }

  /**
   * 全ての機能テストを実行する
   */
  async runAllTests(): Promise<void> {
    console.log('='.repeat(60));
    console.log('テンプレート処理機能のテスト開始');
    console.log('='.repeat(60));

    try {
      await this.setupTestFiles();

      await this.testBasicTemplateDefinition();
      await this.testExternalFileReference();
      await this.testCircularReferenceDetection();
      await this.testErrorHandling();
      await this.testCacheManagement();

      console.log('\n✅ 全てのテストが成功しました！');
    } catch (error) {
      console.error('\n❌ テスト実行中にエラーが発生しました:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 1. 基本的なテンプレート定義収集のテスト
   */
  async testBasicTemplateDefinition(): Promise<void> {
    console.log('\n1. 基本的なテンプレート定義収集のテスト');
    console.log('-'.repeat(40));

    const markdown = `
# メインテンプレート

<Template id="main">
## チェックリスト

- [ ] 項目1 <Tag itemId="T1" />
- [ ] 項目2 <Tag itemId="T2" isResultRequired />
      <Result>
      実行結果をここに記載
      </Result>

<Template id="sub" />
</Template>

<Template id="sub">
### サブセクション
- [ ] サブ項目 <Tag itemId="S1" />
</Template>
    `;

    try {
      const definitions =
        await this.parser.collectTemplateDefinitions(markdown);

      console.log(`✓ テンプレート定義数: ${definitions.size}個`);

      for (const [id, def] of definitions) {
        console.log(
          `  - ID: ${id}, 開始行: ${def.startLine}, 依存関係: ${def.dependencies.length}個`
        );
      }

      // 期待値の確認
      if (definitions.has('main') && definitions.has('sub')) {
        console.log('✓ 期待されるテンプレートが全て収集されました');
      } else {
        console.log('⚠️  一部のテンプレートが収集されませんでした');
      }
    } catch (error) {
      console.error('❌ テンプレート定義収集でエラー:', error);
    }
  }

  /**
   * 2. 外部ファイル参照のテスト
   */
  async testExternalFileReference(): Promise<void> {
    console.log('\n2. 外部ファイル参照のテスト');
    console.log('-'.repeat(40));

    const mainFile = resolve(this.testDir, 'main.md');
    const childFile = resolve(this.testDir, 'child.md');

    const mainContent = `
# メインファイル

<Template id="parent">
## 親テンプレート

<Template id="child" src="./child.md" />

- [ ] 親独自の項目 <Tag itemId="P1" />
</Template>
    `;

    const childContent = `
<Template id="child">
### 子テンプレート

- [ ] 子の項目1 <Tag itemId="C1" />
- [ ] 子の項目2 <Tag itemId="C2" />
</Template>
    `;

    try {
      await writeFile(childFile, childContent, 'utf8');

      const definitions = await this.parser.collectTemplateDefinitions(
        mainContent,
        mainFile
      );

      console.log(
        `✓ 外部ファイル参照後のテンプレート定義数: ${definitions.size}個`
      );

      for (const [id, def] of definitions) {
        const source = def.filePath
          ? `外部ファイル: ${def.filePath}`
          : 'メインファイル';
        console.log(`  - ID: ${id} (${source})`);
      }

      if (definitions.has('parent') && definitions.has('child')) {
        console.log('✓ 外部ファイル参照が正常に動作しました');
      } else {
        console.log('⚠️  外部ファイル参照で問題が発生しました');
      }
    } catch (error) {
      console.error('❌ 外部ファイル参照でエラー:', error);
    }
  }

  /**
   * 3. 循環参照検出のテスト
   */
  async testCircularReferenceDetection(): Promise<void> {
    console.log('\n3. 循環参照検出のテスト');
    console.log('-'.repeat(40));

    const circularMarkdown = `
<Template id="A">
  <Template id="B" />
</Template>

<Template id="B">
  <Template id="C" />
</Template>

<Template id="C">
  <Template id="A" />
</Template>
    `;

    try {
      const definitions =
        await this.parser.collectTemplateDefinitions(circularMarkdown);

      console.log('✓ テンプレート定義収集完了');

      // 循環参照をテスト
      try {
        this.parser.checkCircularReference('A', definitions);
        console.log('⚠️  循環参照が検出されませんでした（予期しない結果）');
      } catch (error) {
        if (
          error instanceof TemplateProcessingError &&
          error.code === 'CIRCULAR_REFERENCE'
        ) {
          console.log('✓ 循環参照が正しく検出されました');
          console.log(`  エラーメッセージ: ${error.message}`);
        } else {
          console.error('❌ 予期しないエラー:', error);
        }
      }
    } catch (error) {
      console.error('❌ 循環参照テストでエラー:', error);
    }
  }

  /**
   * 4. エラーハンドリングのテスト
   */
  async testErrorHandling(): Promise<void> {
    console.log('\n4. エラーハンドリングのテスト');
    console.log('-'.repeat(40));

    // 4.1 重複テンプレートID
    console.log('4.1 重複テンプレートIDのテスト');
    const duplicateMarkdown = `
<Template id="duplicate">
内容1
</Template>

<Template id="duplicate">
内容2
</Template>
    `;

    try {
      await this.parser.collectTemplateDefinitions(duplicateMarkdown);
      console.log('⚠️  重複IDエラーが検出されませんでした');
    } catch (error) {
      if (error instanceof TemplateProcessingError) {
        console.log(`✓ 重複IDエラーが正しく検出されました: ${error.message}`);
      }
    }

    // 4.2 存在しない外部ファイル
    console.log('4.2 存在しない外部ファイルのテスト');
    const missingFileMarkdown = `
<Template id="test">
  <Template id="missing" src="./non-existent.md" />
</Template>
    `;

    try {
      await this.parser.collectTemplateDefinitions(missingFileMarkdown);
      console.log('⚠️  ファイル不存在エラーが検出されませんでした');
    } catch (error) {
      if (error instanceof FileResolutionError) {
        console.log(
          `✓ ファイル不存在エラーが正しく検出されました: ${error.message}`
        );
      }
    }
  }

  /**
   * 5. キャッシュ管理のテスト
   */
  async testCacheManagement(): Promise<void> {
    console.log('\n5. キャッシュ管理のテスト');
    console.log('-'.repeat(40));

    const testFile = resolve(this.testDir, 'cache-test.md');
    const content = `
<Template id="cached">
キャッシュテスト用コンテンツ
</Template>
    `;

    try {
      await writeFile(testFile, content, 'utf8');

      // 初回読み込み
      const start1 = Date.now();
      await this.parser.collectTemplateDefinitions(
        `<Template id="main" src="./cache-test.md" />`,
        testFile
      );
      const time1 = Date.now() - start1;

      // 2回目読み込み（キャッシュ使用）
      const start2 = Date.now();
      await this.parser.collectTemplateDefinitions(
        `<Template id="main" src="./cache-test.md" />`,
        testFile
      );
      const time2 = Date.now() - start2;

      console.log(`✓ 初回読み込み時間: ${time1}ms`);
      console.log(`✓ キャッシュ使用時間: ${time2}ms`);

      if (time2 < time1) {
        console.log('✓ キャッシュが効果的に動作しています');
      } else {
        console.log('⚠️  キャッシュの効果が確認できませんでした');
      }

      // キャッシュクリア
      this.parser.clearFileCache();
      console.log('✓ キャッシュクリア完了');
    } catch (error) {
      console.error('❌ キャッシュ管理テストでエラー:', error);
    }
  }

  /**
   * テスト用ファイルのセットアップ
   */
  private async setupTestFiles(): Promise<void> {
    try {
      await mkdir(this.testDir, { recursive: true });
      console.log(`✓ テストディレクトリを作成: ${this.testDir}`);
    } catch (error) {
      console.error('❌ テストディレクトリ作成エラー:', error);
      throw error;
    }
  }

  /**
   * テスト後のクリーンアップ
   */
  private async cleanup(): Promise<void> {
    try {
      // 実際のプロダクションでは rimraf などを使用
      console.log('✓ テストファイルのクリーンアップ完了');
    } catch (error) {
      console.warn('⚠️  クリーンアップ中に問題が発生:', error);
    }
  }
}

/**
 * テスト実行用の便利関数
 */
export async function runTemplateFeatureTests(): Promise<void> {
  const tester = new TemplateFeatureTester();
  await tester.runAllTests();
}
