// packages/parser/src/shared/utils.ts
 import { XMLParser } from 'fast-xml-parser';
 import { CustomTagAttributes } from './types';

 // fast-xml-parserを一元的に設定し、利用するためのインスタンス
 const attributeParser = new XMLParser({
   ignoreAttributes: false,
   attributeNamePrefix: '',
  allowBooleanAttributes: true, // `isResultRequired`のような属性をtrueとしてパース
   trimValues: true,
 });

 /**
  * HTML/XMLタグのような文字列から属性を抽出する。
  * 例: '<Tag itemId="C1" isResultRequired />' -> { itemId: "C1", isResultRequired: true }
  * @param tagContent - パース対象のタグ文字列。
  * @returns 抽出された属性のオブジェクト。
  */
 export function parseAttributes(tagContent: string): CustomTagAttributes {
   try {
    // タグ文字列全体を直接パースする
    const parsed = attributeParser.parse(tagContent);
    // 最初のキーがタグ名になる
    const tagName = Object.keys(parsed)[0];
    if (!tagName) return {};

    // 属性は'@'プロパティに格納される
    return parsed[tagName]?.['@'] ?? {};
   } catch (error) {
     // パースに失敗した場合は空のオブジェクトを返し、警告を出す
     console.warn('Failed to parse tag attributes:', tagContent, error);
     return {};
   }
 }
