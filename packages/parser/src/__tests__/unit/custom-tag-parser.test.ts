// packages/parser/src/__tests__/unit/custom-tag-parser.test.ts
import { describe, expect, test } from 'vitest';
import { parseCustomTags } from '../../core/custom-tag-parser';
import { Tokenizer } from '../../core/tokenizer';
import { MarkdownSamples } from '../fixtures/markdown-samples';

describe('parseCustomTags', () => {
  // Arrange: 共通のTokenizerインスタンス
  const tokenizer = new Tokenizer();

  describe('基本的なタグ抽出', () => {
    test('単一のTagを正しく抽出する', () => {
      // Arrange
      const content = '- [ ] テスト項目 <Tag itemId="T001" />';
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toHaveLength(1);
      expect(customTags[0]).toEqual({
        tagName: 'Tag',
        attributes: { itemId: 'T001' },
        isSelfClosing: true,
        line: expect.any(Number),
      });
    });

    test('複数の異なるタグを正しく抽出する', () => {
      // Arrange
      const content = `<Template id="test" />

- [ ] 項目 <Tag itemId="T001" />

<Result>結果</Result>`;
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toHaveLength(3);
      expect(customTags[0].tagName).toBe('Template');
      expect(customTags[1].tagName).toBe('Tag');
      expect(customTags[2].tagName).toBe('Result');
    });

    test('TemplateInstanceタグを正しく抽出する', () => {
      // Arrange
      const content =
        '<TemplateInstance templateId="test" generatedAt="2024-01-01" />';
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toHaveLength(1);
      expect(customTags[0].tagName).toBe('TemplateInstance');
      expect(customTags[0].attributes).toEqual({
        templateId: 'test',
        generatedAt: '2024-01-01',
      });
    });
  });

  describe('自己終了タグの判定', () => {
    test('自己終了タグを正しく判定する', () => {
      // Arrange
      const content = '<Tag itemId="test" />';
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags[0].isSelfClosing).toBe(true);
    });

    test('非自己終了タグを正しく判定する', () => {
      // Arrange
      const content = '<Result>内容</Result>';
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags[0].isSelfClosing).toBe(false);
    });

    test('Templateブロックを正しく判定する', () => {
      // Arrange
      const content = '<Template id="test">内容</Template>';
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags[0].isSelfClosing).toBe(false);
    });
  });

  describe('行番号解決', () => {
    test('ブロックレベルタグの行番号を正確に取得する', () => {
      // Arrange
      const content = `行1

<Template id="test" />

行4`;
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags[0].line).toBe(3); // <Template>がある行（空行も含めて3行目）
    });

    test('インラインタグの行番号を親から推定する', () => {
      // Arrange
      const content = `行1

- [ ] 項目 <Tag itemId="test" />

行4`;
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags[0].line).toBe(3); // リスト項目の行番号
    });

    test('行番号が取得できない場合は-1を返す', () => {
      // 特定のトークン構造で行番号情報がない場合のテスト
      const content = '<Tag itemId="test" />';
      const tokens = tokenizer.tokenize(content);

      // 人工的にmapプロパティを削除してテスト
      tokens.forEach((token) => {
        if ('map' in token) {
          (token as any).map = undefined;
        }
        if (token.children) {
          token.children.forEach((child) => {
            if ('map' in child) {
              (child as any).map = undefined;
            }
          });
        }
      });

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      if (customTags.length > 0) {
        expect(customTags[0].line).toBe(-1);
      }
    });
  });

  describe('再帰的な探索', () => {
    test('ネストしたトークン内のタグを正しく抽出する', () => {
      // Arrange
      const content = `
- [ ] 項目1 <Tag itemId="T001" />
  - [ ] サブ項目 <Tag itemId="T002" />
- [ ] 項目2 <Tag itemId="T003" />
`;
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toHaveLength(3);
      expect(customTags.map((tag) => tag.attributes.itemId)).toEqual([
        'T001',
        'T002',
        'T003',
      ]);
    });

    test('複雑にネストした構造からタグを抽出する', () => {
      // Arrange
      const content = MarkdownSamples.complex;
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags.length).toBeGreaterThan(5); // 複数のタグが存在することを確認

      const templateTags = customTags.filter(
        (tag) => tag.tagName === 'Template'
      );
      const itemTags = customTags.filter((tag) => tag.tagName === 'Tag');
      const resultTags = customTags.filter((tag) => tag.tagName === 'Result');

      expect(templateTags.length).toBeGreaterThan(0);
      expect(itemTags.length).toBeGreaterThan(0);
      expect(resultTags.length).toBeGreaterThan(0);
    });
  });

  describe('エッジケースと例外処理', () => {
    test('空のトークン配列を安全に処理する', () => {
      // Arrange
      const tokens: any[] = [];

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toEqual([]);
    });

    test('カスタムタグを含まないトークンを処理する', () => {
      // Arrange
      const content = MarkdownSamples.noCustomTags;
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toEqual([]);
    });

    test('不正なタグ名を無視する', () => {
      // Arrange
      const content = '<InvalidTag itemId="test" /> <Tag itemId="valid" />';
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toHaveLength(1);
      expect(customTags[0].tagName).toBe('Tag');
    });

    test('不完全なカスタムタグを安全に処理する', () => {
      // Arrange
      const content = MarkdownSamples.invalid.incompleteTag;
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toEqual([]); // 不完全なタグは抽出されない
    });
  });

  describe('属性の統合テスト', () => {
    test('複雑な属性を持つタグを正しく処理する', () => {
      // Arrange
      const content =
        '<Tag itemId="complex-123" isResultRequired description="複雑なテスト" src="./file.md" />';
      const tokens = tokenizer.tokenize(content);

      // Act
      const customTags = parseCustomTags(tokens);

      // Assert
      expect(customTags).toHaveLength(1);
      expect(customTags[0].attributes).toEqual({
        itemId: 'complex-123',
        isResultRequired: true,
        description: '複雑なテスト',
        src: './file.md',
      });
    });
  });
});
