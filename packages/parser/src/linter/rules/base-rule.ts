// src/linter/rules/base-rule.ts
import type {
  LintContext,
  LintResult,
  LintRule,
  LintRuleId,
  LintSeverity,
} from '../../shared/lint-types';
import type { LintPreprocessResult } from '../../shared/lint-preprocessor-types';

/**
 * 改善された全Lintルールの基底クラス
 * 前処理結果への安全なアクセスと共通ユーティリティを提供
 */
export abstract class BaseLintRule implements LintRule {
  public abstract readonly id: LintRuleId;
  public abstract readonly defaultSeverity: LintSeverity;
  public abstract readonly description: string;

  /**
   * Lintルールの実行（子クラスでオーバーライド）
   * @param context - 前処理結果を含むLint実行コンテキスト
   * @returns 発見された問題のリスト
   */
  public abstract check(context: LintContext): Promise<readonly LintResult[]>;

  /**
   * LintResult作成のヘルパーメソッド
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
   * 前処理結果への安全なアクセス
   * 前処理が実行されていない場合の安全な処理
   */
  protected getPreprocessResult(
    context: LintContext
  ): LintPreprocessResult | null {
    return context.preprocessResult || null;
  }

  /**
   * 前処理結果が利用可能かチェック
   */
  protected hasPreprocessResult(context: LintContext): boolean {
    return context.preprocessResult !== undefined;
  }

  /**
   * ファイルパスの正規化
   */
  protected normalizeFilePath(filePath?: string): string {
    if (!filePath) return '<unknown>';
    return filePath.replace(process.cwd(), '.');
  }
}
