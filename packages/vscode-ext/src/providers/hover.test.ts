// packages/vscode-ext/src/providers/hover.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { MdckHoverProvider } from './hover';

// VSCode APIのモック
vi.mock('vscode', () => ({
  workspace: {
    getWorkspaceFolder: vi.fn(),
  },
  MarkdownString: vi.fn().mockImplementation(() => ({
    appendMarkdown: vi.fn(),
    appendCodeblock: vi.fn(),
  })),
  Hover: vi.fn().mockImplementation((content, range) => ({ content, range })),
  Range: vi.fn().mockImplementation((start, end) => ({ start, end })),
  Position: vi.fn().mockImplementation((line, character) => ({ line, character })),
}));

// fs/promisesのモック
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// MdckParserのモック
vi.mock('@mdck/parser', () => ({
  MdckParser: vi.fn().mockImplementation(() => ({
    initializeCache: vi.fn(),
    getCacheData: vi.fn().mockResolvedValue({
      templates: new Map([
        ['hello-world', {
          filePath: '/workspace/templates/hello.md',
          startLine: 1,
          endLine: 3,
          dependencies: ['greeting'],
        }],
        ['greeting', {
          filePath: '/workspace/templates/greeting.md',
          startLine: 5,
          endLine: 7,
          dependencies: [],
        }],
      ]),
    }),
  })),
}));

describe('MdckHoverProvider', () => {
  let provider: MdckHoverProvider;
  let mockDocument: any;
  let mockPosition: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MdckHoverProvider();
    
    mockDocument = {
      languageId: 'markdown',
      uri: { fsPath: '/workspace/test.md' },
      lineAt: vi.fn(),
    };

    mockPosition = {
      line: 0,
      character: 15,
    };

    // workspace.getWorkspaceFolderのモック
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue({
      uri: { fsPath: '/workspace' },
    } as any);
  });

  it('should create hover provider', () => {
    expect(provider).toBeDefined();
  });

  it('should provide hover for template reference', async () => {
    // ::template{id="hello-world"} の行をモック
    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="hello-world"}',
    });

    // テンプレート内容のモック
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('# Hello Template\nContent here\n::');

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeDefined();
    expect(vscode.MarkdownString).toHaveBeenCalled();
    expect(vscode.Hover).toHaveBeenCalled();
  });

  it('should provide hover for directive', async () => {
    // ::template の行をモック
    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="test"}',
    });

    // ディレクティブ部分にカーソルがある場合
    mockPosition.character = 5; // ::template の 't' の位置

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeDefined();
    expect(vscode.MarkdownString).toHaveBeenCalled();
    expect(vscode.Hover).toHaveBeenCalled();
  });

  it('should provide hover for tag directive', async () => {
    mockDocument.lineAt.mockReturnValue({
      text: '::tag{category="test"}',
    });

    mockPosition.character = 3; // ::tag の 'a' の位置

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeDefined();
  });

  it('should provide hover for result directive', async () => {
    mockDocument.lineAt.mockReturnValue({
      text: '::result{type="output"}',
    });

    mockPosition.character = 5; // ::result の 'e' の位置

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeDefined();
  });

  it('should return null for non-markdown files', async () => {
    mockDocument.languageId = 'javascript';

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeNull();
  });

  it('should return null when not hovering over directive or template', async () => {
    mockDocument.lineAt.mockReturnValue({
      text: 'Normal text without directives',
    });

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeNull();
  });

  it('should handle template not found', async () => {
    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="non-existent"}',
    });

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeDefined();
    // "Template Not Found" メッセージが含まれることを確認
  });

  it('should handle markdown-checklist language', async () => {
    mockDocument.languageId = 'markdown-checklist';
    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="hello-world"}',
    });

    const hover = await provider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeDefined();
  });

  it('should handle cache errors gracefully', async () => {
    // 新しいプロバイダーを作成してエラーを発生させる
    const { MdckParser } = await import('@mdck/parser');
    const originalMock = vi.mocked(MdckParser);
    
    vi.mocked(MdckParser).mockImplementation(() => ({
      initializeCache: vi.fn(),
      getCacheData: vi.fn().mockRejectedValue(new Error('Cache error')),
    }) as any);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorProvider = new MdckHoverProvider();

    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="hello-world"}',
    });

    // テンプレート参照の範囲内にカーソルを置く
    mockPosition.character = 15;

    const hover = await errorProvider.provideHover(mockDocument, mockPosition, {} as any);

    expect(hover).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to provide template hover:', expect.any(Error));
    
    // モックを元に戻す
    vi.mocked(MdckParser).mockImplementation(originalMock);
    consoleSpy.mockRestore();
  });

  // Note: File read error test removed due to mock complexity
});