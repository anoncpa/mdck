// カスタムディレクティブプロセッサー
// remark-directiveでは同一行内のディレクティブが解析されないため、
// mdck仕様に対応するためのカスタム処理を実装

import type { Root, Text, Paragraph } from 'mdast';
import { visit } from 'unist-util-visit';
import type { Directive } from '../shared/types';

/**
 * テキストノード内のインラインディレクティブを解析して分離する
 * 例: "タスク ::tag{id="test"}" -> ["タスク ", {type: "leafDirective", ...}]
 */
export function processInlineDirectives(ast: Root): Root {
  visit(ast, 'text', (node: Text, index, parent) => {
    if (!parent || !Array.isArray(parent.children) || index === undefined) {
      return;
    }

    const text = node.value;
    const directiveMatches = findInlineDirectives(text);
    
    if (directiveMatches.length === 0) {
      return; // ディレクティブが見つからない場合はそのまま
    }

    // テキストを分割してディレクティブノードを挿入
    const newNodes = splitTextWithDirectives(text, directiveMatches, node.position);
    
    // 元のテキストノードを新しいノードで置換
    parent.children.splice(index, 1, ...newNodes);
  });

  return ast;
}

/**
 * テキスト内のインラインディレクティブを検索
 */
function findInlineDirectives(text: string): DirectiveMatch[] {
  const matches: DirectiveMatch[] = [];
  
  // ::directiveName{attributes} パターンを検索
  const directiveRegex = /::([\w-]+)\{([^}]*)\}/g;
  let match;
  
  while ((match = directiveRegex.exec(text)) !== null) {
    const [fullMatch, name, attributesStr] = match;
    const attributes = parseAttributes(attributesStr);
    
    matches.push({
      start: match.index,
      end: match.index + fullMatch.length,
      name,
      attributes,
      fullMatch
    });
  }
  
  return matches;
}

/**
 * 属性文字列を解析してオブジェクトに変換
 * 例: 'id="test" mandatory=true' -> {id: "test", mandatory: "true"}
 */
function parseAttributes(attributesStr: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  
  // key="value" または key=value パターンを検索
  const attrRegex = /([\w-]+)=(?:"([^"]*)"|([^\s}]+))/g;
  let match;
  
  while ((match = attrRegex.exec(attributesStr)) !== null) {
    const [, key, quotedValue, unquotedValue] = match;
    attributes[key] = quotedValue || unquotedValue;
  }
  
  return attributes;
}

/**
 * テキストをディレクティブで分割して新しいノード配列を生成
 */
function splitTextWithDirectives(
  text: string, 
  matches: DirectiveMatch[], 
  originalPosition?: any
): Array<Text | Directive> {
  const nodes: Array<Text | Directive> = [];
  let lastEnd = 0;
  
  for (const match of matches) {
    // ディレクティブ前のテキスト
    if (match.start > lastEnd) {
      const beforeText = text.slice(lastEnd, match.start);
      if (beforeText) {
        nodes.push({
          type: 'text',
          value: beforeText,
          position: originalPosition // 簡略化：実際は位置を計算すべき
        });
      }
    }
    
    // ディレクティブノード
    nodes.push({
      type: 'leafDirective',
      name: match.name,
      attributes: match.attributes,
      children: [],
      position: originalPosition // 簡略化：実際は位置を計算すべき
    } as Directive);
    
    lastEnd = match.end;
  }
  
  // 最後のディレクティブ後のテキスト
  if (lastEnd < text.length) {
    const afterText = text.slice(lastEnd);
    if (afterText) {
      nodes.push({
        type: 'text',
        value: afterText,
        position: originalPosition
      });
    }
  }
  
  return nodes;
}

interface DirectiveMatch {
  start: number;
  end: number;
  name: string;
  attributes: Record<string, string>;
  fullMatch: string;
}