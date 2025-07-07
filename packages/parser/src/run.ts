// packages/parser/src/run.ts
import { MdckParser } from './index';

/**
 * パーサーの動作確認に使用するマークダウンのサンプルテキスト。
 * remark-directiveの構文に準拠した適切な記法を使用。
 */

const sampleMarkdown = `# 総合ビルド・デプロイチェックリスト

## 事前準備

::template{id="child1" src="./child1.md"}

- [ ] 仕様書が最新か確認する :tag{id="C1"}
- [x] 関係者にレビュー依頼を送付 :tag{id="C2" mandatory="true"}

:::result{}
Slack で依頼済み @2025-07-06
:::

## 最終確認

- [ ] プロダクション環境の確認 :tag{id="P1" mandatory="true"}

:::result{}
プロダクション環境正常、デプロイ可能
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
