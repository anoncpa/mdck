// packages/parser/src/__tests__/tokenizer.spec.ts
import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../core/tokenizer';

describe('Tokenizer', () => {
  it('Markdown をトークン列に変換できる', () => {
    // arrange
    const md = '# Title\n\nParagraph';

    // act
    const tokens = new Tokenizer().tokenize(md);

    // assert
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].type).toBe('heading_open');
  });
});
