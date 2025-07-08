# バグ修正テンプレート

:::template{id="bug-investigation"}
## バグ調査チェックリスト

### 問題の特定
- [ ] バグの再現手順が明確か ::tag{id="reproduction-steps" mandatory=true}
- [ ] 発生環境が特定されているか ::tag{id="environment-identification" mandatory=true}
- [ ] 影響範囲が調査されているか ::tag{id="impact-analysis" mandatory=true}
- [ ] 緊急度・重要度が評価されているか ::tag{id="priority-assessment"}

### 原因調査
- [ ] ログが確認されているか ::tag{id="log-analysis"}
- [ ] デバッガーを使用して調査したか ::tag{id="debugging"}
- [ ] 関連するコードが特定されているか ::tag{id="code-identification" mandatory=true}
- [ ] 根本原因が特定されているか ::tag{id="root-cause" mandatory=true}

### 修正方針
- [ ] 修正方針が決定されているか ::tag{id="fix-strategy" mandatory=true}
- [ ] 副作用の可能性が検討されているか ::tag{id="side-effect-analysis"}
- [ ] テスト方針が決定されているか ::tag{id="test-strategy"}

:::result{}
## 調査結果

### バグの詳細
<!-- バグの詳細な説明を記載 -->

### 根本原因
<!-- 特定された根本原因を記載 -->

### 修正方針
<!-- 決定された修正方針を記載 -->
:::
:::

:::template{id="bug-fix-implementation"}
## バグ修正実装チェックリスト

### 修正実装
- [ ] 根本原因に対する修正が実装されているか ::tag{id="root-cause-fix" mandatory=true}
- [ ] 同様の問題を防ぐ対策が実装されているか ::tag{id="prevention-measures"}
- [ ] エラーハンドリングが改善されているか ::tag{id="error-handling-improvement"}

### テスト
- [ ] バグの再現テストが作成されているか ::tag{id="regression-test" mandatory=true}
- [ ] 修正後の動作テストが実行されているか ::tag{id="fix-verification" mandatory=true}
- [ ] 関連機能への影響がテストされているか ::tag{id="impact-testing"}
- [ ] 既存のテストが全て通るか ::tag{id="existing-test-verification" mandatory=true}

### レビュー
- [ ] コードレビューが完了しているか ::tag{id="code-review" mandatory=true}
- [ ] 修正内容が適切か確認されているか ::tag{id="fix-appropriateness"}
- [ ] ドキュメントが更新されているか ::tag{id="documentation-update"}

:::result{}
## 修正結果

### 修正内容
<!-- 実装した修正の詳細を記載 -->

### テスト結果
<!-- テスト実行結果を記載 -->

### レビュー結果
<!-- コードレビューの結果を記載 -->
:::
:::