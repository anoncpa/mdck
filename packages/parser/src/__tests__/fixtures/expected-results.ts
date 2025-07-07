// packages/parser/src/__tests__/fixtures/expected-results.ts
import { CustomTag } from '../../shared/types';

/**
 * 期待される解析結果
 * テストの予期される出力を型安全に定義
 */

export const ExpectedResults = {
  basic: {
    tokenCount: 15, // 概算値（実際の値は動的に決定）
    customTags: [
      {
        tagName: 'Template' as const,
        attributes: { id: 'basic-template', src: './template.md' },
        isSelfClosing: true,
        line: 4,
      },
      {
        tagName: 'Tag' as const,
        attributes: { itemId: 'T001' },
        isSelfClosing: true,
        line: 6,
      },
      {
        tagName: 'Tag' as const,
        attributes: { itemId: 'T002', isResultRequired: true },
        isSelfClosing: true,
        line: 7,
      },
      {
        tagName: 'Result' as const,
        attributes: {},
        isSelfClosing: false,
        line: 8,
      },
    ] as CustomTag[],
  },

  noCustomTags: {
    customTags: [] as CustomTag[],
  },

  attributeTests: {
    simpleAttribute: { itemId: 'test' },
    multipleAttributes: {
      itemId: 'test',
      src: './file.md',
      description: 'テスト用',
    },
    booleanAttribute: { itemId: 'test', isResultRequired: true },
    mixedAttributes: {
      itemId: 'test',
      isResultRequired: true,
      src: './file.md',
    },
    emptyAttributes: {},
    specialChars: {
      itemId: 'test-123_$%',
      description: '特殊文字：<>&"\'',
    },
  },
} as const;
