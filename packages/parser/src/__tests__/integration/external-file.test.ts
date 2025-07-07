// src/__tests__/integration/external-file.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';
import { MdckParser } from '../../index';

describe('External File Integration', () => {
  let parser: MdckParser;
  const testDir = path.join(__dirname, '../fixtures/external-test');

  beforeEach(async () => {
    parser = new MdckParser();
    parser.clearFileCache();

    // テスト用ディレクトリを作成
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
    await mkdir(testDir, { recursive: true });
  });

  it('外部ファイル参照を含むテンプレート展開ができる', async () => {
    // 外部ファイルを作成
    const externalContent = `
::template{id="external"}
# External Template
- [ ] External task
::
    `;

    const mainContent = `
::template{id="main"}
# Main Template
::template{id="external" src="./external.md"}
::
    `;

    const externalPath = path.join(testDir, 'external.md');
    const mainPath = path.join(testDir, 'main.md');

    await writeFile(externalPath, externalContent);
    await writeFile(mainPath, mainContent);

    const result = await parser.expandTemplate(mainContent, 'main', mainPath);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.usedDefinitions.size).toBe(2);
      expect(result.usedDefinitions.has('main')).toBe(true);
      expect(result.usedDefinitions.has('external')).toBe(true);

      // 展開されたASTに外部ファイルの内容が含まれているか確認
      const stringified = parser.stringify(result.expandedAst);
      expect(stringified).toContain('Main Template');
      expect(stringified).toContain('External task');
    }
  });

  it('存在しない外部ファイルでエラーになる', async () => {
    const mainContent = `
::template{id="main"}
# Main Template
::template{id="missing" src="./missing.md"}
::
    `;

    const result = await parser.expandTemplate(mainContent, 'main');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('Failed to resolve external file');
    }
  });

  it('ネストした外部ファイル参照を処理できる', async () => {
    // level2.md
    const level2Content = `
::template{id="level2"}
# Level 2 Template
- [ ] Level 2 task
::
    `;

    // level1.md
    const level1Content = `
::template{id="level1"}
# Level 1 Template
::template{id="level2" src="./level2.md"}
::
    `;

    // main.md
    const mainContent = `
::template{id="main"}
# Main Template
::template{id="level1" src="./level1.md"}
::
    `;

    const level2Path = path.join(testDir, 'level2.md');
    const level1Path = path.join(testDir, 'level1.md');
    const mainPath = path.join(testDir, 'main.md');

    await writeFile(level2Path, level2Content);
    await writeFile(level1Path, level1Content);
    await writeFile(mainPath, mainContent);

    const result = await parser.expandTemplate(mainContent, 'main', mainPath);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.usedDefinitions.size).toBe(3);
      expect(result.usedDefinitions.has('main')).toBe(true);
      expect(result.usedDefinitions.has('level1')).toBe(true);
      expect(result.usedDefinitions.has('level2')).toBe(true);
    }
  });

  it('外部ファイル間でのテンプレートID重複を検出できる', async () => {
    // external1.md
    const external1Content = `
::template{id="duplicate"}
# External 1 Template
::
    `;

    // external2.md
    const external2Content = `
::template{id="duplicate"}
# External 2 Template
::
    `;

    // main.md - 修正：mainテンプレートに他のIDを含める必要がある
    const mainContent = `
::template{id="main"}
# Main Template
::template{id="duplicate" src="./external1.md"}
::template{id="other" src="./external2.md"}
::
    `;

    const external1Path = path.join(testDir, 'external1.md');
    const external2Path = path.join(testDir, 'external2.md');
    const mainPath = path.join(testDir, 'main.md');

    await writeFile(external1Path, external1Content);
    await writeFile(external2Path, external2Content);
    await writeFile(mainPath, mainContent);

    const result = await parser.expandTemplate(mainContent, 'main', mainPath);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('Duplicate template definition');
    }
  });
});
