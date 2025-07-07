# @mdck/parser 仕様書

## 1. 概要

@mdck/parserは、拡張Markdown記法によるチェックリスト管理システムのコアパッケージです。markdown-itベースのトークン化とカスタムタグ解析を組み合わせ、型安全で高速な解析・検証を提供します。

## 2. markdown-itの動作特性

### 2.1 HTMLブロック認識の条件

markdown-itがHTMLタグを`html_block`として認識するには、以下の条件が必要です：

#### 2.1.1 既知のブロックレベルタグ

- `div`, `p`, `section`などの標準HTMLタグのみ
- カスタムタグ（`<Template>`, `<Tag>`, `<Result>`）は対象外
- **検証箇所**: [tokenizer.test.ts#L103-107](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L103-107)

#### 2.1.2 独立した行での配置

- 前後に空行がある
- タグが独立したブロックとして存在する
- **検証箇所**: [tokenizer.test.ts#L115-131](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L115-131)

#### 2.1.3 特定の形式要件

- 開始タグと終了タグが明確に分離されている
- 適切なXML/HTML形式である
- **検証箇所**: [tokenizer.test.ts#L89-95](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L89-95)

### 2.2 カスタムタグの処理特性

#### 2.2.1 単体配置時の動作

- `<Tag itemId="test" />`のような単体タグ
- `paragraph`内の`html_inline`として処理される
- **検証箇所**: [tokenizer.test.ts#L47-62](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L47-62)

#### 2.2.2 複数行配置時の動作

- `<Result>...内容...</Result>`のような複数行タグ
- `paragraph`や`text`トークンとして処理される
- **検証箇所**: [tokenizer.test.ts#L105-107](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L105-107), [tokenizer.test.ts#L121-131](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L121-131)

#### 2.2.3 リスト内配置時の動作

- `- [ ] 項目 <Tag itemId="test" />`のようなリスト内タグ
- `inline`トークンの`children`内の`html_inline`として処理される
- **検証箇所**: [tokenizer.test.ts#L133-153](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L133-153)

## 3. カスタムタグ解析アーキテクチャ

### 3.1 設計思想

- **単一責任原則**: 各コンポーネントは明確な責務を持つ
- **型安全性**: `any`型を禁止し、厳密な型付けを実装
- **シンプルさ**: 複雑な抽象化を避け、理解しやすい実装

#### 3.2.2 CustomTagParser

**重要な実装特性**:

- 再帰処理により`children`プロパティ内のタグも検出
- **検証箇所**: [custom-tag-parser.test.ts#L159-174](../../packages/parser/src/__tests__/unit/custom-tag-parser.test.ts#L159-174)

## 5. 行番号解決機構

### 5.1 実装戦略

親トークンからの行番号推定により、リスト内のインラインタグでも正確な行番号を提供：

```typescript
function resolveLineNumber(token: Token, parentToken?: Token): number {
  // 直接的な行番号が存在する場合
  if (token.map && token.map[^0] !== null) {
    return token.map[^0] + 1;
  }

  // 親トークンから推定
  if (parentToken && parentToken.map && parentToken.map[^0] !== null) {
    return parentToken.map[^0] + 1;
  }

  return -1;
}
```

### 5.2 検証結果

- ブロックレベルタグ: 直接的な行番号取得が可能
- **検証箇所**: [custom-tag-parser.test.ts#L110-122](../../packages/parser/src/__tests__/unit/custom-tag-parser.test.ts#L110-122)
- インラインタグ: 親トークンからの推定で解決
- **検証箇所**: [custom-tag-parser.test.ts#L124-136](../../packages/parser/src/__tests__/unit/custom-tag-parser.test.ts#L124-136)

## 6. テスト戦略と品質保証

### 6.1 テストアーキテクチャ

- **単体テスト**: 各コンポーネントの責務を個別に検証
- **結合テスト**: システム全体のワークフローを検証
- **エッジケーステスト**: 不正入力や境界値での動作を検証

### 6.2 重要な発見事項とテスト箇所

#### 6.2.1 HTMLエンコード問題

- テストデータでHTMLエンコード（`&lt;`, `&gt;`）を使用すると解析に失敗
- **発見箇所**: 初回テスト実行時の失敗
- **対策**: 生のHTMLタグを使用するようテストデータを修正

#### 6.2.2 markdown-itの実際の動作

- カスタムタグは期待される`html_block`トークンとして認識されない場合が多い
- **発見箇所**: [tokenizer.test.ts#L103-107](../../packages/parser/src/__tests__/unit/tokenizer.test.ts#L103-107)
- **対策**: 柔軟な検証方法に変更（複数のトークンタイプを考慮）

#### 6.2.3 属性解析の複雑性

- 特殊文字を含む属性値の処理
- **検証箇所**: [attribute-parser.test.ts#L80-89](../../packages/parser/src/__tests__/unit/attribute-parser.test.ts#L80-89)
- ブール属性と文字列属性の混在
- **検証箇所**: [attribute-parser.test.ts#L57-68](../../packages/parser/src/__tests__/unit/attribute-parser.test.ts#L57-68)
