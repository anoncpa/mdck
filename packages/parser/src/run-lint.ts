// src/run-lint.ts
import { MdckParser } from './index';

// Lint確認用のテストケース
const testCases = {
  // M002: 重複テンプレートID
  duplicateTemplate: `# 重複テンプレートIDテスト

:::template{id="duplicate"}
# 最初のテンプレート
- [ ] タスク1
:::

:::template{id="duplicate"}
# 重複したテンプレート
- [ ] タスク2
:::`,

  // M003: 未定義テンプレート参照
  undefinedReference: `# 未定義テンプレート参照テスト

:::template{id="main"}
# メインテンプレート
::template{id="undefined-template"}
:::`,

  // M004: 循環参照
  circularReference: `# 循環参照テスト

:::template{id="a"}
# テンプレートA
::template{id="b"}
:::

:::template{id="b"}
# テンプレートB
::template{id="c"}
:::

:::template{id="c"}
# テンプレートC
::template{id="a"}
:::`,

  // 正常なケース
  validTemplate: `# 正常なテンプレート

:::template{id="parent"}
# 親テンプレート
::template{id="child"}
:::

:::template{id="child"}
# 子テンプレート
- [ ] 子のタスク
:::`,

  // 複合エラーケース
  multipleErrors: `# 複数エラーケース

:::template{id="duplicate"}
# 重複1
:::

:::template{id="duplicate"}
# 重複2
:::

:::template{id="main"}
# メイン
::template{id="missing"}
::template{id="circular1"}
:::

:::template{id="circular1"}
# 循環1
::template{id="circular2"}
:::

:::template{id="circular2"}
# 循環2
::template{id="circular1"}
:::`,
};

// 結果フォーマッター（シンプル版）
class LintResultFormatter {
  formatReport(testName: string, report: any): void {
    console.log(`\n=== ${testName} ===`);

    if (report.errorCount === 0 && report.warningCount === 0) {
      console.log('No issues found');
      return;
    }

    console.log(`Duration: ${report.duration}ms`);
    console.log(`Errors: ${report.errorCount}`);
    console.log(`Warnings: ${report.warningCount}`);
    console.log(`Info: ${report.infoCount}`);

    report.results.forEach((result: any) => {
      const icon = this.getSeverityIcon(result.severity);

      console.log(
        `${icon} [${result.ruleId}] Line ${result.line}: ${result.message}`
      );

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error':
        return 'ERROR';
      case 'warn':
        return 'WARN ';
      case 'info':
        return 'INFO ';
      default:
        return 'UNKNOWN';
    }
  }
}

// メイン実行関数
async function runLintTests(): Promise<void> {
  console.log('mdck Lint Engine Test');
  console.log('Testing various lint rules (M002, M003, M004)');

  const parser = new MdckParser();
  const formatter = new LintResultFormatter();

  // 各テストケースを実行
  for (const [testName, content] of Object.entries(testCases)) {
    try {
      const report = await parser.lint(content, `test-${testName}.md`);
      formatter.formatReport(testName, report);
    } catch (error) {
      console.log(`Test "${testName}" failed:`);
      console.log(error instanceof Error ? error.message : String(error));
    }
  }

  // 設定カスタマイズテスト
  console.log('\n=== 設定カスタマイズテスト ===');

  // M002をwarningに変更
  parser.updateLintConfig({
    rules: new Map([
      ['M002', { enabled: true, severity: 'warn' }],
      ['M003', { enabled: true, severity: 'error' }],
      ['M004', { enabled: false }], // M004を無効化
    ]),
  });

  const customReport = await parser.lint(
    testCases.duplicateTemplate,
    'custom-test.md'
  );
  formatter.formatReport(
    'Custom Config (M002=warn, M004=disabled)',
    customReport
  );

  // 全ルール無効化テスト
  parser.updateLintConfig({
    rules: new Map([
      ['M002', { enabled: false }],
      ['M003', { enabled: false }],
      ['M004', { enabled: false }],
    ]),
  });

  const disabledReport = await parser.lint(
    testCases.multipleErrors,
    'disabled-test.md'
  );
  formatter.formatReport('All Rules Disabled', disabledReport);

  console.log('\nLint test completed');
}

// スクリプト実行
if (require.main === module) {
  runLintTests().catch((error) => {
    console.error('Lint test failed:', error);
    process.exit(1);
  });
}

export { runLintTests };
