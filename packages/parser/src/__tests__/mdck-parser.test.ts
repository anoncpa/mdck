// packages/parser/src/__tests__/mdck-parser.spec.ts
import { describe, it, expect } from 'vitest';
import { MdckParser } from '../index';

describe('MdckParser integration', () => {
  it('サンプル Markdown を解析し、期待通りのカスタムタグを取得する', () => {
    // arrange
    const sample = `
# 総合チェックリスト
<Template id="parent">
- [ ] 項目A <Tag itemId="A1" />
  <Result>OK</Result>
<Template id="child" src="./child.md" />
</Template>
    `;
    const parser = new MdckParser();

    // act
    const result = parser.parse(sample);

    // assert
    const ids = result.customTags.map((t) => t.tagName);
    expect(ids).toEqual(['Template', 'Tag', 'Result', 'Template']);
  });
});
