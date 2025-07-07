// packages/parser/src/__tests__/unit/attribute-parser.test.ts
import { describe, test, expect } from 'vitest';
import { parseTagAttributes } from '../../core/attribute-parser';
import { ExpectedResults } from '../fixtures/expected-results';

describe('parseTagAttributes', () => {
  describe('基本的な属性解析', () => {
    test('単一の文字列属性を正しく解析する', () => {
      // Arrange
      const tagContent = '<Tag itemId="test" />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual(ExpectedResults.attributeTests.simpleAttribute);
    });

    test('複数の文字列属性を正しく解析する', () => {
      // Arrange
      const tagContent =
        '<Tag itemId="test" src="./file.md" description="テスト用" />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual(ExpectedResults.attributeTests.multipleAttributes);
    });

    test('ブール属性を正しく解析する', () => {
      // Arrange
      const tagContent = '<Tag itemId="test" isResultRequired />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual(ExpectedResults.attributeTests.booleanAttribute);
    });

    test('文字列属性とブール属性を混在して解析する', () => {
      // Arrange
      const tagContent =
        '<Tag itemId="test" isResultRequired src="./file.md" />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual(ExpectedResults.attributeTests.mixedAttributes);
    });
  });

  describe('属性なしケース', () => {
    test('属性のないタグを正しく処理する', () => {
      // Arrange
      const tagContent = '<Tag />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual(ExpectedResults.attributeTests.emptyAttributes);
    });

    test('属性部分のないタグを正しく処理する', () => {
      // Arrange
      const tagContent = '<Tag>';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual(ExpectedResults.attributeTests.emptyAttributes);
    });
  });

  describe('特殊文字とエッジケース', () => {
    test('特殊文字を含む属性値を正しく解析する', () => {
      // Arrange
      const tagContent = `<Tag itemId="test-123_$%" description="特殊文字：<>&\"'" />`;

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual(ExpectedResults.attributeTests.specialChars);
    });

    test('シングルクォートの属性値を正しく解析する', () => {
      // Arrange
      const tagContent = `<Tag itemId='single-quote' description='値' />`;

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual({
        itemId: 'single-quote',
        description: '値',
      });
    });

    test('空の属性値を正しく解析する', () => {
      // Arrange
      const tagContent = '<Tag itemId="" description="" />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual({
        itemId: '',
        description: '',
      });
    });

    test('不正な属性形式を安全に処理する', () => {
      // Arrange
      const tagContent = '<Tag itemId= invalid="unclosed />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual({}); // エラーではなく空のオブジェクトを返す
    });
  });

  describe('異なるタグタイプ', () => {
    test('Templateタグの属性を正しく解析する', () => {
      // Arrange
      const tagContent = '<Template id="template1" src="./template.md" />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual({
        id: 'template1',
        src: './template.md',
      });
    });

    test('Resultタグ（属性なし）を正しく処理する', () => {
      // Arrange
      const tagContent = '<Result>';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('境界値テスト', () => {
    test('非常に長い属性値を処理する', () => {
      // Arrange
      const longValue = 'a'.repeat(1000);
      const tagContent = `<Tag itemId="${longValue}" />`;

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual({
        itemId: longValue,
      });
    });

    test('多数の属性を持つタグを処理する', () => {
      // Arrange
      const tagContent = '<Tag a="1" b="2" c="3" d="4" e="5" f g h i j />';

      // Act
      const result = parseTagAttributes(tagContent);

      // Assert
      expect(result).toEqual({
        a: '1',
        b: '2',
        c: '3',
        d: '4',
        e: '5',
        f: true,
        g: true,
        h: true,
        i: true,
        j: true,
      });
    });
  });
});
