// packages/parser/src/__tests__/integration/mdck-parser.test.ts
import { describe, expect, test } from 'vitest';
import { MdckParser } from '../../index';
import { ExpectedResults } from '../fixtures/expected-results';
import { MarkdownSamples } from '../fixtures/markdown-samples';

describe('MdckParser Integration Tests', () => {
  // Arrange: 共通のパーサーインスタンス
  const parser = new MdckParser();

  describe('基本的なワークフロー', () => {
    test('空のコンテンツを正しく処理する', () => {
      // Arrange
      const content = MarkdownSamples.empty;

      // Act
      const result = parser.parse(content);

      // Assert
      expect(result.tokens).toEqual([]);
      expect(result.customTags).toEqual([]);
    });

    test('基本的なMarkdownコンテンツを正しく解析する', () => {
      // Arrange
      const content = MarkdownSamples.basic;

      // Act
      const result = parser.parse(content);

      // Assert
      expect(result.tokens).toHaveLength(ExpectedResults.basic.tokenCount);
      expect(result.customTags).toHaveLength(4);

      // 各タグの基本的な構造を検証
      const templateTag = result.customTags.find(
        (tag) => tag.tagName === 'Template'
      );
      const tagTags = result.customTags.filter((tag) => tag.tagName === 'Tag');
      const resultTag = result.customTags.find(
        (tag) => tag.tagName === 'Result'
      );

      expect(templateTag).toBeDefined();
      expect(templateTag?.attributes).toEqual({
        id: 'basic-template',
        src: './template.md',
      });
      expect(tagTags).toHaveLength(2);
      expect(resultTag).toBeDefined();
    });

    test('カスタムタグのないMarkdownを正しく処理する', () => {
      // Arrange
      const content = MarkdownSamples.noCustomTags;

      // Act
      const result = parser.parse(content);

      // Assert
      expect(result.tokens.length).toBeGreaterThan(0); // 通常のMarkdownとしてトークン化される
      expect(result.customTags).toEqual(
        ExpectedResults.noCustomTags.customTags
      );
    });
  });

  describe('複雑な構造の処理', () => {
    test('複雑にネストしたコンテンツを正しく解析する', () => {
      // Arrange
      const content = MarkdownSamples.complex;

      // Act
      const result = parser.parse(content);

      // Assert
      expect(result.customTags.length).toBeGreaterThan(5);

      // タグタイプ別の検証
      const templateTags = result.customTags.filter(
        (tag) => tag.tagName === 'Template'
      );
      const itemTags = result.customTags.filter((tag) => tag.tagName === 'Tag');
      const resultTags = result.customTags.filter(
        (tag) => tag.tagName === 'Result'
      );

      expect(templateTags.length).toBeGreaterThanOrEqual(3); // parent, child1, child2
      expect(itemTags.length).toBeGreaterThanOrEqual(3); // C001, C002, N001
      expect(resultTags.length).toBeGreaterThanOrEqual(2); // 複数行の結果、空の結果

      // 属性の詳細検証
      const requiredTags = itemTags.filter(
        (tag) => tag.attributes.isResultRequired
      );
      expect(requiredTags.length).toBeGreaterThan(0);
    });

    test('異なるタグタイプが混在するコンテンツを処理する', () => {
      // Arrange
      const content = `
<Template id="mixed">
  <TemplateInstance templateId="generated" generatedAt="2024-01-01" />
    <Result>結果</Result>
</Template>
`;

      // Act
      const result = parser.parse(content);

      // Assert
      const tagTypes = result.customTags.map((tag) => tag.tagName);
      expect(tagTypes).toContain('Template');
      expect(tagTypes).toContain('TemplateInstance');
      expect(tagTypes).toContain('Tag');
      expect(tagTypes).toContain('Result');
    });
  });

  describe('エッジケースの統合テスト', () => {
    test('特殊文字を含むコンテンツを安全に処理する', () => {
      // Arrange
      const content = MarkdownSamples.edgeCases.specialChars;

      // Act
      const result = parser.parse(content);

      // Assert
      expect(result.customTags).toHaveLength(1);
      expect(result.customTags[0].attributes.itemId).toBe('test-123_$%');
      expect(result.customTags[0].attributes.description).toBe(
        '特殊文字：<>&"\''
      );
    });

    test('空の結果ブロックを正しく処理する', () => {
      // Arrange
      const content = MarkdownSamples.edgeCases.emptyResult;

      // Act
      const result = parser.parse(content);

      // Assert
      const tagTag = result.customTags.find((tag) => tag.tagName === 'Tag');
      const resultTag = result.customTags.find(
        (tag) => tag.tagName === 'Result'
      );

      expect(tagTag?.attributes.isResultRequired).toBe(true);
      expect(resultTag?.attributes).toEqual({});
    });

    test('HTMLを含むコンテンツを正しく処理する', () => {
      // Arrange
      const content = MarkdownSamples.edgeCases.nestedHtml;

      // Act
      const result = parser.parse(content);

      // Assert
      const customTags = result.customTags;
      expect(customTags.length).toBeGreaterThanOrEqual(2); // Tag と Result

      // divタグは認識されないタグなので、カスタムタグには含まれない
      const recognizedTagNames = [
        'Template',
        'Tag',
        'Result',
        'TemplateInstance',
      ] as const;
      const allTagsAreRecognized = customTags.every((tag) =>
        recognizedTagNames.includes(tag.tagName)
      );
      expect(allTagsAreRecognized).toBe(true);
    });

    test('複数行にまたがるタグを正しく処理する', () => {
      // Arrange
      const content = MarkdownSamples.edgeCases.multiLine;

      // Act
      const result = parser.parse(content);

      // Assert
      const customTags = result.customTags;
      expect(customTags.length).toBeGreaterThanOrEqual(2); // Tag と Result

      // 行番号が適切に設定されていることを確認
      customTags.forEach((tag) => {
        expect(tag.line).toBeGreaterThan(0);
      });
    });
  });

  describe('不正な入力に対するロバスト性', () => {
    test('不完全なタグを含むコンテンツを安全に処理する', () => {
      // Arrange
      const content = MarkdownSamples.invalid.incompleteTag;

      // Act & Assert: 例外が発生しないことを確認
      expect(() => parser.parse(content)).not.toThrow();

      const result = parser.parse(content);
      expect(result.tokens).toBeDefined();
      expect(result.customTags).toBeDefined();
    });

    test('閉じられていないTemplateタグを安全に処理する', () => {
      // Arrange
      const content = MarkdownSamples.invalid.unclosedTemplate;

      // Act & Assert: 例外が発生しないことを確認
      expect(() => parser.parse(content)).not.toThrow();

      const result = parser.parse(content);
      expect(result.tokens).toBeDefined();
      expect(result.customTags).toBeDefined();
    });

    test('非常に大きなコンテンツを処理する', () => {
      // Arrange: 大量のコンテンツを生成
      const largeContent = Array(1000)
        .fill(0)
        .map((_, i) => `- [ ] 項目${i} <Tag itemId="T${i}" />`)
        .join('\n');

      // Act
      const result = parser.parse(largeContent);

      // Assert
      expect(result.customTags).toHaveLength(1000);
      expect(result.customTags[0].attributes.itemId).toBe('T0');
      expect(result.customTags[999].attributes.itemId).toBe('T999');
    });
  });

  describe('型安全性の検証', () => {
    test('ParseResultの型構造が正しい', () => {
      // Arrange
      const content = MarkdownSamples.basic;

      // Act
      const result = parser.parse(content);

      // Assert: TypeScriptの型チェックで検証されるが、ランタイムでも確認
      expect(Array.isArray(result.tokens)).toBe(true);
      expect(Array.isArray(result.customTags)).toBe(true);

      result.customTags.forEach((tag) => {
        expect(typeof tag.tagName).toBe('string');
        expect(['Template', 'Tag', 'Result', 'TemplateInstance']).toContain(
          tag.tagName
        );
        expect(typeof tag.attributes).toBe('object');
        expect(typeof tag.isSelfClosing).toBe('boolean');
        expect(typeof tag.line).toBe('number');
      });
    });

    test('CustomTagの属性値の型が正しい', () => {
      // Arrange
      const content =
        '<Tag itemId="test" isResultRequired description="説明" />';

      // Act
      const result = parser.parse(content);

      // Assert
      const tag = result.customTags[0];
      expect(typeof tag.attributes.itemId).toBe('string');
      expect(typeof tag.attributes.isResultRequired).toBe('boolean');
      expect(typeof tag.attributes.description).toBe('string');
    });
  });

  describe('パフォーマンステスト', () => {
    test('処理時間が妥当な範囲内である', () => {
      // Arrange
      const moderateContent = Array(100)
        .fill(0)
        .map(
          (_, i) =>
            `<Template id="T${i}">
  <Result>結果${i}</Result>
</Template>`
        )
        .join('\n');

      // Act
      const startTime = performance.now();
      const result = parser.parse(moderateContent);
      const endTime = performance.now();

      // Assert
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // 1秒以内
      expect(result.customTags.length).toBe(300); // 100 Templates + 100 Tags + 100 Results
    });
  });
});
