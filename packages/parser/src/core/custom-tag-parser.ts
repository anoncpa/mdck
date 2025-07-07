// packages/parser/src/core/custom-tag-parser.ts
import type Token from 'markdown-it/lib/token.mjs';
import { parseTagAttributes } from './attribute-parser';
import { CustomTag } from '../shared/types';

// mdckが関心を持つカスタムタグのリスト
const RECOGNIZED_TAGS = /<(Template|Tag|Result|TemplateInstance)\b/i;

/**
 * トークンの行番号を解決する。
 * インライントークンで直接的な行番号が取得できない場合、
 * 親トークンの情報を使用して推定する。
 *
 * @param token - 行番号を取得したいトークン
 * @param parentToken - 親トークン（存在する場合）
 * @returns 1-based行番号、または推定できない場合は-1
 */
function resolveLineNumber(token: Token, parentToken?: Token): number {
  // 直接的な行番号が存在する場合（ブロックレベルトークン）
  if (token.map && token.map[0] !== null) {
    return token.map[0] + 1; // 0-basedから1-basedに変換
  }

  // 親トークンから行番号を推定（インラインレベルトークン）
  if (parentToken && parentToken.map && parentToken.map[0] !== null) {
    return parentToken.map[0] + 1; // 親トークンの開始行を使用
  }

  // どちらも取得できない場合は-1を返す
  return -1;
}

/**
 * トークン配列内でコンテキスト（親子関係）を保持しながら
 * カスタムタグを検索する内部インターフェース。
 */
interface TokenContext {
  token: Token;
  parentToken?: Token;
  depth: number;
}

/**
 * markdown-itのトークン列を走査し、mdckのカスタムタグを抽出する。
 * 親トークンの情報を活用して、より正確な行番号を提供する。
 * @param tokens - Tokenizerによって生成されたトークンの配列。
 * @returns 抽出されたCustomTagオブジェクトの配列。
 */
export function parseCustomTags(tokens: Token[]): CustomTag[] {
  const customTags: CustomTag[] = [];

  /**
   * トークンツリーを再帰的に探索し、親トークンの情報を保持する内部関数。
   * 親子関係を明示的に管理することで、正確な行番号解決を実現する。
   */
  function findTagsRecursively(tokenArray: Token[], parentToken?: Token): void {
    for (const token of tokenArray) {
      // カスタムタグはhtml_inlineまたはhtml_blockとして認識される
      if (
        (token.type === 'html_inline' || token.type === 'html_block') &&
        RECOGNIZED_TAGS.test(token.content)
      ) {
        const match = token.content.match(RECOGNIZED_TAGS);
        if (match) {
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

          // 新しい行番号解決ロジックを使用
          const line = resolveLineNumber(token, parentToken);

          customTags.push({
            tagName,
            attributes: parseTagAttributes(token.content),
            isSelfClosing: token.content.trim().endsWith('/>'),
            line,
          });
        }
      }

      // 子トークンが存在する場合、現在のトークンを親として再帰的に探索
      if (token.children) {
        findTagsRecursively(token.children, token);
      }
    }
  }

  findTagsRecursively(tokens);
  return customTags;
}
