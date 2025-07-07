# mdck Lint エラー仕様詳細（remark+remark-directive版）

## 主要な仕様変更点

- **命名規則**: template、tag、result など、小文字で始まる（remark-directiveの慣例に従う）
- **ディレクティブ構文**: `::template{}`, `::tag{}`, `::result{}` 記法を使用
- **属性記法**: `#id=value` 形式の識別子属性、`mandatory=true` 形式の真偽値属性

## Lint エラー項目一覧

| ルール ID | 重大度 | エラー内容                   | 自動修正 | カスタマイズ可 | 検出ロジック詳細                                                                      |
| :-------- | :----- | :--------------------------- | :------- | :------------- | :------------------------------------------------------------------------------------ |
| **M001**  | error  | template id 変更不可         | ×        | ×              | Git diff 比較により旧 template id と現在値を照合。staging 時に検出                    |
| **M002**  | error  | template id 重複定義         | ×        | ○              | 同じプロジェクト内で同じ `#id` 属性を持つ`::template{}`定義が複数存在                 |
| **M003**  | error  | template 未定義参照          | ×        | ○              | `::template{#id=x src=./file.md}`（参照）に対応する定義が見つからない                 |
| **M004**  | error  | 循環参照検出                 | ×        | ○              | template 展開時の id 履歴で同一 id の再出現を検出                                     |
| **M005**  | error  | 外部ファイル未発見           | ×        | ○              | `src`属性で指定されたファイルパスが存在しない                                         |
| **M006**  | error  | ディレクティブ名大文字化違反 | ○        | ○              | `::Template{}`, `::Tag{}`, `::Result{}`など大文字で始まるディレクティブ名の使用を検出 |
| **M007**  | error  | 属性名規則違反               | ○        | ○              | `id`属性の代わりに`#id`属性を強制                                                     |
| **M010**  | error  | tag id 重複                  | ×        | ○              | 展開後AST内で同一 `#id` 属性を持つ`::tag{}`が複数存在                                 |
| **M011**  | warn   | tag id 形式不正              | ×        | ○              | tag id が設定された形式でない場合（config.yml で形式指定可）                          |
| **M020**  | error  | 必須 result 欠落             | ○        | ○              | `mandatory=true`属性付き`::tag{}`の直後に`::result{}`ブロックが無い                   |
| **M021**  | warn   | result 文字数超過            | ×        | ○              | `::result{}`内のテキストが設定文字数（デフォルト 2000）を超過                         |
| **M022**  | warn   | result 内容空                | ○        | ○              | `::result{}`または`::result{}`内が空白のみ                                            |
| **M030**  | error  | チェックボックス記法不正     | ○        | ○              | リスト項目が`- [ ]`または`- [x]`で始まらない                                          |
| **M040**  | error  | template 構文エラー          | ×        | ×              | `::template{}`ディレクティブの開始・終了が不整合、または必須属性欠落                  |
| **M041**  | error  | tag 構文エラー               | ×        | ×              | `::tag{}`ディレクティブの構文が不正、または必須属性欠落                               |
| **M042**  | error  | result 構文エラー            | ×        | ×              | `::result{}`ディレクティブの開始・終了が不整合                                        |
| **M043**  | error  | ブロック系/自己終了系混合    | ○        | ○              | `::template{}`がブロック系でなく自己終了系で使われている場合                          |
| **M051**  | error  | template id 属性形式不正     | ×        | ○              | template id 属性値が空または不正文字を含む                                            |
| **M060**  | info   | カスタム項目検出             | ×        | ○              | `::tag{}`なしのチェックボックス項目を検出                                             |
| **M061**  | warn   | 未使用 template              | ×        | ○              | 定義されているが参照されていない template                                             |

## 詳細検出ロジック

### M001: template id 変更不可

```typescript

import type { Root } from 'mdast';
import type { Directive } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

function detectTemplateIdChange(
ast: Root,
filePath: string
): LintResult[] {
// 1. Gitから前回コミットの同ファイルを取得
const previousContent = execSync(`git show HEAD:${filePath}`).toString();
const previousAst = remark().use(remarkDirective).parse(previousContent);

// 2. 現在と過去のtemplate idを抽出
const currentIds = extractTemplateIds(ast);
const previousIds = extractTemplateIds(previousAst);

// 3. ID変更を検出
const changedIds = currentIds.filter((id) =>
previousIds.some(
(prev) => prev.position === id.position \&\& prev.value !== id.value
)
);

return changedIds.map((id) => ({
rule: "M001",
severity: "error",
message: `Template id "${id.oldValue}" cannot be changed to "${id.value}"`,
line: id.line,
}));
}

function extractTemplateIds(ast: Root): TemplateIdInfo[] {
const templateIds: TemplateIdInfo[] = [];

visit(ast, 'containerDirective', (node: Directive) => {
if (node.name === 'template' \&\& node.attributes) {
const templateId = extractTemplateId(node);
if (templateId) {
templateIds.push({
value: templateId,
line: node.position?.start.line || 0,
position: node.position?.start.line || 0,
});
}
}
});

return templateIds;
}

```

### M002-M005: template 定義・参照エラー

```typescript
function detectTemplateErrors(ast: Root, projectRoot: string): LintResult[] {
  const definitions = new Map<string, TemplateDefinition>();
  const references: TemplateReference[] = [];
  const errors: LintResult[] = [];

  // 1. 定義と参照を収集
  visit(ast, 'directive', (node: Directive) => {
    if (node.name === 'template') {
      const templateId = extractTemplateId(node);
      const isReference = node.type === 'leafDirective' || node.attributes?.src;

      if (isReference) {
        // 参照
        const src = node.attributes?.src;
        references.push({
          id: templateId,
          line: node.position?.start.line || 0,
          src,
        });
      } else {
        // 定義（containerDirective）
        if (definitions.has(templateId)) {
          errors.push({
            rule: 'M002',
            severity: 'error',
            message: `Duplicate template definition: "${templateId}"`,
            line: node.position?.start.line || 0,
          });
        }
        definitions.set(templateId, {
          id: templateId,
          line: node.position?.start.line || 0,
          ast: {
            type: 'root',
            children: node.children || [],
          },
        });
      }
    }
  });

  // 2. 未定義参照をチェック
  references.forEach((ref) => {
    if (!definitions.has(ref.id)) {
      errors.push({
        rule: 'M003',
        severity: 'error',
        message: `Undefined template reference: "${ref.id}"`,
        line: ref.line,
      });
    }

    // 3. 外部ファイル存在チェック
    if (ref.src) {
      const fullPath = path.resolve(projectRoot, ref.src);
      if (!fs.existsSync(fullPath)) {
        errors.push({
          rule: 'M005',
          severity: 'error',
          message: `External file not found: "${ref.src}"`,
          line: ref.line,
        });
      }
    }
  });

  return errors;
}

function extractTemplateId(directive: Directive): string {
  const attributes = parseDirectiveAttributes(directive);
  return (attributes.id as string) || '';
}
```

### M006-M007: 命名規則・属性名規則

```typescript
function detectNamingRuleViolations(ast: Root): LintResult[] {
  const errors: LintResult[] = [];

  visit(ast, 'directive', (node: Directive) => {
    // M006: ディレクティブ名大文字化規則
    if (['Template', 'Tag', 'Result'].includes(node.name)) {
      errors.push({
        rule: 'M006',
        severity: 'error',
        message: `Directive name must be lowercase: "${node.name}" should be "${node.name.toLowerCase()}"`,
        line: node.position?.start.line || 0,
        fixable: true,
        fix: {
          suggestion: `Use lowercase directive name: ::${node.name.toLowerCase()}{}`,
        },
      });
    }

    // M007: 属性名規則（template用のid属性を#idに）
    if (node.name === 'template' && node.attributes) {
      if (node.attributes.id && !node.attributes.id.startsWith('#')) {
        errors.push({
          rule: 'M007',
          severity: 'error',
          message: `Use "#id" attribute instead of "id" for template directives`,
          line: node.position?.start.line || 0,
          fixable: true,
          fix: {
            suggestion: `Change "id" to "#id" attribute`,
          },
        });
      }
    }
  });

  return errors;
}
```

### M020-M022: result 関連チェック

```typescript

function detectResultErrors(ast: Root): LintResult[] {
const errors: LintResult[] = [];

visit(ast, 'leafDirective', (node: Directive, index, parent) => {
if (node.name === 'tag') {
const isMandatory = parseDirectiveAttributes(node).mandatory === true;

      if (isMandatory) {
        // 直後のresultディレクティブを探す
        const resultNode = findNextResultDirective(parent, index);

        if (!resultNode) {
          errors.push({
            rule: "M020",
            severity: "error",
            message: "Missing required result block",
            line: node.position?.start.line || 0,
            fixable: true,
            fix: {
              insertAfter: node.position?.end.line || 0,
              text: "\n::result{}\n\n::",
            },
          });
        } else {
          const resultContent = extractResultContent(resultNode);

          // M021: 文字数チェック
          if (resultContent.length > 2000) {
            errors.push({
              rule: "M021",
              severity: "warn",
              message: "Result content exceeds 2000 characters",
              line: resultNode.position?.start.line || 0,
            });
          }

          // M022: 空チェック
          if (resultContent.trim().length === 0) {
            errors.push({
              rule: "M022",
              severity: "warn",
              message: "Result content is empty",
              line: resultNode.position?.start.line || 0,
              fixable: true,
              fix: {
                insertInside: resultNode,
                text: "// TODO: Add result content",
              },
            });
          }
        }
      }
    }
    });

return errors;
}

function findNextResultDirective(
parent: any,
currentIndex: number
): Directive | null {
if (!parent || !parent.children) return null;

for (let i = currentIndex + 1; i < parent.children.length; i++) {
const child = parent.children[i];
if (child.type === 'containerDirective' \&\& child.name === 'result') {
return child as Directive;
}
// 別のリスト項目に達したら検索終了
if (child.type === 'listItem') {
break;
}
}

return null;
}

```

### M041-M043: tag 構文エラー・ディレクティブ形式チェック

```typescript
function detectDirectiveSyntaxErrors(ast: Root): LintResult[] {
  const errors: LintResult[] = [];

  visit(ast, 'directive', (node: Directive) => {
    // M041: tag構文エラー
    if (node.name === 'tag') {
      const attributes = parseDirectiveAttributes(node);
      if (!attributes.id) {
        errors.push({
          rule: 'M041',
          severity: 'error',
          message: 'tag directive missing required \#id attribute',
          line: node.position?.start.line || 0,
        });
      }
    }

    // M043: ブロック系/自己終了系混合チェック
    if (node.name === 'template') {
      const hasChildren = node.children && node.children.length > 0;
      const hasSrc = node.attributes && node.attributes.src;

      if (node.type === 'leafDirective' && hasChildren) {
        errors.push({
          rule: 'M043',
          severity: 'error',
          message:
            'template directive with children must use container form (::template{} ... ::)',
          line: node.position?.start.line || 0,
          fixable: true,
          fix: {
            suggestion: 'Convert to container directive format',
          },
        });
      }

      if (node.type === 'containerDirective' && hasSrc && !hasChildren) {
        errors.push({
          rule: 'M043',
          severity: 'error',
          message:
            'template directive with src attribute should use leaf form (::template{})',
          line: node.position?.start.line || 0,
          fixable: true,
          fix: {
            suggestion: 'Convert to leaf directive format',
          },
        });
      }
    }
  });

  return errors;
}
```

### M060-M061: 情報的検出

```typescript
function detectInfoItems(
  ast: Root,
  definitions: Map<string, TemplateDefinition>
): LintResult[] {
  const errors: LintResult[] = [];
  const usedTemplates = new Set<string>();

  visit(ast, (node) => {
    // M060: カスタム項目検出
    if (node.type === 'listItem') {
      const hasTag = checkForTagInListItem(node);
      if (!hasTag) {
        errors.push({
          rule: 'M060',
          severity: 'info',
          message: 'Custom item detected (no tag directive)',
          line: node.position?.start.line || 0,
        });
      }
    }

    // 使用されたtemplateを記録
    if (
      node.type === 'leafDirective' &&
      (node as Directive).name === 'template'
    ) {
      const id = extractTemplateId(node as Directive);
      if (id) usedTemplates.add(id);
    }
  });

  // M061: 未使用template
  definitions.forEach((def, id) => {
    if (!usedTemplates.has(id)) {
      errors.push({
        rule: 'M061',
        severity: 'warn',
        message: `Unused template definition: "${id}"`,
        line: def.line,
      });
    }
  });

  return errors;
}

function checkForTagInListItem(listItem: any): boolean {
  let hasTag = false;

  visit(listItem, 'leafDirective', (node: Directive) => {
    if (node.name === 'tag') {
      hasTag = true;
    }
  });

  return hasTag;
}
```

## Config.yml 設定例

```yaml


# .mdck/config.yml

rules:
M001: error \# template id変更不可
M002: error \# template id重複
M003: error \# 未定義参照
M006: error \# ディレクティブ名小文字化
M007: error \# 属性名規則
M011: warn \# tag id形式
M020: error \# 必須result
M021: warn \# result文字数
M030: error \# チェックボックス
M043: error \# ディレクティブ形式原則
M060: info \# カスタム項目

settings:
itemIdFormat: "^[a-zA-Z0-9_-]+\$" \# tag id正規表現
maxResultLength: 2000 \# result最大文字数
allowCustomItems: true \# カスタム項目許可
autoFixEnabled: true \# 自動修正有効
enforceDirectiveCase: true \# 小文字化強制
enforceDirectiveFormat: true \# ディレクティブ形式強制

```

## remarkとremark-directiveベースの新規ルール詳細

### M006: ディレクティブ名大文字化規則違反

- **検出対象**: `::Template{}`, `::Tag{}`, `::Result{}` など大文字で始まるディレクティブ名
- **修正内容**: 自動で小文字に変換（remark-directiveの慣例に従う）

### M007: 属性名規則違反

- **検出対象**: `::template{id="..."}` の `id` 属性
- **修正内容**: `#id` 属性に自動変換

### M043: ブロック系/自己終了系混合

- **検出対象**:
  - `::template{#id=x src=./file.md} ... ::` のような混合形式
  - `::template{#id=x}` のような自己終了形式で子要素を持つ場合
- **修正内容**: 適切なディレクティブ形式への変換提案

## remarkとremark-directiveの利点

### 1. 標準的なMarkdownエコシステム

remarkは広く使われているMarkdownプロセッサーで、豊富なプラグインエコシステムがあります。remark-directiveにより、`::`記法による自然なMarkdown拡張が実現できます。

### 2. 型安全なAST操作

mdastによる型安全なAST操作で、堅牢なLint処理が可能です。ディレクティブの構造化された扱いにより、複雑な検証ロジックも直感的に実装できます。

### 3. プラグインアーキテクチャ

統一されたプラグインシステムで拡張性が高く、将来的な機能追加も容易です。remarkエコシステムとの親和性により、他のMarkdownツールとの連携も可能です。

これらの更新により、新しいディレクティブ記法とremarkベースのアーキテクチャに対応した、厳密で拡張可能なLintシステムが実現されます。
`
