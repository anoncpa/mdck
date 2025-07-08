// packages/vscode-ext/src/providers/completion.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { MdckCompletionProvider } from './completion';

// VSCode APIのモック
vi.mock('vscode', () => ({
  workspace: {
    getWorkspaceFolder: vi.fn(),
  },
  CompletionItemKind: {
    Reference: 17,
    Keyword: 14,
  },
  CompletionItem: vi.fn().mockImplementation((label, kind) => ({
    label,
    kind,
    detail: undefined,
    documentation: undefined,
    insertText: undefined,
    sortText: undefined,
  })),
  MarkdownString: vi.fn().mockImplementation((value) => ({ value })),
  SnippetString: vi.fn().mockImplementation((value) => ({ value })),
  Position: vi.fn(),
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
          endLine: 5,
          dependencies: ['greeting'],
        }],
        ['greeting', {
          filePath: '/workspace/templates/greeting.md',
          startLine: 10,
          endLine: 15,
          dependencies: [],
        }],
      ]),
    }),
  })),
}));

describe('MdckCompletionProvider', () => {
  let provider: MdckCompletionProvider;
  let mockDocument: any;
  let mockPosition: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MdckCompletionProvider();
    
    mockDocument = {
      languageId: 'markdown',
      uri: { fsPath: '/workspace/test.md' },
      lineAt: vi.fn(),
    };

    mockPosition = {
      line: 0,
      character: 20,
    };

    // workspace.getWorkspaceFolderのモック
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue({
      uri: { fsPath: '/workspace' },
    } as any);
  });

  it('should create completion provider', () => {
    expect(provider).toBeDefined();
  });

  it('should provide template completions in template context', async () => {
    // ::template{id=" の後にカーソルがある状況をモック
    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="',
    });

    const completions = await provider.provideCompletionItems(
      mockDocument,
      mockPosition,
      {} as any,
      {} as any
    );

    expect(completions).toHaveLength(2);
    expect(vscode.CompletionItem).toHaveBeenCalledWith('hello-world', vscode.CompletionItemKind.Reference);
    expect(vscode.CompletionItem).toHaveBeenCalledWith('greeting', vscode.CompletionItemKind.Reference);
  });

  it('should provide directive completions in directive context', async () => {
    // :: の後にカーソルがある状況をモック
    mockDocument.lineAt.mockReturnValue({
      text: '::',
    });

    const completions = await provider.provideCompletionItems(
      mockDocument,
      mockPosition,
      {} as any,
      {} as any
    );

    expect(completions).toHaveLength(3);
    expect(vscode.CompletionItem).toHaveBeenCalledWith('template', vscode.CompletionItemKind.Keyword);
    expect(vscode.CompletionItem).toHaveBeenCalledWith('tag', vscode.CompletionItemKind.Keyword);
    expect(vscode.CompletionItem).toHaveBeenCalledWith('result', vscode.CompletionItemKind.Keyword);
  });

  it('should return empty array for non-markdown files', async () => {
    mockDocument.languageId = 'javascript';

    const completions = await provider.provideCompletionItems(
      mockDocument,
      mockPosition,
      {} as any,
      {} as any
    );

    expect(completions).toHaveLength(0);
  });

  it('should return empty array when not in completion context', async () => {
    // 通常のテキストの後にカーソルがある状況をモック
    mockDocument.lineAt.mockReturnValue({
      text: 'Normal text',
    });

    const completions = await provider.provideCompletionItems(
      mockDocument,
      mockPosition,
      {} as any,
      {} as any
    );

    expect(completions).toHaveLength(0);
  });

  it('should handle markdown-checklist language', async () => {
    mockDocument.languageId = 'markdown-checklist';
    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="',
    });

    const completions = await provider.provideCompletionItems(
      mockDocument,
      mockPosition,
      {} as any,
      {} as any
    );

    expect(completions).toHaveLength(2);
  });

  it('should handle cache errors gracefully', async () => {
    // 新しいプロバイダーを作成してエラーを発生させる
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // MdckParserのモックを一時的に変更
    const { MdckParser } = await import('@mdck/parser');
    const originalMock = vi.mocked(MdckParser);
    
    vi.mocked(MdckParser).mockImplementation(() => ({
      initializeCache: vi.fn(),
      getCacheData: vi.fn().mockRejectedValue(new Error('Cache error')),
    }) as any);

    const errorProvider = new MdckCompletionProvider();
    
    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="',
    });

    const completions = await errorProvider.provideCompletionItems(
      mockDocument,
      mockPosition,
      {} as any,
      {} as any
    );

    expect(completions).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to provide template completions:', expect.any(Error));
    
    // モックを元に戻す
    vi.mocked(MdckParser).mockImplementation(originalMock);
    consoleSpy.mockRestore();
  });
});