// packages/parser/src/core/processor.ts
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

/**
 * remarkとremark-directiveを使用するプロセッサーを生成する。
 * このプロセッサーはMarkdown文字列をAST (mdast) に変換する責務を持つ。
 * @returns unifiedのプロセッサーインスタンス
 */
function createProcessor() {
  return unified().use(remarkParse).use(remarkDirective).use(remarkStringify);
}

/**
 * MarkdownコンテンツをASTに変換するためのプロセッサー。
 * インスタンスはシングルトンとして保持し、不要な再生成を避ける。
 */
export const processor = createProcessor();
