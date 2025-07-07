// packages/parser/src/core/tag-attribute-parser.ts
import { CustomTagAttributes } from '../shared/types';

/**
 * MDCKタグの属性を解析する専用パーサー。
 * シンプルな正規表現ベースで、MDCKタグ形式に特化した実装。
 *
 * 対応する属性形式:
 * - 値ありの属性: itemId="C1", src="./file.md"
 * - ブール属性: isResultRequired (値なし = true)
 */

/**
 * MDCKカスタムタグから属性を抽出する。
 * 例: '<Tag itemId="C1" isResultRequired />' -> { itemId: "C1", isResultRequired: true }
 *
 * @param tagContent - 解析対象のタグ文字列
 * @returns 抽出された属性のオブジェクト
 */
export function parseTagAttributes(tagContent: string): CustomTagAttributes {
  const attributes: CustomTagAttributes = {};

  // タグ内容から属性部分のみを抽出 (< と > または /> の間)
  const attributeSection = extractAttributeSection(tagContent);
  if (!attributeSection) {
    return attributes;
  }

 // 不正な属性形式を早期に検出（閉じられていない引用符など）
 if (hasInvalidAttributeFormat(attributeSection)) {
   return attributes;
 }

  // 値ありの属性を抽出: name="value" または name='value'
  const valueAttributes = extractValueAttributes(attributeSection);
  Object.assign(attributes, valueAttributes);

  // ブール属性を抽出: 単独で存在する属性名
  const booleanAttributes = extractBooleanAttributes(
    attributeSection,
    Object.keys(valueAttributes)
  );
  Object.assign(attributes, booleanAttributes);

  return attributes;
}

/**
 * タグ文字列から属性部分を抽出する。
 * 例: '<Tag itemId="C1" />' -> 'itemId="C1" '
 */
function extractAttributeSection(tagContent: string): string | null {
  // タグ名の後の部分を抽出 (<TagName 以降、> または /> まで)
  const match = tagContent.match(/<[a-zA-Z]+\s+([^>]*?)(?:\s*\/?>)/);
  return match ? match[1] : null;
}

 /**
  * 不正な属性形式を検出する。
  * 閉じられていない引用符、不正な等号の使用などを検出。
  */
 function hasInvalidAttributeFormat(attributeSection: string): boolean {
   // 閉じられていない引用符を検出
   const unclosedQuotes = /=\s*["'][^"'>]*$/.test(attributeSection);

   // 値なしの等号を検出（例: itemId= ）
   const emptyEquals = /[a-zA-Z][a-zA-Z0-9]*\s*=\s*(?!["\'])/.test(attributeSection);

   return unclosedQuotes || emptyEquals;
 }

/**
 * 値ありの属性を抽出する。
 * 例: 'itemId="C1" src="./file.md"' -> { itemId: "C1", src: "./file.md" }
 */
function extractValueAttributes(
  attributeSection: string
): Record<string, string> {
  const attributes: Record<string, string> = {};

 // name="value" または name='value' 形式の属性を抽出
 // より厳密な正規表現で、適切に閉じられた引用符のみをマッチ
 const valuePattern = /([a-zA-Z][a-zA-Z0-9]*)\s*=\s*"([^"]*)"|([a-zA-Z][a-zA-Z0-9]*)\s*=\s*'([^']*)'/g;
  let match;

  while ((match = valuePattern.exec(attributeSection)) !== null) {
   // ダブルクォートとシングルクォートの両方に対応
   if (match[1] && match[2] !== undefined) {
     // ダブルクォート形式: name="value"
     attributes[match[1]] = match[2];
   } else if (match[3] && match[4] !== undefined) {
     // シングルクォート形式: name='value'
     attributes[match[3]] = match[4];
   }
  }

  return attributes;
}

/**
 * ブール属性を抽出する。
 * すでに抽出された値ありの属性以外で、単独で存在する属性名を探す。
 * 例: 'itemId="C1" isResultRequired' -> { isResultRequired: true }
 */
function extractBooleanAttributes(
  attributeSection: string,
  excludeNames: string[]
): Record<string, boolean> {
  const attributes: Record<string, boolean> = {};

  // 値ありの属性を除去した文字列を作成
  let cleanSection = attributeSection;
  for (const name of excludeNames) {
   // ダブルクォートとシングルクォートの両方を考慮した除去
   const doubleQuotePattern = new RegExp(`${name}\\s*=\\s*"[^"]*"`, 'g');
   const singleQuotePattern = new RegExp(`${name}\\s*=\\s*'[^']*'`, 'g');
   cleanSection = cleanSection.replace(doubleQuotePattern, '');
   cleanSection = cleanSection.replace(singleQuotePattern, '');
  }

  // 残った単語（英数字で始まる識別子）をブール属性として抽出
  const booleanPattern = /\b([a-zA-Z][a-zA-Z0-9]*)\b/g;
  let match;

  while ((match = booleanPattern.exec(cleanSection)) !== null) {
    const [, name] = match;
    // 予約語やタグ名は除外
    if (!isReservedWord(name)) {
      attributes[name] = true;
    }
  }

  return attributes;
}

/**
 * 予約語かどうかを判定する。
 * タグ名や一般的なHTML属性は除外する。
 */
function isReservedWord(word: string): boolean {
  const reserved = ['Template', 'Tag', 'Result', 'TemplateInstance'];
  return reserved.includes(word);
}
