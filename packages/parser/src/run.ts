// src/run.ts
import { MdckParser } from './index';
import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';

/**
 * パーサーの動作確認に使用するマークダウンのサンプルテキスト。
 * remark-directiveの構文に準拠した適切な記法を使用。
 */
const sampleMarkdown = `# 総合ビルド・デプロイチェックリスト

:::template{id="main"}
## 事前準備
::template{id="common"}

## デプロイ準備
::template{id="deploy"}

## 最終確認
- [ ] プロダクション環境の確認

:::result{}
プロダクション環境正常、デプロイ可能
:::
:::

:::template{id="common"}
- [ ] 仕様書が最新か確認する
- [x] 関係者にレビュー依頼を送付

:::result{}
Slack で依頼済み @2025-07-06
:::
:::

:::template{id="deploy"}
- [ ] テストの実行確認
- [ ] ステージング環境での動作確認

:::result{}
全テストパス、ステージング正常動作確認
:::
:::
`;

/**
 * 循環参照エラーをテストするためのマークダウン。
 * templateA → templateB → templateA の循環を作る。
 */
const circularReferenceMarkdown = `# 循環参照テストケース

:::template{id="templateA"}
# Template A
::template{id="templateB"}
- [ ] Template A の追加タスク
:::

:::template{id="templateB"}
# Template B
::template{id="templateC"}
- [ ] Template B の追加タスク
:::

:::template{id="templateC"}
# Template C
::template{id="templateA"}
- [ ] Template C の追加タスク
:::
`;

/**
 * より複雑な循環参照のテストケース
 */
const complexCircularMarkdown = `# 複雑な循環参照テストケース

:::template{id="root"}
# Root Template
::template{id="branch1"}
::template{id="branch2"}
:::

:::template{id="branch1"}
# Branch 1
::template{id="leaf1"}
:::

:::template{id="branch2"}
# Branch 2
::template{id="leaf2"}
:::

:::template{id="leaf1"}
# Leaf 1
::template{id="leaf2"}
:::

:::template{id="leaf2"}
# Leaf 2
::template{id="branch1"}
:::
`;

/**
 * ネストされた外部ファイルインポートのテスト用データ
 */
const nestedImportTestData = {
  // level3.md - 最深レベル
  level3: `:::template{id="level3"}
# Level 3 Template
- [ ] Level 3 でのデータベース接続確認
- [ ] Level 3 でのAPI疎通確認
- [ ] Level 3 でのログ出力確認

:::result{}
Level 3 の全項目チェック完了
:::
:::`,

  // level2.md - 中間レベル（level3を参照）
  level2: `:::template{id="level2"}
# Level 2 Template
::template{id="level3" src="./level3.md"}

## Level 2 独自項目
- [ ] Level 2 でのパフォーマンステスト
- [ ] Level 2 でのセキュリティチェック

:::result{}
Level 2 の処理完了、Level 3 も含めて正常
:::
:::`,

  // level1.md - 上位レベル（level2を参照、さらにlevel3も間接参照）
  level1: `:::template{id="level1"}
# Level 1 Template
::template{id="level2" src="./level2.md"}

## Level 1 独自項目
- [ ] Level 1 でのE2Eテスト実行
- [ ] Level 1 でのユーザー受け入れテスト

:::result{}
Level 1 の全工程完了
:::
:::`,

  // main.md - ルートファイル（level1を参照、間接的にlevel2, level3も参照）
  main: `:::template{id="nested-main"}
# ネストインポート統合テスト

## 事前準備
::template{id="level1" src="./level1.md"}

## 最終確認
- [ ] 全レベルでの動作確認
- [ ] ドキュメント更新

:::result{}
ネストされたインポート展開テスト完了
:::
:::`,

  // mixed.md - 外部参照とローカル定義の混在
  mixed: `:::template{id="mixed-root"}
# 混在テンプレート

## 外部参照セクション
::template{id="level1" src="./level1.md"}

## ローカル定義セクション
::template{id="local-template"}

:::result{}
混在パターンのテスト完了
:::
:::

:::template{id="local-template"}
# ローカルテンプレート
- [ ] ローカルで定義されたタスク1
- [ ] ローカルで定義されたタスク2

:::result{}
ローカルタスク完了
:::
:::`,
};

/**
 * テスト用の一時ディレクトリを作成し、ネストインポート用のファイルを作成する
 */
async function setupNestedImportFiles(): Promise<string> {
  const testDir = path.join(process.cwd(), 'temp-nested-test');

  try {
    await rm(testDir, { recursive: true });
  } catch {
    // ディレクトリが存在しない場合は無視
  }

  await mkdir(testDir, { recursive: true });

  // テストファイルを作成
  await writeFile(path.join(testDir, 'level3.md'), nestedImportTestData.level3);
  await writeFile(path.join(testDir, 'level2.md'), nestedImportTestData.level2);
  await writeFile(path.join(testDir, 'level1.md'), nestedImportTestData.level1);
  await writeFile(path.join(testDir, 'main.md'), nestedImportTestData.main);
  await writeFile(path.join(testDir, 'mixed.md'), nestedImportTestData.mixed);

  console.log(`✅ ネストインポートテスト用ファイルを作成: ${testDir}`);
  return testDir;
}

/**
 * テスト用ディレクトリを削除する
 */
async function cleanupNestedImportFiles(testDir: string): Promise<void> {
  try {
    await rm(testDir, { recursive: true });
    console.log(`🧹 テスト用ディレクトリを削除: ${testDir}`);
  } catch (error) {
    console.warn(`⚠️  ディレクトリ削除に失敗: ${error}`);
  }
}

/**
 * パーサーをインスタンス化し、サンプルテキストを解析して結果を出力するメイン関数。
 */
async function main() {
  console.log('--- MdckParser (remark-based) Execution Start ---');

  // パーサーをインスタンス化
  const parser = new MdckParser();

  // サンプルテキストを解析
  const result = parser.parse(sampleMarkdown);

  // 解析結果を整形してコンソールに出力
  console.log('--- Parse Result ---');
  console.log('AST generated successfully.');
  console.log('Mdck directives found:', result.directives.length);
  result.directives.forEach((directive, index) => {
    console.log(
      `  ${index + 1}. ::${directive.name} (type: ${directive.type}, line: ${directive.line})`
    );
    console.log(`     Attributes:`, directive.attributes);
    if (directive.content) {
      console.log(`     Content: "${directive.content}"`);
    }
    if (directive.children.length > 0) {
      console.log(`     Has children: ${directive.children.length}`);
    }
  });

  // テンプレート展開のテスト
  console.log('\n--- Template Expansion Test ---');
  try {
    const expansionResult = await parser.expandTemplate(sampleMarkdown, 'main');

    if (expansionResult.status === 'success') {
      console.log('Template expansion successful!');
      console.log(
        'Used definitions:',
        Array.from(expansionResult.usedDefinitions.keys())
      );

      // 展開結果をMarkdownに変換
      const expandedMarkdown = parser.stringify(expansionResult.expandedAst);
      console.log('Expanded markdown length:', expandedMarkdown.length);
    } else {
      console.log('Template expansion failed:');
      console.log('Error type:', expansionResult.errorType);
      console.log('Message:', expansionResult.message);
    }
  } catch (error) {
    console.log(
      'Template expansion error:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // 循環参照エラーテスト
  console.log('\n--- Circular Reference Test ---');
  try {
    const circularResult = await parser.expandTemplate(
      circularReferenceMarkdown,
      'templateA'
    );

    if (circularResult.status === 'error') {
      console.log('✅ Circular reference correctly detected!');
      console.log('Error type:', circularResult.errorType);
      console.log('Message:', circularResult.message);
    } else {
      console.log(
        '❌ Circular reference should have been detected but was not!'
      );
    }
  } catch (error) {
    console.log(
      'Circular reference test error:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // 複雑な循環参照エラーテスト
  console.log('\n--- Complex Circular Reference Test ---');
  try {
    const complexCircularResult = await parser.expandTemplate(
      complexCircularMarkdown,
      'root'
    );

    if (complexCircularResult.status === 'error') {
      console.log('✅ Complex circular reference correctly detected!');
      console.log('Error type:', complexCircularResult.errorType);
      console.log('Message:', complexCircularResult.message);
    } else {
      console.log(
        '❌ Complex circular reference should have been detected but was not!'
      );
    }
  } catch (error) {
    console.log(
      'Complex circular reference test error:',
      error instanceof Error ? error.message : String(error)
    );
  }

  // 🆕 ネストされた外部ファイルインポートテスト
  console.log('\n--- Nested External File Import Test ---');
  let testDir: string | null = null;

  try {
    // テスト用ファイルを作成
    testDir = await setupNestedImportFiles();

    // ネストされたインポートの展開テスト
    const mainFilePath = path.join(testDir, 'main.md');
    const mainContent = nestedImportTestData.main;

    console.log('🔄 3レベルのネストインポート展開を実行中...');
    const nestedResult = await parser.expandTemplate(
      mainContent,
      'nested-main',
      mainFilePath
    );

    if (nestedResult.status === 'success') {
      console.log('✅ Nested import expansion successful!');
      console.log('📊 Used template definitions:');
      Array.from(nestedResult.usedDefinitions.keys()).forEach((id, index) => {
        console.log(`  ${index + 1}. ${id}`);
      });

      console.log(
        `\n📏 Total used definitions: ${nestedResult.usedDefinitions.size}`
      );

      // 展開結果を確認
      const expandedContent = parser.stringify(nestedResult.expandedAst);
      console.log(
        `📄 Expanded content length: ${expandedContent.length} characters`
      );

      // 各レベルのコンテンツが含まれているかチェック
      const contentChecks = [
        { level: 'Level 1', text: 'Level 1 でのE2Eテスト実行' },
        { level: 'Level 2', text: 'Level 2 でのパフォーマンステスト' },
        { level: 'Level 3', text: 'Level 3 でのデータベース接続確認' },
      ];

      console.log('\n🔍 ネストされたコンテンツの確認:');
      contentChecks.forEach((check) => {
        const found = expandedContent.includes(check.text);
        console.log(
          `  ${found ? '✅' : '❌'} ${check.level}: ${found ? 'Found' : 'Not found'}`
        );
      });
    } else {
      console.log('❌ Nested import expansion failed:');
      console.log('Error type:', nestedResult.errorType);
      console.log('Message:', nestedResult.message);
    }

    // 混在パターンのテスト
    console.log('\n--- Mixed Local/External Template Test ---');
    const mixedFilePath = path.join(testDir, 'mixed.md');
    const mixedContent = nestedImportTestData.mixed;

    console.log('🔄 外部参照とローカル定義の混在パターンを実行中...');
    const mixedResult = await parser.expandTemplate(
      mixedContent,
      'mixed-root',
      mixedFilePath
    );

    if (mixedResult.status === 'success') {
      console.log('✅ Mixed template expansion successful!');
      console.log('📊 Used template definitions:');
      Array.from(mixedResult.usedDefinitions.keys()).forEach((id, index) => {
        console.log(`  ${index + 1}. ${id}`);
      });

      const mixedExpandedContent = parser.stringify(mixedResult.expandedAst);
      const hasLocal =
        mixedExpandedContent.includes('ローカルで定義されたタスク1');
      const hasExternal =
        mixedExpandedContent.includes('Level 1 でのE2Eテスト実行');

      console.log('\n🔍 混在パターンの確認:');
      console.log(
        `  ${hasLocal ? '✅' : '❌'} ローカル定義: ${hasLocal ? 'Found' : 'Not found'}`
      );
      console.log(
        `  ${hasExternal ? '✅' : '❌'} 外部参照: ${hasExternal ? 'Found' : 'Not found'}`
      );
    } else {
      console.log('❌ Mixed template expansion failed:');
      console.log('Error type:', mixedResult.errorType);
      console.log('Message:', mixedResult.message);
    }
  } catch (error) {
    console.log(
      '❌ Nested import test error:',
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    // テスト用ファイルをクリーンアップ
    if (testDir) {
      await cleanupNestedImportFiles(testDir);
    }
  }

  // ASTの文字列化をテスト
  console.log('\n--- Stringify Test ---');
  const stringified = parser.stringify(result.ast);
  console.log(
    'Stringified output is similar to original input:',
    stringified.trim().length > 0
  );

  console.log('\n--- MdckParser Execution End ---');
}

// スクリプトとして実行された場合にmain関数を呼び出す
main().catch(console.error);
