// src/__tests__/unit/rule-engine.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { processor } from '../../core/processor';
import { RuleEngine } from '../../linter/rule-engine';
import type { Root, LintContext } from '../../shared/types';

describe('改善されたRuleEngine', () => {
  let ruleEngine: RuleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  describe('前処理統合Lint', () => {
    it('問題がないMarkdownでは空の結果を返す', async () => {
      const markdown = `
:::template{id="valid"}
# Valid Template
- [ ] Valid task
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const context: LintContext = { ast };

      const report = await ruleEngine.lint(context);

      expect(report.results).toHaveLength(0);
      expect(report.errorCount).toBe(0);
      expect(report.warningCount).toBe(0);
      expect(report.infoCount).toBe(0);
      expect(report.preprocessDuration).toBeGreaterThanOrEqual(0);
    });

    it('M002: 重複するテンプレートIDを検出する', async () => {
      const markdown = `
:::template{id="duplicate"}
# First Template
:::

:::template{id="duplicate"}
# Second Template
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const context: LintContext = { ast };

      const report = await ruleEngine.lint(context);

      expect(report.errorCount).toBe(1);
      const error = report.results[0];
      expect(error.ruleId).toBe('M002');
      expect(error.severity).toBe('error');
      expect(error.message).toContain(
        'Duplicate template definition: "duplicate"'
      );
    });

    it('M003: 未定義テンプレート参照を検出する', async () => {
      const markdown = `
:::template{id="main"}
# Main Template
::template{id="undefined"}
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const context: LintContext = { ast };

      const report = await ruleEngine.lint(context);

      expect(report.errorCount).toBe(1);
      const error = report.results[0];
      expect(error.ruleId).toBe('M003');
      expect(error.severity).toBe('error');
      expect(error.message).toContain(
        'Undefined template reference: "undefined"'
      );
    });

    it('M004: 循環参照を検出する', async () => {
      const markdown = `
:::template{id="a"}
# Template A
::template{id="b"}
:::

:::template{id="b"}
# Template B
::template{id="a"}
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const context: LintContext = { ast };

      const report = await ruleEngine.lint(context);

      expect(report.errorCount).toBe(1);
      const error = report.results[0];
      expect(error.ruleId).toBe('M004');
      expect(error.severity).toBe('error');
      expect(error.message).toContain('Circular reference detected');
    });

    it('前処理時間とLint時間を区別して記録する', async () => {
      const markdown = '# Simple content';
      const ast = processor.parse(markdown) as Root;
      const context: LintContext = { ast };

      const report = await ruleEngine.lint(context);

      expect(report.duration).toBeGreaterThanOrEqual(0);
      expect(report.preprocessDuration).toBeGreaterThanOrEqual(0);
      expect(typeof report.duration).toBe('number');
      expect(typeof report.preprocessDuration).toBe('number');
    });
  });

  describe('並列実行とルール独立性', () => {
    it('複数のエラーを並列検出できる', async () => {
      const markdown = `
:::template{id="duplicate"}
# Duplicate 1
:::

:::template{id="duplicate"}
# Duplicate 2
:::

:::template{id="main"}
# Main Template
::template{id="undefined"}
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const context: LintContext = { ast };

      const report = await ruleEngine.lint(context);

      expect(report.errorCount).toBe(2); // M002 + M003

      const ruleIds = report.results.map((r) => r.ruleId);
      expect(ruleIds).toContain('M002');
      expect(ruleIds).toContain('M003');
    });

    it('ルール設定によるカスタマイズが正常に動作する', async () => {
      const customEngine = new RuleEngine({
        rules: new Map([
          ['M002', { enabled: true, severity: 'warn' }],
          ['M003', { enabled: false }],
          ['M004', { enabled: true }],
        ]),
      });

      const markdown = `
:::template{id="duplicate"}
# First Template
:::

:::template{id="duplicate"}
# Second Template
:::

:::template{id="main"}
# Main Template
::template{id="undefined"}
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const context: LintContext = { ast };

      const report = await customEngine.lint(context);

      // M002は警告として検出、M003は無効化されているため検出されない
      expect(report.warningCount).toBe(1);
      expect(report.errorCount).toBe(0);
      expect(report.results[0].ruleId).toBe('M002');
      expect(report.results[0].severity).toBe('warn');
    });
  });
});
