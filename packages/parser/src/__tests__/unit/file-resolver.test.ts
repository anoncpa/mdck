// src/__tests__/unit/file-resolver.test.ts
import { access, readFile } from 'fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileResolver } from '../../core/file-resolver';

// fs/promisesをモック化
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

const mockAccess = vi.mocked(access);
const mockReadFile = vi.mocked(readFile);

describe('FileResolver', () => {
  let resolver: FileResolver;

  beforeEach(() => {
    resolver = new FileResolver();
    resolver.clearCache();
    vi.clearAllMocks();
  });

  describe('resolveFile', () => {
    it('存在するファイルを正常に解決できる', async () => {
      const testContent = `
:::template{id="test"}
# Test Template
- [ ] Test item
:::
      `;

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(testContent);

      const result = await resolver.resolveFile('./test.md', '/base/path.md');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.resolvedPath).toContain('test.md');
        expect(result.ast.type).toBe('root');
        expect(result.ast.children.length).toBeGreaterThan(0);
      }
    });

    it('存在しないファイルでエラーになる', async () => {
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await resolver.resolveFile('./nonexistent.md');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.errorType).toBe('not-found');
        expect(result.message).toContain('File not found');
      }
    });

    it('絶対パスを正しく処理できる', async () => {
      const testContent = '# Test';
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(testContent);

      const result = await resolver.resolveFile('/absolute/path/test.md');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.resolvedPath).toBe('/absolute/path/test.md');
      }
    });

    it('キャッシュが正常に動作する', async () => {
      const testContent = '# Test';
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(testContent);

      // 初回呼び出し
      const result1 = await resolver.resolveFile('./test.md');
      expect(result1.status).toBe('success');

      // 2回目の呼び出し（キャッシュから取得）
      const result2 = await resolver.resolveFile('./test.md');
      expect(result2.status).toBe('success');

      // readFileは1回だけ呼ばれる
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('ファイル権限エラーを適切に処理する', async () => {
      // accessは成功するがreadFileで権限エラーが発生するケース
      mockAccess.mockResolvedValue(undefined);

      // Node.jsエラーオブジェクトとして正しく型付け
      const permissionError = new Error(
        'EACCES: permission denied'
      ) as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';
      mockReadFile.mockRejectedValue(permissionError);

      const result = await resolver.resolveFile('./protected.md');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.errorType).toBe('access-denied');
      }
    });
  });

  describe('clearCache', () => {
    it('キャッシュを正常にクリアできる', async () => {
      const testContent = '# Test';
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(testContent);

      // ファイルを読み込んでキャッシュに保存
      await resolver.resolveFile('./test.md');
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // キャッシュクリア
      resolver.clearCache();

      // 再度読み込み（キャッシュがクリアされているため再読み込み）
      await resolver.resolveFile('./test.md');
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });
});
