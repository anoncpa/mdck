// src/linter/rules/base-rule.ts
import type {
  LintContext,
  LintResult,
  LintRule,
  LintRuleId,
  LintSeverity,
} from '../../shared/lint-types';
import { Directive } from '../../shared/types';

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
   * null/undefinedを適切に処理
   */
  protected extractTemplateId(directive: Directive): string | null {
    if (!directive.attributes) return null;

    // 型安全な属性値取得
    const idValue = directive.attributes.id || directive.attributes['#id'];

    // null/undefinedチェック
    if (typeof idValue === 'string') {
      return idValue;
    }

    return null;
  }

  /**
   * 属性を安全にRecord<string, string>に変換
   */
  protected safeGetAttributes(directive: Directive): Record<string, string> {
    if (!directive.attributes) return {};

    const safeAttributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(directive.attributes)) {
      if (typeof value === 'string') {
        safeAttributes[key] = value;
      }
    }
    return safeAttributes;
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
