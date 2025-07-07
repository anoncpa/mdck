// packages/parser/src/__tests__/fixtures/markdown-samples.ts
export const MarkdownSamples = {
  // 基本的なケース
  basic: `
# テストドキュメント

 - [ ] 基本的なチェック項目 <Tag itemId="T001" />
 - [x] 完了済み項目 <Tag itemId="T002" isResultRequired />
       <Result>テスト完了</Result>
`,

  // 複雑なケース（ネスト、複数タグ）
  complex: `
 <Template id="parent">
   <Template id="child1" src="./child1.md" />
   <Template id="child2" src="./child2.md" />

  ## セクション1
   - [ ] 項目1 <Tag itemId="C001" />
   - [ ] 項目2 <Tag itemId="C002" isResultRequired />
         <Result>
        複数行の結果
        詳細情報含む
         </Result>

  ## セクション2
   1. [ ] 番号付き項目 <Tag itemId="N001" isResultRequired />
      <Result></Result>
 </Template>
`,

  // エッジケース集
  edgeCases: {
    // 特殊文字を含む属性
    specialChars: `<Tag itemId="test-123_$%" description="特殊文字：<>&\"'" />`,

    // 空の結果ブロック
    emptyResult: `
 - [ ] テスト <Tag itemId="E001" isResultRequired />
   <Result></Result>
`,

    // ネストしたHTMLタグ
    nestedHtml: `
 - [ ] HTMLを含む項目 <Tag itemId="H001" />
   <div>HTMLコンテンツ</div>
   <Result><strong>強調された結果</strong></Result>
`,

    // 行番号テスト用（複数行にまたがる）
    multiLine: `
 - [ ] 長い項目名
      複数行にわたる説明
       <Tag itemId="M001" />

       <Result>
      複数行の結果
      詳細情報
       </Result>
`,
  },

  // 不正なMarkdown
  invalid: {
    // 不完全なタグ
    incompleteTag: `<Tag itemId="incomplete"`,

    // 閉じられていないTemplate
    unclosedTemplate: `<Template id="unclosed">content without closing tag`,

    // 循環参照（テスト用）
    circularRef: `
 <Template id="a" src="./b.md" />
 <Template id="b" src="./a.md" />
`,
  },
  empty: '',

  // カスタムタグのないMarkdown（明示的に追加）
  noCustomTags: `
# 通常のMarkdown

- [ ] 普通のチェックリスト
- [x] 完了した項目

**強調テキスト**
`,
} as const;
