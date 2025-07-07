// packages/parser/src/__tests__/attribute-parser.spec.ts
import { describe, it, expect } from 'vitest';
import { parseTagAttributes } from '../core/attribute-parser';

describe('parseTagAttributes', () => {
  it('値付き属性とブール属性を正しく解析する', () => {
    // arrange
    const tag =
      '<Tag itemId="C1" src="./file.md" isResultRequired customFlag />';

    // act
    const attrs = parseTagAttributes(tag);

    // assert
    expect(attrs).toStrictEqual({
      itemId: 'C1',
      src: './file.md',
      isResultRequired: true,
      customFlag: true,
    });
  });
});
