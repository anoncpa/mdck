// src/linter/rule-engine.ts
import type {
  LintConfig,
  LintContext,
  LintReport,
  LintResult,
  LintRule,
  LintRuleId,
} from '../shared/lint-types';
import {
  CircularReferenceRule,
  DuplicateTemplateIdRule,
  UndefinedTemplateReferenceRule,
} from './rules';

/**
 * Lintルールの実行エンジン
 * 複数のルールを統合し、設定に基づいて実行を制御する
 */
export class RuleEngine {
  private readonly rules: ReadonlyMap<LintRuleId, LintRule>;
  private config: LintConfig;

  constructor(config?: Partial<LintConfig>) {
    // Map作成を分離し、型安全性を確保
    const ruleMap = new Map<LintRuleId, LintRule>();
    ruleMap.set('M002', new DuplicateTemplateIdRule());
    ruleMap.set('M003', new UndefinedTemplateReferenceRule());
    ruleMap.set('M004', new CircularReferenceRule());

    this.rules = ruleMap;
    this.config = this.buildConfig(config);
  }

  public updateConfig(config: Partial<LintConfig>): void {
    this.config = this.buildConfig(config);
  }

  /**
   * 指定されたコンテキストに対してLintを実行
   * @param context - Lint実行コンテキスト
   * @returns Lint実行結果のレポート
   */
  public async lint(context: LintContext): Promise<LintReport> {
    const startTime = Date.now();
    const allResults: LintResult[] = [];

    // 有効なルールのみを実行
    const enabledRules = Array.from(this.rules.entries()).filter(([ruleId]) =>
      this.isRuleEnabled(ruleId)
    );

    // 各ルールを並列実行（独立性を保証）
    const rulePromises = enabledRules.map(async ([ruleId, rule]) => {
      try {
        const results = await rule.check(context);
        // 設定による重要度の上書きを適用
        return this.applySeverityOverrides(ruleId, results);
      } catch (error) {
        // ルール実行中のエラーをキャッチし、内部エラーとして記録
        console.warn(`Rule ${ruleId} failed:`, error);
        return [];
      }
    });

    const ruleResults = await Promise.all(rulePromises);
    allResults.push(...ruleResults.flat());

    const duration = Date.now() - startTime;

    // 結果の統計を計算
    const errorCount = allResults.filter((r) => r.severity === 'error').length;
    const warningCount = allResults.filter((r) => r.severity === 'warn').length;
    const infoCount = allResults.filter((r) => r.severity === 'info').length;

    return {
      filePath: context.filePath,
      results: allResults,
      errorCount,
      warningCount,
      infoCount,
      duration,
    };
  }

  /**
   * 利用可能なルールのリストを取得
   * @returns 登録されているすべてのルール
   */
  public getAvailableRules(): ReadonlyMap<LintRuleId, LintRule> {
    return this.rules;
  }

  /**
   * 設定の構築
   * デフォルト設定と指定された設定をマージ
   */
  private buildConfig(partialConfig?: Partial<LintConfig>): LintConfig {
    const defaultRules = new Map<
      LintRuleId,
      { enabled: boolean; severity?: undefined }
    >([
      ['M002', { enabled: true }],
      ['M003', { enabled: true }],
      ['M004', { enabled: true }],
    ]);

    const configRules = partialConfig?.rules || new Map();

    // デフォルトと指定設定をマージ
    const mergedRules = new Map(defaultRules);
    for (const [ruleId, ruleConfig] of configRules) {
      mergedRules.set(ruleId, {
        enabled: ruleConfig.enabled,
        severity: ruleConfig.severity,
      });
    }

    return {
      rules: mergedRules,
    };
  }

  /**
   * ルールが有効かどうかを判定
   */
  private isRuleEnabled(ruleId: LintRuleId): boolean {
    const ruleConfig = this.config.rules.get(ruleId);
    return ruleConfig?.enabled ?? false;
  }

  /**
   * 設定による重要度の上書きを適用
   */
  private applySeverityOverrides(
    ruleId: LintRuleId,
    results: readonly LintResult[]
  ): readonly LintResult[] {
    const ruleConfig = this.config.rules.get(ruleId);
    const overrideSeverity = ruleConfig?.severity;

    if (!overrideSeverity) {
      return results;
    }

    return results.map((result) => ({
      ...result,
      severity: overrideSeverity,
    }));
  }
}
