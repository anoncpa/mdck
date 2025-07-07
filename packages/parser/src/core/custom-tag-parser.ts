// packages/parser/src/core/custom-tag-parser.ts
import type Token from 'markdown-it/lib/token.mjs';
 import { CustomTag } from '../shared/types';
 import { parseAttributes } from '../shared/utils';

 // mdckが関心を持つカスタムタグのリスト
 const RECOGNIZED_TAGS = /<(Template|Tag|Result|TemplateInstance)\b/i;

 /**
  * markdown-itのトークン列を走査し、mdckのカスタムタグを抽出する。
  * @param tokens - Tokenizerによって生成されたトークンの配列。
  * @returns 抽出されたCustomTagオブジェクトの配列。
  */
 export function parseCustomTags(tokens: Token[]): CustomTag[] {
   const customTags: CustomTag[] = [];

  // トークンツリーを再帰的に探索する内部関数
  function findTagsRecursively(tokenArray: Token[]) {
    for (const token of tokenArray) {
      // カスタムタグはhtml_inlineまたはhtml_blockとして認識される
      if (
        (token.type === 'html_inline' || token.type === 'html_block') &&
        RECOGNIZED_TAGS.test(token.content)
      ) {
        const match = token.content.match(RECOGNIZED_TAGS);
        if (match) {
          // `map`プロパティはトークンのソース行番号を保持する
          // トップレベルのブロックトークンにしか存在しないため、ない場合も考慮する
          const line = token.map ? token.map[0] + 1 : -1;

          const tagName = match[1];
          // タグ名の厳密な型チェック
          if (
            tagName !== 'Template' &&
            tagName !== 'Tag' &&
            tagName !== 'Result' &&
            tagName !== 'TemplateInstance'
          ) {
            continue;
          }

          customTags.push({
            tagName,
            attributes: parseAttributes(token.content),
            isSelfClosing: token.content.trim().endsWith('/>'),
            line, // ネストされたトークンでは行番号が取得できない場合がある
          });
         }
       }

      // 子トークンが存在する場合、再帰的に探索する
      if (token.children) {
        findTagsRecursively(token.children);
      }
     }
   }

  findTagsRecursively(tokens);
   return customTags;
 }
