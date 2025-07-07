// packages/parser/src/core/directive-extractor.ts
import { visit } from 'unist-util-visit';
import { Root, Directive } from 'mdast';
import { MdckDirective, MdckDirectiveName } from '../shared/types';

/**
 * 指定されたノードがmdckが対象とするディレクティブ名を持つか判定する。
 * @param name - ディレクティブ名
 * @returns 対象であればtrue、さもなくばfalse
 */
function isMdckDirectiveName(name: string): name is MdckDirectiveName {
  return ['template', 'tag', 'result'].includes(name);
}

/**
 * remarkが生成したAST (mdast) を走査し、mdckに関連するディレクティブ情報を抽出する。
 * @param ast - 解析対象のAST (Rootノード)
 * @returns 抽出されたmdckディレクティブの配列
 */
export function extractMdckDirectives(ast: Root): MdckDirective[] {
  const directives: MdckDirective[] = [];

  // visitユーティリティを使ってASTツリーを安全に走査
  visit(ast, 'directive', (node: Directive) => {
    // 'template', 'tag', 'result' のいずれかの名前を持つディレクティブのみを対象とする
    if (isMdckDirectiveName(node.name)) {
      directives.push({
        name: node.name,
        type: node.type,
        // 属性が存在しない場合は空オブジェクトを割り当てる
        attributes: node.attributes ?? {},
        // 子ノードはcontainerDirectiveの場合のみ存在
        children: 'children' in node ? node.children : [],
        // 位置情報から開始行を取得 (1-based)。なければ-1
        line: node.position?.start.line ?? -1,
      });
    }
  });

  return directives;
}
