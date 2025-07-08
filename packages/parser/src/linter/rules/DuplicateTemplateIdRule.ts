// src/linter/rules/DuplicateTemplateIdRule.ts
import type { LintContext, LintResult } from '../../shared/lint-types';
import { BaseLintRule } from './base-rule';

/**
 * M002: template id 重複定義チェック（前処理結果版）
 * 前処理で検出された重複情報を使用してエラーを報告
 */
export class DuplicateTemplateIdRule extends BaseLintRule {
  public readonly id = 'M002' as const;
  public readonly defaultSeverity = 'error' as const;
  public readonly description = 'Template id must be unique within project';

  public async check(context: LintContext): Promise<readonly LintResult[]> {
    const preprocessResult = this.getPreprocessResult(context);
    if (!preprocessResult) {
      // 前処理が利用できない場合は空の結果を返す
      return [];
    }

    const results: LintResult[] = [];

    // 前処理で検出された重複テンプレートを処理
    for (const duplicate of preprocessResult.duplicateTemplates) {
      // 複数の場所で定義されている場合、2番目以降をエラーとして報告
      const locations = duplicate.locations;

      for (let i = 1; i < locations.length; i++) {
        const location = locations[i];
        const firstLocation = locations[0];

        results.push(
          this.createResult(
            `Duplicate template definition: "${duplicate.templateId}"${
              firstLocation.filePath
                ? ` (first defined in ${this.normalizeFilePath(firstLocation.filePath)}:${firstLocation.line})`
                : ` (first defined at line ${firstLocation.line})`
            }`,
            location.line,
            undefined,
            false,
            {
              templateId: duplicate.templateId,
              duplicateLocation: firstLocation,
              allLocations: locations,
            }
          )
        );
      }
    }

    return results;
  }
}
