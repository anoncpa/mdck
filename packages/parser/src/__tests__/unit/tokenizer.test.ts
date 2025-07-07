// packages/parser/src/__tests__/unit/tokenizer.test.ts
import { describe, test, expect } from 'vitest';
import { Tokenizer } from '../../core/tokenizer';
import { MarkdownSamples } from '../fixtures/markdown-samples';

describe('Tokenizer', () => {
  // Arrange: テスト用のTokenizerインスタンスを準備
  const tokenizer = new Tokenizer();

  describe('基本的なトークン化', () => {
    test('空のコンテンツを正しく処理する', () => {
      // Arrange
      const content = '';

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert
      expect(tokens).toEqual([]);
    });

    test('基本的なMarkdownをトークン化する', () => {
      // Arrange
      const content = '# ヘッダー\n\n段落テキスト';

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert
      expect(tokens).toHaveLength(4); // heading_open, inline, heading_close, paragraph_open, inline, paragraph_close
      expect(tokens[0].type).toBe('heading_open');
      expect(tokens[0].tag).toBe('h1');
      expect(tokens[1].type).toBe('inline');
      expect(tokens[1].content).toBe('ヘッダー');
    });

    test('HTMLタグを含むMarkdownを正しく処理する', () => {
      // Arrange
      const content = 'テキスト <Tag itemId="test" /> 続き';

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert
      const htmlTokens = tokens.filter(
        (token) => token.type === 'html_inline' || token.type === 'html_block'
      );
      expect(htmlTokens).toHaveLength(1);
      expect(htmlTokens[0].content).toBe('<Tag itemId="test" />');
    });
  });

  describe('レンダリング機能', () => {
    test('トークンをHTMLに正しくレンダリングする', () => {
      // Arrange
      const content = '# ヘッダー\n\n段落';
      const tokens = tokenizer.tokenize(content);

      // Act
      const html = tokenizer.render(tokens);

      // Assert
      expect(html).toContain('<h1>ヘッダー</h1>');
      expect(html).toContain('<p>段落</p>');
    });

    test('カスタムタグを含むコンテンツをレンダリングする', () => {
      // Arrange
      const content = '<Tag itemId="test" />';
      const tokens = tokenizer.tokenize(content);

      // Act
      const html = tokenizer.render(tokens);

      // Assert
      expect(html).toContain('<Tag itemId="test" />');
    });
  });

  describe('エッジケース', () => {
    test('不正なHTMLを含むコンテンツを処理する', () => {
      // Arrange
      const content = '<Tag itemId="incomplete"';

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('paragraph_open');
    });

    test('非常に長いコンテンツを処理する', () => {
      // Arrange
      const longContent = 'テスト '.repeat(10000);

      // Act
      const tokens = tokenizer.tokenize(longContent);

      // Assert
      expect(tokens).toHaveLength(2); // paragraph_open, inline, paragraph_close
      expect(tokens[1].content).toBe(longContent.trim());
    });
  });
});
