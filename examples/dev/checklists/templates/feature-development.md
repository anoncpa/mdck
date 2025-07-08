# 機能開発テンプレート

:::template{id="feature-planning"}
## 機能開発計画チェックリスト

### 要件定義
- [ ] 機能要件が明確に定義されているか ::tag{id="functional-requirements" mandatory=true}
- [ ] 非機能要件が定義されているか ::tag{id="non-functional-requirements"}
- [ ] 受け入れ条件が明確か ::tag{id="acceptance-criteria" mandatory=true}
- [ ] ユーザーストーリーが作成されているか ::tag{id="user-stories"}

### 設計
- [ ] システム設計書が作成されているか ::tag{id="system-design"}
- [ ] データベース設計が完了しているか ::tag{id="database-design"}
- [ ] API設計が完了しているか ::tag{id="api-design"}
- [ ] UI/UX設計が完了しているか ::tag{id="ui-design"}

### 見積もり・計画
- [ ] 開発工数が見積もられているか ::tag{id="effort-estimation" mandatory=true}
- [ ] スケジュールが策定されているか ::tag{id="schedule"}
- [ ] リスクが識別・評価されているか ::tag{id="risk-assessment"}

:::result{}
## 計画結果

### 承認状況
<!-- ステークホルダーの承認状況を記載 -->

### スケジュール
<!-- 詳細なスケジュールを記載 -->

### リスク対策
<!-- 識別されたリスクと対策を記載 -->
:::
:::

:::template{id="feature-implementation"}
## 機能実装チェックリスト

### 実装前準備
- [ ] 開発環境がセットアップされているか ::tag{id="dev-env-setup"}
- [ ] 必要なライブラリ・ツールが準備されているか ::tag{id="tools-setup"}
- [ ] ブランチが作成されているか ::tag{id="branch-creation"}

### 実装
- [ ] コア機能が実装されているか ::tag{id="core-implementation" mandatory=true}
- [ ] エラーハンドリングが実装されているか ::tag{id="error-handling" mandatory=true}
- [ ] ログ出力が適切に実装されているか ::tag{id="logging"}
- [ ] バリデーション処理が実装されているか ::tag{id="validation"}

### ドキュメント
- [ ] コードコメントが記載されているか ::tag{id="code-comments"}
- [ ] API仕様書が更新されているか ::tag{id="api-docs"}
- [ ] README等のドキュメントが更新されているか ::tag{id="readme-update"}

:::result{}
## 実装結果

### 実装内容
<!-- 実装した機能の詳細を記載 -->

### 技術的な判断
<!-- 実装時に行った技術的な判断とその理由を記載 -->

### 残課題
<!-- 今後対応が必要な課題を記載 -->
:::
:::