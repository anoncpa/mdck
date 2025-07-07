// packages/parser/src/run.ts
import { MdckParser } from './index';

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
  // JSON.stringifyの第3引数に2を指定すると、人間が読みやすいようにインデントされる
  console.log(JSON.stringify(result, null, 2));

  console.log('--- MdckParser Execution End ---');
}

// スクリプトとして実行された場合にmain関数を呼び出す
main();
