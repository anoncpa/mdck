// packages/parser/src/index.ts
// このファイルは@mdck/parserパッケージの主要な機能をエクスポートするエントリーポイントです。
// 現時点ではプレースホルダとして機能しますが、将来的にはMdckParserクラスなどが実装されます。
console.log('This is @mdck/parser');

export function parse(text: string): Record<string, unknown> {
  // ダミーの実装：将来的には完全なパーサーロジックが入ります。
  if (!text) return {};
  return { parsed: true };
}
