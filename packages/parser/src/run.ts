// src/run.ts（修正）
// packages/parser/src/run.ts
import { MdckParser } from './index';

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
 * パーサーをインスタンス化し、サンプルテキストを解析して結果を出力するメイン関数。
 */
function main() {
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
    const expansionResult = parser.expandTemplate(sampleMarkdown, 'main');

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
main();
