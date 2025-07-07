# mdck Parser 実装TODOリスト

現在の実装状況を分析し、小さく動かしながらテストPASSを維持する方針で段階的な開発計画を作成しました。

## 現在の実装状況

### ✅ 完了済み

- 基本的なパーサー構造（`MdckParser`, `Tokenizer`）
- カスタムタグ抽出（`parseCustomTags`）
- 属性解析（`parseTagAttributes`）
- 型定義とテストインフラ
- 基本的な単体テスト・統合テスト
- 行番号解決の改善（一部edge caseあり）


## Phase 2: テンプレート処理機能（優先度：高）

### 2.1 テンプレート定義収集

```typescript
// 新規ファイル: src/core/template-processor.ts
export class TemplateProcessor {
  async collectDefinitions(tokens: Token[], filePath?: string): Promise<Map<string, TemplateDefinition>>
}
```

**タスク:**

- [ ] `TemplateProcessor`クラスの実装
- [ ] ローカルテンプレート定義の収集
- [ ] `TemplateDefinition`型の定義
- [ ] 基本的なテンプレート処理テスト

**期待される結果:** 単一ファイル内のテンプレート定義を正しく抽出

### 2.2 外部ファイル解決

```typescript
// 新規ファイル: src/core/file-resolver.ts
export class FileResolver {
  async resolveExternalFile(srcPath: string, basePath?: string): Promise<Token[]>
}
```

**タスク:**

- [ ] `FileResolver`クラスの実装
- [ ] 相対パス・絶対パスの解決
- [ ] ファイル存在チェック
- [ ] ファイルキャッシュ機能
- [ ] 外部ファイル参照のテスト


### 2.3 循環参照検出

```typescript
// template-processor.ts内に追加
private detectCircularReference(templateId: string, visited: Set<string>): boolean
```

**タスク:**

- [ ] 循環参照検出アルゴリズムの実装
- [ ] 訪問履歴管理
- [ ] 循環参照エラーの定義
- [ ] 循環参照テストケース


## Phase 3: 統合API拡張（優先度：中）

### 3.1 MdckParserクラスの拡張：テンプレート展開機能

```typescript
// src/index.ts の拡張
export class MdckParser {
  async expandTemplate(templateId: string): Promise<string>
  async lint(content: string, filePath?: string): Promise<LintResult[]>
  async loadConfig(configPath?: string): Promise<void>
}
```

**タスク:**

- [ ] `expandTemplate`メソッドの実装
- [ ] 基本的な`lint`メソッドの骨格実装
- [ ] 設定読み込み機能の追加
- [ ] 統合テストの拡張

**期待される結果:** テンプレート展開が動作する

### 3.2 設定管理：設定ファイル読み込み

```typescript
// 新規ファイル: src/shared/config-loader.ts
export class ConfigLoader {
  async loadConfig(configPath?: string): Promise<MdckConfig>
}
```

**タスク:**

- [ ] `ConfigLoader`クラスの実装
- [ ] YAML設定ファイルの読み込み
- [ ] デフォルト設定の定義
- [ ] 設定検証機能
- [ ] 設定関連テスト


## Phase 4: Linter機能（優先度：中）

### 4.1 ルールエンジンの基盤：ルールインターフェース定義

```typescript
// 新規ファイル: src/linter/rule-engine.ts
export class RuleEngine {
  async lint(tokens: Token[], filePath?: string): Promise<LintResult[]>
}
```

**タスク:**

- [ ] `RuleEngine`クラスの実装
- [ ] 基本的なルールインターフェース定義
- [ ] ルール登録・実行機能
- [ ] `LintResult`型の詳細定義


### 4.2 主要ルールの実装（段階的）

```typescript
// src/linter/rules/ 配下
// M002: Template id重複検出
// M003: Template未定義参照
// M010: itemId重複検出
```

**タスク:**

- [ ] 基本的なルール3-5個の実装
- [ ] ルールテストの作成
- [ ] エラーメッセージの日本語化
- [ ] 修正提案機能の基礎実装


## Phase 5: キャッシュ・ユーティリティ（優先度：低）

### 5.1 キャッシュ管理

```typescript
// 新規ファイル: src/cache/cache-manager.ts
export class CacheManager {
  async getCacheData(): Promise<CacheData>
  async refreshCache(): Promise<void>
}
```

**タスク:**

- [ ] `CacheManager`クラスの実装
- [ ] メタデータ抽出機能
- [ ] JSONキャッシュの読み書き
- [ ] キャッシュ無効化機能


## 開発指針

### テスト駆動開発

1. **Red**: 機能のテストを先に書く
2. **Green**: 最小限の実装でテストをPASS
3. **Refactor**: コードを改善

### 段階的リリース

- 各Phaseごとにテストが100%PASSする状態を維持
- 既存機能の回帰テストを常に実行
- 小さな単位で機能追加・テスト・統合


### 品質基準

- TypeScript型安全性の維持
- ESLintルールの遵守
- テストカバレッジ90%以上の維持
- パフォーマンス目標（15MB/s以上）の達成


### 優先順位の根拠

1. **Phase 1-2**: CLI/VSCode拡張から最も必要とされる機能
2. **Phase 3**: 統合APIの整備により他パッケージとの連携準備
3. **Phase 4**: Linter機能は重要だが、基本機能が安定してから
4. **Phase 5**: 最適化・便利機能は最後に実装

この計画により、常に動作するパーサーを維持しながら段階的に機能を拡張できます。
