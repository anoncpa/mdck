// packages/parser/src/core/directive-extractor.ts
import { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { Directive, MdckDirective, MdckDirectiveName } from '../shared/types';

/**
 * 指定されたノードがmdckが対象とするディレクティブ名を持つか判定する。
 * @param name - ディレクティブ名
 * @returns 対象であればtrue、さもなくばfalse
 */
function isMdckDirectiveName(name: string): name is MdckDirectiveName {
  return ['template', 'tag', 'result'].includes(name);
}

/**
 * ディレクティブの属性をフィルタリングし、null/undefinedを除去する。
 * @param attributes - 元の属性オブジェクト
 * @returns フィルタリングされた属性オブジェクト
 */
function filterAttributes(
  attributes: Record<string, string | null | undefined> | null | undefined
): Record<string, string> {
  if (!attributes) return {};

  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'string') {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * containerDirectiveの子ノードからテキスト内容を抽出する。
 * 段落、テキスト、コードブロックなどのコンテンツを文字列として結合する。
 * @param children - containerDirectiveの子ノード配列
 * @returns 抽出されたテキスト内容
 */
function extractContentFromChildren(children: any[]): string {
  const contentParts: string[] = [];

  function extractText(node: any): void {
    if (!node) return;

    switch (node.type) {
      case 'text':
        contentParts.push(node.value);
        break;
      case 'paragraph':
      case 'heading':
      case 'blockquote':
      case 'listItem':
        if (node.children) {
          node.children.forEach(extractText);
        }
        break;
      case 'code':
        contentParts.push(node.value);
        break;
      case 'emphasis':
      case 'strong':
      case 'link':
        if (node.children) {
          node.children.forEach(extractText);
        }
        break;
      default:
        // その他のノード型では、childrenがあれば再帰的に処理
        if (node.children) {
          node.children.forEach(extractText);
        }
    }
  }

  children.forEach(extractText);
  return contentParts.join('').trim();
}

/**
 * remarkが生成したAST (mdast) を走査し、mdckに関連するディレクティブ情報を抽出する。
 * @param ast - 解析対象のAST (Rootノード)
 * @returns 抽出されたmdckディレクティブの配列
 */
export function extractMdckDirectives(ast: Root): MdckDirective[] {
  const directives: MdckDirective[] = [];

  // visitユーティリティを使ってASTツリーを安全に走査
  visit(ast, (node) => {
    // 全てのディレクティブ型をチェック（textDirectiveを含む）
    if (
      node.type === 'containerDirective' ||
      node.type === 'leafDirective' ||
      node.type === 'textDirective' // インライン形式を追加
    ) {
      const directive = node as Directive;

      // 'template', 'tag', 'result' のいずれかの名前を持つディレクティブのみを対象とする
      if (isMdckDirectiveName(directive.name)) {
        // containerDirectiveの場合は子ノードからコンテンツを抽出
        const content =
          directive.type === 'containerDirective' && 'children' in directive
            ? extractContentFromChildren(directive.children)
            : '';

        directives.push({
          name: directive.name,
          type: directive.type,
          // 属性をフィルタリングしてnull/undefinedを除去
          attributes: filterAttributes(directive.attributes),
          // 子ノードはcontainerDirectiveの場合のみ存在
          children: 'children' in directive ? directive.children : [],
          // 抽出されたテキストコンテンツ
          content,
          // 位置情報から開始行を取得 (1-based)。なければ-1
          line: directive.position?.start.line ?? -1,
        });
      }
    }
  });

  return directives;
}
