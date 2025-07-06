# mdck テンプレート雛形と生成チェックリスト例

## 1. 推奨ディレクトリレイアウト

```

project-root/
├── checklists/
│   ├── templates/
│   │   ├── common.md      \# 共通コンポーネント
│   │   ├── child1.md      \# 子テンプレート1
│   │   ├── child2.md      \# 子テンプレート2
│   │   └── parent.md      \# ルートテンプレート
│   └── runs/
│       └── 2025-07-07_build.md   \# 生成されたチェックリスト
├── .mdck/
│   ├── config.yml        \# Lint / CLI 設定
│   └── .cache/           \# parser が自動生成
└── README.md

```

## 2. テンプレートファイル

### 2-1. common.md : 共通コンポーネント

```

<Template id="common">
## 共通前提

- [ ] 仕様書が最新か確認する <Tag itemId="C1" />
- [ ] 関係者にレビュー依頼を送付 <Tag itemId="C2" isResultRequired />

<Result></Result>
</Template>
```

### 2-3. child2.md : 子テンプレート 2

```

<Template id="child2">
## デプロイ前チェック

- [ ] テストの実行確認 <Tag itemId="D1" />
- [ ] ステージング環境での動作確認 <Tag itemId="D2" isResultRequired />

<Result>
全テストパス、ステージング正常動作確認
</Result>

</Template>
```

### 2-4. parent.md : ルートテンプレート

```md
<Template id="parent">
# 総合ビルド・デプロイチェックリスト

## 事前準備

<Template id="child1" src="./child1.md" />

## デプロイ準備

<Template id="child2" src="./child2.md" />

## 最終確認

- [ ] プロダクション環境の確認 <Tag itemId="P1" isResultRequired />

<Result>
プロダクション環境正常、デプロイ可能
</Result>

- [ ] ロールバック手順の確認 <Tag itemId="P2" />

</Template>
```

## 3. 生成されたチェックリスト例

CLI: `mdck generate Templates/parent.md --out checklists/build-2025-07-07.md`

```md
<!-- build-2025-07-07.md : parent テンプレート展開結果 -->
<TemplateInstance TemplateId="parent" generatedAt="2025-07-07T04:26:00+09:00">

# リリース前チェックリスト

## 共通前提

- [ ] 仕様書が最新か確認する <Tag itemId="C1" />
      <Result></Result>

- [x] 関係者にレビュー依頼を送付 <Tag itemId="C2" isResultRequired />
      <Result>Slack で依頼済み @2025-07-06</Result>

### 子チェック

1. [x] API エンドポイントがドキュメント化されている <Tag itemId="CH1" />
       <Result></Result>

2. [x] 戻り値スキーマが確定 <Tag itemId="CH2" isResultRequired />
       <Result>OpenAPI 3.1 に更新済み</Result>

### 親専用項目

- [x] Stage 環境で smoke test 実施 <Tag itemId="P1" />
      <Result></Result>

</TemplateInstance>
```

#### 挙動メモ

- Result タグが空の行では Linter が warning を出力
  例: `Tag itemId="C1"`, `itemId="CH1"`, `itemId="P1"`
- isResultRequired が付いた項目で Result が空の場合は error として検出
- 追加でユーザが自由記述した Markdown 行は `Tag` を持たないため、`--warn-custom` オプションで警告するか選択できる

## 4. config.yml (最小例)

```yaml
lint:
  allowCustomItems: true # Tag 無し項目を許容
  warnEmptyResult: true # Result が空なら warning
  errorIfRequiredMissing: true
paths:
  Templates: ./docs/Templates
  cache: ./.mdck/.cache
```

## 5. CLI フロー（概要）

```shell
# 静的検証
mdck lint docs/checklists/build-2025-07-07.md

# キャッシュ更新

mdck cache refresh

```

## 6. 注意事項

- Template の `id` 属性は一意である必要があります
- 外部参照する際の `src` パスは相対パスで指定してください
- `isResultRequired` フラグが付いた Tag には必ず `<Result>` ブロックが必要です
- カスタム項目（Tag なし）は自由に追加できますが、設定により warning が表示される場合があります
