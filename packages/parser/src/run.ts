// packages/parser/src/run.ts
import { MdckParser } from './index';
import { runTemplateFeatureTests } from './test-template-features';

/**
 * パーサーの動作確認に使用するマークダウンのサンプルテキスト。
 * 複数のカスタムタグを含んでいます。
 */
const sampleMarkdown = `
# 総合ビルド・デプロイチェックリスト

## 事前準備

<Template id="child1" src="./child1.md" />

- [ ] 仕様書が最新か確認する <Tag itemId="C1" />
- [x] 関係者にレビュー依頼を送付 <Tag itemId="C2" isResultRequired />
      <Result>Slack で依頼済み @2025-07-06</Result>

## 最終確認

- [ ] プロダクション環境の確認 <Tag itemId="P1" isResultRequired />
      <Result></Result>
`;

/**
 * パーサーをインスタンス化し、サンプルテキストを解析して結果を出力するメイン関数。
 */
function main() {
  console.log('--- MdckParser Execution Start ---');

  // パーサーをインスタンス化
  const parser = new MdckParser();

  // サンプルテキストを解析
  const result = parser.parse(sampleMarkdown);

  // 解析結果を整形してコンソールに出力
  console.log('--- Parse Result ---');
  console.log('Tokens count:', result.tokens.length);
  console.log('Custom tags:');
  result.customTags.forEach((tag, index) => {
    console.log(`  ${index + 1}. ${tag.tagName} (line: ${tag.line})`);
    console.log(`     Attributes:`, tag.attributes);
    console.log(`     Self-closing: ${tag.isSelfClosing}`);
  });

  // 行番号解決の改善を確認
  console.log('--- Line Number Resolution Test ---');
  const tagsWithValidLines = result.customTags.filter((tag) => tag.line > 0);
  const tagsWithInvalidLines = result.customTags.filter(
    (tag) => tag.line === -1
  );
  console.log(`Tags with valid line numbers: ${tagsWithValidLines.length}`);
  console.log(
    `Tags with unresolved line numbers: ${tagsWithInvalidLines.length}`
  );

  console.log('--- MdckParser Execution End ---');
}

// 既存のmain関数の後に追加
async function testTemplateFeatures() {
  console.log('\n' + '='.repeat(60));
  console.log('テンプレート機能のテスト実行');
  console.log('='.repeat(60));

  await runTemplateFeatureTests();
}

// main関数の後に追加
async function runAll() {
  main(); // 既存の基本テスト
  await testTemplateFeatures(); // 新しいテンプレート機能テスト
}

// スクリプトとして実行された場合
if (require.main === module) {
  runAll().catch(console.error);
}
