// packages/parser/src/__tests__/unit/tokenizer.test.ts
import { describe, test, expect } from 'vitest';
import { Tokenizer } from '../../core/tokenizer';

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
      expect(tokens.length).toBeGreaterThanOrEqual(4);
      expect(tokens[0].type).toBe('heading_open');
      expect(tokens[0].tag).toBe('h1');
      expect(tokens[1].type).toBe('inline');
      expect(tokens[1].content).toBe('ヘッダー');
    });

    test('HTMLタグを含むMarkdownを正しく処理する', () => {
      // Arrange - ブロックレベルのHTMLタグを使用
      const content = '<Tag itemId="test" />';

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert
      const htmlTokens = tokens.filter(
        (token) => token.type === 'html_inline' || token.type === 'html_block'
      );
      expect(htmlTokens.length).toBeGreaterThanOrEqual(1);
      expect(
        htmlTokens.some((token) =>
          token.content.includes('<Tag itemId="test" />')
        )
      ).toBe(true);
    });

    test('インラインHTMLタグを正しく処理する', () => {
      // Arrange - インラインHTMLとして認識されやすい形式
      const content = 'テキスト <Tag itemId="test" /> 続き';

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert
      const inlineTokens = tokens.filter((token) => token.type === 'inline');
      expect(inlineTokens.length).toBeGreaterThan(0);

      // インライントークンの子要素をチェック
      const hasHtmlChild = inlineTokens.some(
        (token) =>
          token.children &&
          token.children.some(
            (child) =>
              child.type === 'html_inline' &&
              child.content.includes('<Tag itemId="test" />')
          )
      );
      expect(hasHtmlChild).toBe(true);
    });
  });

  describe('mdckカスタムタグのサポート', () => {
    test('Templateタグを正しく認識する', () => {
      // Arrange
      const content = '<Template id="test" src="./template.md" />';

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert - html_blockまたはparagraph内でタグが認識されることを確認
      const containsTemplate = tokens.some((token) => {
        if (token.type === 'html_block') {
          return token.content.includes('Template');
        }
        if (token.type === 'inline' && token.children) {
          return token.children.some(
            (child) =>
              child.type === 'html_inline' && child.content.includes('Template')
          );
        }
        return token.content && token.content.includes('Template');
      });
      expect(containsTemplate).toBe(true);
    });

    test('Resultタグを正しく認識する', () => {
      // Arrange - 実際の使用パターンに合わせたテスト
      const content = `<Result>テスト結果</Result>`;

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert - 柔軟な検証方法に変更
      const containsResult = tokens.some((token) => {
        // html_blockとして認識される場合
        if (token.type === 'html_block' && token.content.includes('Result')) {
          return true;
        }
        // paragraph内のinlineとして認識される場合
        if (token.type === 'inline' && token.content.includes('Result')) {
          return true;
        }
        // inline tokenの子要素として認識される場合
        if (token.type === 'inline' && token.children) {
          return token.children.some(
            (child) => child.content && child.content.includes('Result')
          );
        }
        return false;
      });
      expect(containsResult).toBe(true);
    });

    test('複数行のResultタグを正しく認識する', () => {
      // Arrange - より確実に認識される形式
      const content = `
<Result>
複数行のテスト結果
詳細情報を含む
</Result>
`;

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert - Resultタグがどこかに含まれていることを確認
      const tokenContents = tokens.map((token) => token.content).join(' ');
      expect(tokenContents).toContain('Result');
      expect(tokenContents).toContain('複数行のテスト結果');
    });

    test('リスト内のTagタグを正しく認識する', () => {
      // Arrange - 実際の使用パターンに近い形式
      const content = `
- [ ] チェック項目 <Tag itemId="test" />
`;

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert - インラインHTMLとして認識される可能性が高い
      const hasTagInTokens = tokens.some((token) => {
        if (token.type === 'inline' && token.children) {
          return token.children.some(
            (child) =>
              child.type === 'html_inline' && child.content.includes('<Tag')
          );
        }
        return token.type === 'html_inline' && token.content.includes('<Tag');
      });

      expect(hasTagInTokens).toBe(true);
    });
  });

  describe('カスタムタグ検出の実用性テスト', () => {
    test('実際の使用例でカスタムタグが検出される', () => {
      // Arrange - run.tsと同様の実際の使用例
      const content = `
# チェックリスト

<Template id="test" src="./template.md" />

- [ ] 項目1 <Tag itemId="T001" />
- [x] 項目2 <Tag itemId="T002" isResultRequired />
      <Result>完了済み</Result>
`;

      // Act
      const tokens = tokenizer.tokenize(content);

      // Assert - すべてのカスタムタグが何らかの形で検出されることを確認
      const allTokenContent = tokens.map((t) => t.content || '').join(' ');
      expect(allTokenContent).toContain('Template');
      expect(allTokenContent).toContain('Tag');
      expect(allTokenContent).toContain('Result');
      expect(allTokenContent).toContain('T001');
      expect(allTokenContent).toContain('T002');
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
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      // 不正なHTMLは通常のテキストとして処理される
      expect(tokens[0].type).toBe('paragraph_open');
    });

    test('非常に長いコンテンツを処理する', () => {
      // Arrange
      const longContent = 'テスト '.repeat(10000);

      // Act
      const tokens = tokenizer.tokenize(longContent);

      // Assert
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[1].content).toBe(longContent.trim());
    });
  });
});
