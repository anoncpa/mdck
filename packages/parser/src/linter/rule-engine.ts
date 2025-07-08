// src/linter/rule-engine.ts
import type {
  LintConfig,
  LintContext,
  LintReport,
  LintResult,
  LintRule,
  LintRuleId,
} from '../shared/lint-types';
import { LintPreprocessor } from './preprocessor';
import {
  CircularReferenceRule,
  DuplicateTemplateIdRule,
  UndefinedTemplateReferenceRule,
} from './rules';

/**
 * 改善されたLintルール実行エンジン
 * 前処理による情報共有でルール間の依存関係を排除し、並列実行を実現
 */
export class RuleEngine {
  private readonly rules: ReadonlyMap<LintRuleId, LintRule>;
  private readonly preprocessor: LintPreprocessor;
  private config: LintConfig;

  constructor(config?: Partial<LintConfig>) {
    // ルールマップの初期化
    const ruleMap = new Map<LintRuleId, LintRule>();
    ruleMap.set('M002', new DuplicateTemplateIdRule());
    ruleMap.set('M003', new UndefinedTemplateReferenceRule());
    ruleMap.set('M004', new CircularReferenceRule());

    this.rules = ruleMap;
    this.preprocessor = new LintPreprocessor();
    this.config = this.buildConfig(config);
  }

  public updateConfig(config: Partial<LintConfig>): void {
    this.config = this.buildConfig(config);
  }

  /**
   * 指定されたコンテキストに対してLintを実行
   * 前処理 → ルール並列実行 → 結果統合の流れで処理
   */
  public async lint(context: LintContext): Promise<LintReport> {
    const startTime = Date.now();

    // 1. 前処理の実行
    const preprocessResult = await this.preprocessor.analyze(context);

    // 2. 前処理結果を含む拡張コンテキストを作成
    const enhancedContext: LintContext = {
      ...context,
      preprocessResult,
    };

    // 3. 有効なルールを取得
    const enabledRules = Array.from(this.rules.entries()).filter(([ruleId]) =>
      this.isRuleEnabled(ruleId)
    );

    // 4. ルールを並列実行（前処理により完全に独立）
    const rulePromises = enabledRules.map(async ([ruleId, rule]) => {
      try {
        const results = await rule.check(enhancedContext);
        return this.applySeverityOverrides(ruleId, results);
      } catch (error) {
        console.warn(`Rule ${ruleId} failed:`, error);
        return [];
      }
    });

    const ruleResults = await Promise.all(rulePromises);
    const allResults: LintResult[] = ruleResults.flat();

    const duration = Date.now() - startTime;

    // 5. 結果の統計を計算
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
      preprocessDuration: preprocessResult.preprocessDuration,
    };
  }

  /**
   * 利用可能なルールのリストを取得
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
