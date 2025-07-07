// packages/parser/src/core/processor.ts
import { unified, Processor } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { Root } from 'mdast';

/**
 * remarkとremark-directiveを使用するプロセッサーを生成する。
 * このプロセッサーはMarkdown文字列をAST (mdast) に変換する責務を持つ。
 * @returns unifiedのプロセッサーインスタンス
 */
function createProcessor(): Processor<Root, Root, Root, string> {
  return unified().use(remarkParse).use(remarkDirective);
}

/**
 * MarkdownコンテンツをASTに変換するためのプロセッサー。
 * インスタンスはシングルトンとして保持し、不要な再生成を避ける。
 */
export const processor = createProcessor();
