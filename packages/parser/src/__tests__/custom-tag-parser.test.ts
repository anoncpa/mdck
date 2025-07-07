// packages/parser/src/__tests__/custom-tag-parser.spec.ts
import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../core/tokenizer';
import { parseCustomTags } from '../core/custom-tag-parser';

describe('parseCustomTags', () => {
  it('カスタムタグを抽出できる', () => {
    // arrange
    const md = `
- [ ] 仕様確認 <Tag itemId="C1" />
<Tag itemId="C2" isResultRequired />
    `;
    const tokens = new Tokenizer().tokenize(md);

    // act
    const tags = parseCustomTags(tokens);

    // assert
    expect(tags).toHaveLength(2);
    expect(tags[0].attributes.itemId).toBe('C1');
    expect(tags[1].attributes).toMatchObject({
      itemId: 'C2',
      isResultRequired: true,
    });
  });
});
