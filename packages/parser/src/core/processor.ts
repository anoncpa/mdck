// packages/parser/src/core/processor.ts
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { processInlineDirectives } from './custom-directive-processor';
import type { Root } from '../shared/types';

/**
 * remarkとremark-directiveを使用するプロセッサーを生成する。
 * このプロセッサーはMarkdown文字列をAST (mdast) に変換する責務を持つ。
 * @returns unifiedのプロセッサーインスタンス
 */
/**
 * カスタムディレクティブ処理プラグイン
 */
function customDirectivePlugin() {
  return (tree: Root) => {
    return processInlineDirectives(tree);
  };
}

function createProcessor() {
  return unified()
    .use(remarkParse, {
      // GFMのタスクリスト記法を有効化
      gfm: true
    })
    .use(remarkDirective)
    .use(customDirectivePlugin)
    .use(remarkStringify, {
      bullet: '-',
      listItemIndent: 'one',
      emphasis: '*',
      strong: '*',
      fence: '`',
      fences: true,
      incrementListMarker: false,
      // チェックボックスのエスケープを無効化
      handlers: {
        text(node: any) {
          // チェックボックス記法のエスケープを防ぐ
          return node.value.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
        }
      }
    });
}

/**
 * MarkdownコンテンツをASTに変換するためのプロセッサー。
 * インスタンスはシングルトンとして保持し、不要な再生成を避ける。
 */
export const processor = createProcessor();
