// @/packages/parser/src/core/custom-tag-parser.ts
import type { Token } from '../shared/types';
import { CustomTag } from '../shared/types';
import { parseTagAttributes } from './tag-attribute-parser';

/**
 * mdck が認識するタグを 1 トークン中から複数抽出するためのグローバル正規表現
 * – 開始タグ／自己終了タグのみを対象（閉じタグ </...> は除外）
 */
const TAG_PATTERN =
  /<(?!(?:\/))(TemplateInstance|Template|Tag|Result)\b[^>]*?\/?>/g;

/**
 * トークン先頭行 (1-based) とトークン内オフセット行数から
 * 実際の行番号 (1-based) を導出する。
 */
function resolveLineNumber(
  token: Token,
  parentToken: Token | undefined,
  offsetLines: number
): number {
  if (token.map && token.map[0] !== null) {
    return token.map[0] + 1 + offsetLines;
  }
  if (parentToken && parentToken.map && parentToken.map[0] !== null) {
    return parentToken.map[0] + 1 + offsetLines;
  }
  return -1;
}

/**
 * markdown-it のトークン列を走査し、mdck カスタムタグを抽出する。
 * 1 トークン内に複数タグが存在するケースにも対応。
 */
export function parseCustomTags(tokens: Token[]): CustomTag[] {
  const customTags: CustomTag[] = [];

  function traverse(tokenArray: Token[], parentToken?: Token): void {
    for (const token of tokenArray) {
      if (token.type === 'html_inline' || token.type === 'html_block') {
        const content = token.content;

        // グローバル RegExp は lastIndex を共有するため、
        // トークン毎に必ずリセットして取りこぼしを防止
        TAG_PATTERN.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = TAG_PATTERN.exec(content)) !== null) {
          const [matchedText, tagName] = match;
          const offsetLines =
            content.slice(0, match.index).split('\n').length - 1;

          customTags.push({
            tagName: tagName as
              | 'Template'
              | 'Tag'
              | 'Result'
              | 'TemplateInstance',
            attributes: parseTagAttributes(matchedText),
            isSelfClosing: matchedText.trim().endsWith('/>'),
            line: resolveLineNumber(token, parentToken, offsetLines),
          });
        }
      }

      // 子トークンを再帰的に探索
      if (token.children) {
        traverse(token.children, token);
      }
    }
  }

  traverse(tokens);
  return customTags;
}
