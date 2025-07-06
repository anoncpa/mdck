# mdck Lint エラー仕様詳細（修正版）

## 主要な仕様変更点

- **命名規則**: Template、Tag、Result など、大文字で始まる
- **JSX 構文**: `<Tag />` のような自己終了タグが原則
- **属性名**: `TemplateId` 属性を使用（`id` ではなく）

## Lint エラー項目一覧

| ルール ID | 重大度 | エラー内容               | 自動修正 | カスタマイズ可 | 検出ロジック詳細                                                         |
| :-------- | :----- | :----------------------- | :------- | :------------- | :----------------------------------------------------------------------- |
| **M001**  | error  | TemplateId 変更不可      | ×        | ×              | Git diff 比較により旧 TemplateId と現在値を照合。staging 時に検出        |
| **M002**  | error  | Template id 重複定義     | ×        | ○              | 同じプロジェクト内で同じ TemplateId 属性を持つ`<Template>`定義が複数存在 |
| **M003**  | error  | Template 未定義参照      | ×        | ○              | `<Template id="x" />`（参照）に対応する定義が見つからない                |
| **M004**  | error  | 循環参照検出             | ×        | ○              | Template 展開時の id 履歴で同一 id の再出現を検出                        |
| **M005**  | error  | 外部ファイル未発見       | ×        | ○              | `src`属性で指定されたファイルパスが存在しない                            |
| **M006**  | error  | タグ名大文字化規則違反   | ○        | ○              | `<template>`, `<tag>`, `<result>`など小文字タグの使用を検出              |
| **M007**  | error  | 属性名規則違反           | ○        | ○              | `id`属性の代わりに`TemplateId`属性を強制                                 |
| **M010**  | error  | itemId 重複              | ×        | ○              | 展開後トークン列で同一 itemId 属性を持つ`<Tag />`が複数存在              |
| **M011**  | warn   | itemId 形式不正          | ×        | ○              | itemId が UUIDv4 形式でない場合（config.yml で形式指定可）               |
| **M020**  | error  | 必須 Result 欠落         | ○        | ○              | `isResultRequired`属性付き`<Tag />`の直後に`<Result>`ブロックが無い      |
| **M021**  | warn   | Result 文字数超過        | ×        | ○              | `<Result>`内のテキストが設定文字数（デフォルト 2000）を超過              |
| **M022**  | warn   | Result 内容空            | ○        | ○              | `<Result></Result>`または`<Result>`内が空白のみ                          |
| **M030**  | error  | チェックボックス記法不正 | ○        | ○              | リスト項目が`- [ ]`または`- [x]`で始まらない                             |
| **M040**  | error  | Template 構文エラー      | ×        | ×              | `<Template>`タグの開始・終了が不整合、または必須属性欠落                 |
| **M041**  | error  | Tag 構文エラー           | ×        | ×              | `<Tag>`タグが自己終了でない、または必須属性欠落                          |
| **M042**  | error  | Result 構文エラー        | ×        | ×              | `<Result>`タグの開始・終了が不整合                                       |
| **M043**  | error  | 非自己終了タグ検出       | ○        | ○              | `<Tag>`が`<Tag />`形式でない場合（JSX 原則違反）                         |
| **M050**  | error  | Git コンフリクト残存     | ×        | ×              | `<<<<<<<`、`=======`、`>>>>>>>`マーカーが残存                            |
| **M051**  | error  | TemplateId 属性形式不正  | ×        | ○              | TemplateId 属性値が空または不正文字を含む                                |
| **M060**  | info   | カスタム項目検出         | ×        | ○              | `<Tag>`なしのチェックボックス項目を検出                                  |
| **M061**  | warn   | 未使用 Template          | ×        | ○              | 定義されているが参照されていない Template                                |

## 詳細検出ロジック

### M001: TemplateId 変更不可

```typescript
function detectTemplateIdChange(
  currentTokens: Token[],
  filePath: string
): LintResult[] {
  // 1. Gitから前回コミットの同ファイルを取得
  const previousContent = execSync(`git show HEAD:${filePath}`).toString();
  const previousTokens = md.parse(previousContent);

  // 2. 現在と過去のTemplateIdを抽出
  const currentIds = extractTemplateIds(currentTokens);
  const previousIds = extractTemplateIds(previousTokens);

  // 3. ID変更を検出
  const changedIds = currentIds.filter((id) =>
    previousIds.some(
      (prev) => prev.position === id.position && prev.value !== id.value
    )
  );

  return changedIds.map((id) => ({
    rule: "M001",
    severity: "error",
    message: `TemplateId "${id.oldValue}" cannot be changed to "${id.value}"`,
    line: id.line,
  }));
}

function extractTemplateIds(tokens: Token[]): TemplateIdInfo[] {
  return tokens
    .filter(
      (token) =>
        token.type === "html_block" && token.content.includes("<Template")
    )
    .map((token) => {
      const templateIdMatch = token.content.match(/TemplateId="([^"]+)"/);
      return {
        value: templateIdMatch?.[1] || "",
        line: token.map![0],
        position: token.map![0], // 行番号を位置として使用
      };
    });
}
```

### M002-M005: Template 定義・参照エラー

```typescript
function detectTemplateErrors(
  tokens: Token[],
  projectRoot: string
): LintResult[] {
  const definitions = new Map<string, TemplateDefinition>();
  const references: TemplateReference[] = [];
  const errors: LintResult[] = [];

  // 1. 定義と参照を収集
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "html_block" && token.content.includes("<Template")) {
      const templateId = extractTemplateIdAttribute(token.content);
      const isSelfClosing = token.content.includes("/>");

      if (isSelfClosing || !hasEndTag(tokens, i)) {
        // 参照
        const src = extractSrcAttribute(token.content);
        references.push({
          id: extractIdAttribute(token.content) || templateId,
          line: token.map![0],
          src,
        });
      } else {
        // 定義
        if (definitions.has(templateId)) {
          errors.push({
            rule: "M002",
            severity: "error",
            message: `Duplicate Template definition: "${templateId}"`,
            line: token.map![0],
          });
        }
        definitions.set(templateId, {
          id: templateId,
          line: token.map![0],
          tokens: extractTemplateBody(tokens, i),
        });
      }
    }
  }

  // 2. 未定義参照をチェック
  references.forEach((ref) => {
    if (!definitions.has(ref.id)) {
      errors.push({
        rule: "M003",
        severity: "error",
        message: `Undefined Template reference: "${ref.id}"`,
        line: ref.line,
      });
    }

    // 3. 外部ファイル存在チェック
    if (ref.src) {
      const fullPath = path.resolve(projectRoot, ref.src);
      if (!fs.existsSync(fullPath)) {
        errors.push({
          rule: "M005",
          severity: "error",
          message: `External file not found: "${ref.src}"`,
          line: ref.line,
        });
      }
    }
  });

  return errors;
}

function extractTemplateIdAttribute(content: string): string {
  const match = content.match(/TemplateId="([^"]+)"/);
  return match?.[1] || "";
}
```

### M006-M007: 命名規則・属性名規則

```typescript
function detectNamingRuleViolations(tokens: Token[]): LintResult[] {
  const errors: LintResult[] = [];

  tokens.forEach((token) => {
    if (token.type === "html_block" || token.type === "html_inline") {
      const content = token.content;

      // M006: タグ名大文字化規則
      const lowercaseTagPattern = /<(template|tag|result)[\s>]/gi;
      let match;
      while ((match = lowercaseTagPattern.exec(content)) !== null) {
        errors.push({
          rule: "M006",
          severity: "error",
          message: `Tag name must start with capital letter: "${
            match[1]
          }" should be "${
            match[1].charAt(0).toUpperCase() + match[1].slice(1)
          }"`,
          line: token.map![0],
          fixable: true,
          fix: {
            range: [match.index, match.index + match[0].length],
            text: content.replace(
              match[1],
              match[1].charAt(0).toUpperCase() + match[1].slice(1)
            ),
          },
        });
      }

      // M007: 属性名規則（Templateタグのid属性をTemplateIdに）
      if (
        content.includes("<Template") &&
        content.includes("id=") &&
        !content.includes("TemplateId=")
      ) {
        const idMatch = content.match(/\sid="([^"]+)"/);
        if (idMatch) {
          errors.push({
            rule: "M007",
            severity: "error",
            message: `Use "TemplateId" attribute instead of "id" for Template tags`,
            line: token.map![0],
            fixable: true,
            fix: {
              range: [idMatch.index!, idMatch.index! + idMatch[0].length],
              text: ` TemplateId="${idMatch[1]}"`,
            },
          });
        }
      }
    }
  });

  return errors;
}
```

### M020-M022: Result 関連チェック

```typescript
function detectResultErrors(tokens: Token[]): LintResult[] {
  const errors: LintResult[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "html_inline" && token.content.includes("<Tag")) {
      const isResultRequired = token.content.includes("isResultRequired");

      if (isResultRequired) {
        // 直後のResultブロックを探す（大文字のResult）
        const resultToken = findNextResultBlock(tokens, i);

        if (!resultToken) {
          errors.push({
            rule: "M020",
            severity: "error",
            message: "Missing required Result block",
            line: token.map![0],
            fixable: true,
            fix: {
              insertAfter: token.map![1],
              text: "\n<Result>\n\n</Result>",
            },
          });
        } else {
          const resultContent = extractResultContent(resultToken.content);

          // M021: 文字数チェック
          if (resultContent.length > 2000) {
            errors.push({
              rule: "M021",
              severity: "warn",
              message: "Result content exceeds 2000 characters",
              line: resultToken.map![0],
            });
          }

          // M022: 空チェック
          if (resultContent.trim().length === 0) {
            errors.push({
              rule: "M022",
              severity: "warn",
              message: "Result content is empty",
              line: resultToken.map![0],
              fixable: true,
              fix: {
                insertInside: resultToken,
                text: "// TODO: Add result content",
              },
            });
          }
        }
      }
    }
  }

  return errors;
}

function findNextResultBlock(
  tokens: Token[],
  startIndex: number
): Token | null {
  for (let i = startIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "html_block" && token.content.includes("<Result>")) {
      return token;
    }
    // 別のリスト項目に達したら検索終了
    if (token.type === "list_item_open") {
      break;
    }
  }
  return null;
}
```

### M041-M043: Tag 構文エラー・JSX 原則チェック

```typescript
function detectTagSyntaxErrors(tokens: Token[]): LintResult[] {
  const errors: LintResult[] = [];

  tokens.forEach(token => {
    if (token.type === 'html_inline' || token.type === 'html_block') {
      const content = token.content;

      // M041: Tag構文エラー
      if (content.includes('<Tag')) {
        if (!extractItemId(content)) {
          errors.push({
            rule: 'M041',
            severity: 'error',
            message: 'Tag missing required itemId attribute',
            line: token.map![0]
          });
        }
      }

      // M043: 非自己終了タグ検出（JSX原則違反）
      const tagPattern = /<(Tag|Template)(?:\s[^>]*)?>(?!</)/g;
      let match;
      while ((match = tagPattern.exec(content)) !== null) {
        if (!content.substring(match.index).startsWith('<' + match[1]) ||
            !content.substring(match.index).includes('/>')) {
          errors.push({
            rule: 'M043',
            severity: 'error',
            message: `${match[1]} tag must be self-closing (JSX style): use <${match[1]} ... />`,
            line: token.map![0],
            fixable: true,
            fix: {
              suggestion: `Convert to self-closing tag format`
            }
          });
        }
      }
    }
  });

  return errors;
}
```

### M060-M061: 情報的検出

```typescript
function detectInfoItems(
  tokens: Token[],
  definitions: Map<string, TemplateDefinition>
): LintResult[] {
  const errors: LintResult[] = [];
  const usedTemplates = new Set<string>();

  tokens.forEach((token) => {
    // M060: カスタム項目検出
    if (token.type === "list_item_open") {
      const hasTag = checkForTagInListItem(tokens, tokens.indexOf(token));
      if (!hasTag) {
        errors.push({
          rule: "M060",
          severity: "info",
          message: "Custom item detected (no Tag)",
          line: token.map![0],
        });
      }
    }

    // 使用されたTemplateを記録
    if (token.type === "html_inline" && token.content.includes("<Template")) {
      const id =
        extractIdAttribute(token.content) ||
        extractTemplateIdAttribute(token.content);
      if (id) usedTemplates.add(id);
    }
  });

  // M061: 未使用Template
  definitions.forEach((def, id) => {
    if (!usedTemplates.has(id)) {
      errors.push({
        rule: "M061",
        severity: "warn",
        message: `Unused Template definition: "${id}"`,
        line: def.line,
      });
    }
  });

  return errors;
}
```

## Config.yml 設定例

```yaml
# .mdck/config.yml
rules:
  M001: error # TemplateId変更不可
  M002: error # Template id重複
  M003: error # 未定義参照
  M006: error # タグ名大文字化
  M007: error # 属性名規則
  M011: warn # itemId形式
  M020: error # 必須Result
  M021: warn # Result文字数
  M030: error # チェックボックス
  M043: error # JSX原則
  M060: info # カスタム項目

settings:
  itemIdFormat: "^[a-zA-Z0-9_-]+$" # itemId正規表現
  maxResultLength: 2000 # Result最大文字数
  allowCustomItems: true # カスタム項目許可
  autoFixEnabled: true # 自動修正有効
  enforceCapitalization: true # 大文字化強制
  enforceJSXStyle: true # JSX形式強制
```

## 新規追加されたルールの詳細

### M006: タグ名大文字化規則違反

- **検出対象**: `<template>`, `<tag>`, `<result>` など小文字で始まるタグ
- **修正内容**: 自動で先頭文字を大文字に変換

### M007: 属性名規則違反

- **検出対象**: `<Template id="...">` の `id` 属性
- **修正内容**: `TemplateId` 属性に自動変換

### M043: 非自己終了タグ検出

- **検出対象**: `<Tag itemId="1"></Tag>` や `<Template id="x"></Template>` 形式
- **修正内容**: JSX 形式 `<Tag itemId="1" />` への変換提案

これらの追加により、新しい命名規則と JSX 構文原則が厳密に守られるようになります。
