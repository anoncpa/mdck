# mdck テンプレート雛形と生成チェックリスト例

## 1. 推奨ディレクトリレイアウト

```

project-root/
├── checklists/
│   ├── templates/
│   │   ├── common.md       共通コンポーネント
│   │   ├── child1.md       子テンプレート1
│   │   ├── child2.md       子テンプレート2
│   │   └── parent.md       ルートテンプレート
│   └── runs/
│       └── 2025-07-07_build.md    生成されたチェックリスト
├── .mdck/
│   ├── config.yml         Lint / CLI 設定
│   └── .cache/            parser が自動生成
└── README.md

```

## 2. テンプレートファイル

### 2-1. common.md : 共通コンポーネント

```md
::template{id=common}

## 共通前提

- [ ] 仕様書が最新か確認する ::tag{id=C1}
- [ ] 関係者にレビュー依頼を送付 ::tag{id=C2 mandatory=true}

::result{}
::
::
```

### 2-2. child1.md : 子テンプレート1

```md
::template{id=child1}

## 子チェック

1. [ ] APIエンドポイントがドキュメント化されている ::tag{id=CH1}
2. [ ] 戻り値スキーマが確定 ::tag{id=CH2 mandatory=true}

::result{}
OpenAPI 3.1 に更新済み
::
::
```

### 2-3. child2.md : 子テンプレート 2

```md
::template{id=child2}

## デプロイ前チェック

- [ ] テストの実行確認 ::tag{id=D1}
- [ ] ステージング環境での動作確認 ::tag{id=D2 mandatory=true}

::result{}
全テストパス、ステージング正常動作確認
::
::
```

### 2-4. parent.md : ルートテンプレート

```md
::template{id=parent}

# 総合ビルド・デプロイチェックリスト

## 事前準備

::template{id=child1 src=./child1.md}

## デプロイ準備

::template{id=child2 src=./child2.md}

## 最終確認

- [ ] プロダクション環境の確認 ::tag{id=P1 mandatory=true}

::result{}
プロダクション環境正常、デプロイ可能
::

- [ ] ロールバック手順の確認 ::tag{id=P2}

::
```

## 3. 生成されたチェックリスト例

CLI: `mdck generate Templates/parent.md --out checklists/build-2025-07-07.md`

```

<!-- build-2025-07-07.md : parent テンプレート展開結果 -->
::template-instance{template-id=parent generated-at="2025-07-07T04:26:00+09:00"}

# リリース前チェックリスト

## 共通前提

- [ ] 仕様書が最新か確認する ::tag{id=C1}
::result{}
::
- [x] 関係者にレビュー依頼を送付 ::tag{id=C2 mandatory=true}
::result{}
Slack で依頼済み @2025-07-06
::


### 子チェック

1. [x] API エンドポイントがドキュメント化されている ::tag{id=CH1}
::result{}
::
2. [x] 戻り値スキーマが確定 ::tag{id=CH2 mandatory=true}
::result{}
OpenAPI 3.1 に更新済み
::

### 親専用項目

- [x] Stage 環境で smoke test 実施 ::tag{id=P1}
::result{}
::

::

```

#### 挙動メモ

- resultディレクティブが空の場合、Linterが warning を出力
  例: `::tag{#id=C1}`, `::tag{#id=CH1}`, `::tag{#id=P1}`
- `mandatory=true`が付いた項目でresultが空の場合は error として検出
- 追加でユーザが自由記述した Markdown 行は `::tag` を持たないため、`--warn-custom` オプションで警告するか選択できる

## 4. config.yml (最小例)

```

lint:
allowCustomItems: true  tag 無し項目を許容
warnEmptyResult: true  result が空なら warning
errorIfRequiredMissing: true
paths:
Templates: ./docs/Templates
cache: ./.mdck/.cache

```

## 5. CLI フロー（概要）

```


# 静的検証

mdck lint docs/checklists/build-2025-07-07.md

# キャッシュ更新

mdck cache refresh

```

## 6. 注意事項

- templateの `#id` 属性は一意である必要があります
- 外部参照する際の `src` パスは相対パスで指定してください
- `mandatory=true` フラグが付いた tagには必ず `::result{}` ブロックが必要です
- カスタム項目（tag なし）は自由に追加できますが、設定により warning が表示される場合があります

## 7. ディレクティブ記法の詳細

### 7-1. ブロック系ディレクティブ

```

::template{id=server-maintenance}
コンテンツ
::

```

### 7-2. 自己終了系ディレクティブ

```

::tag{id=1 mandatory=true}
::template{id=common src=./common.md}

```

### 7-3. 属性記法

- 基本形式：`key=value`
- 空白を含む場合：`key="value with space"`
- 識別子属性：`#id=identifier`
- 真偽値：`mandatory=true` または `mandatory=false`
- 複数属性：`::tag{#id=1 mandatory=true category=deploy}`

### 7-4. remarkとremark-directiveの利点

- 標準的なMarkdownパーサーエコシステムに準拠
- プラグインベースのアーキテクチャによる拡張性
- 型安全なASTベースの処理
- より自然なMarkdown記法による可読性向上
- remarkエコシステムとの親和性

```

主な変更点：

1. **HTMLタグ風記法からディレクティブ記法への変更**
    - `<Template id="common">` → `::template{#id=common}`
    - `<Tag itemId="C1" />` → `::tag{#id=C1}`
    - `<Result></Result>` → `::result{} ::`
2. **属性記法の変更**
    - `itemId` → `#id`
    - `isResultRequired` → `mandatory=true`
    - 外部ファイル参照は `src=./common.md` で維持
3. **ディレクティブ名の小文字化**
    - remark-directiveの慣例に従い、`template`, `tag`, `result`を小文字で使用
4. **新しいセクションの追加**
    - 「ディレクティブ記法の詳細」セクションを追加し、remarkとremark-directiveの使用方法を説明

既存のファイル構成や機能説明は維持しつつ、記法のみを新しい仕様に合わせて変更しました。
```
