// src/linter/rules/base-rule.ts
import type {
  LintRule,
  LintRuleId,
  LintSeverity,
  LintContext,
  LintResult,
} from '../../shared/lint-types';

/**
 * 全Lintルールの基底クラス
 * 共通処理と型安全性を提供し、具体的なルールは検証ロジックに集中できる
 */
export abstract class BaseLintRule implements LintRule {
  public abstract readonly id: LintRuleId;
  public abstract readonly defaultSeverity: LintSeverity;
  public abstract readonly description: string;

  /**
   * Lintルールの実行（子クラスでオーバーライド）
   * @param context - Lint実行コンテキスト
   * @returns 発見された問題のリスト
   */
  public abstract check(context: LintContext): Promise<readonly LintResult[]>;

  /**
   * LintResult作成のヘルパーメソッド
   * 型安全性を保ちつつ、共通フィールドの設定を簡素化
   */
  protected createResult(
    message: string,
    line: number,
    column?: number,
    fixable: boolean = false,
    details?: Record<string, unknown>
  ): LintResult {
    return {
      ruleId: this.id,
      severity: this.defaultSeverity,
      message,
      line,
      column,
      fixable,
      details,
    };
  }

  /**
   * ディレクティブからテンプレートIDを安全に抽出
   * 既存のディレクティブ処理ロジックと統一性を保つ
   */
  protected extractTemplateId(directive: {
    attributes?: Record<string, string> | null;
  }): string | null {
    if (!directive.attributes) return null;

    // id属性と#id属性の両方をサポート（既存コードとの整合性）
    return directive.attributes.id || directive.attributes['#id'] || null;
  }

  /**
   * ファイルパスの正規化
   * 相対パスを扱いやすい形式に変換
   */
  protected normalizeFilePath(filePath?: string): string {
    if (!filePath) return '<unknown>';
    return filePath.replace(process.cwd(), '.');
  }
}
