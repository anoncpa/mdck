# 共通開発テンプレート

:::template{id="code-review-checklist"}
## コードレビューチェックリスト

### 基本チェック項目
- [ ] コードが要件を満たしているか ::tag{id="requirements-check" mandatory=true}
- [ ] コードスタイルガイドに準拠しているか ::tag{id="style-guide"}
- [ ] 適切なコメントが記載されているか ::tag{id="comments"}
- [ ] 変数名・関数名が適切か ::tag{id="naming"}

### セキュリティチェック
- [ ] 入力値の検証が適切に行われているか ::tag{id="input-validation" mandatory=true}
- [ ] 認証・認可が適切に実装されているか ::tag{id="auth-check"}
- [ ] 機密情報がハードコードされていないか ::tag{id="secrets-check" mandatory=true}

### パフォーマンスチェック
- [ ] 不要なループや処理がないか ::tag{id="performance"}
- [ ] メモリリークの可能性がないか ::tag{id="memory-leak"}
- [ ] データベースクエリが最適化されているか ::tag{id="db-optimization"}

:::result{}
## レビュー結果

### 発見された問題
<!-- レビューで発見された問題を記載 -->

### 修正提案
<!-- 修正提案を記載 -->

### 承認状況
<!-- 承認者と承認日時を記載 -->
:::
:::

:::template{id="testing-checklist"}
## テストチェックリスト

### 単体テスト
- [ ] 正常系のテストケースが網羅されているか ::tag{id="unit-happy-path" mandatory=true}
- [ ] 異常系のテストケースが網羅されているか ::tag{id="unit-error-path" mandatory=true}
- [ ] エッジケースのテストが含まれているか ::tag{id="unit-edge-cases"}
- [ ] テストカバレッジが基準を満たしているか ::tag{id="test-coverage" mandatory=true}

### 結合テスト
- [ ] API間の連携が正しく動作するか ::tag{id="integration-api"}
- [ ] データベースとの連携が正しく動作するか ::tag{id="integration-db"}
- [ ] 外部サービスとの連携が正しく動作するか ::tag{id="integration-external"}

### E2Eテスト
- [ ] 主要なユーザーフローが動作するか ::tag{id="e2e-main-flow" mandatory=true}
- [ ] 異常系のユーザーフローが適切に処理されるか ::tag{id="e2e-error-flow"}

:::result{}
## テスト結果

### テスト実行結果
<!-- テスト実行結果を記載 -->

### カバレッジレポート
<!-- カバレッジの詳細を記載 -->

### 発見されたバグ
<!-- テストで発見されたバグを記載 -->
:::
:::

:::template{id="deployment-checklist"}
## デプロイメントチェックリスト

### デプロイ前チェック
- [ ] 本番環境の設定ファイルが正しく設定されているか ::tag{id="config-check" mandatory=true}
- [ ] データベースマイグレーションが準備されているか ::tag{id="migration-check"}
- [ ] 依存関係が最新かつ安全なバージョンか ::tag{id="dependency-check"}
- [ ] ログ設定が適切か ::tag{id="logging-check"}

### デプロイ実行
- [ ] バックアップが取得されているか ::tag{id="backup-check" mandatory=true}
- [ ] デプロイスクリプトが正常に実行されるか ::tag{id="deploy-script"}
- [ ] ヘルスチェックが正常に応答するか ::tag{id="health-check" mandatory=true}
- [ ] 監視アラートが正常に動作するか ::tag{id="monitoring-check"}

### デプロイ後チェック
- [ ] 主要機能が正常に動作するか ::tag{id="smoke-test" mandatory=true}
- [ ] パフォーマンスが期待値内か ::tag{id="performance-check"}
- [ ] ログにエラーが出力されていないか ::tag{id="log-check"}

:::result{}
## デプロイ結果

### デプロイ実行ログ
<!-- デプロイ実行時のログを記載 -->

### 動作確認結果
<!-- 動作確認の結果を記載 -->

### 問題・課題
<!-- デプロイ時に発生した問題や今後の課題を記載 -->
:::
:::