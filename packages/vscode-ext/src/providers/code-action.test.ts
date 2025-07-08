// packages/vscode-ext/src/providers/code-action.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { MdckCodeActionProvider } from './code-action';

// VSCode APIのモック
vi.mock('vscode', () => ({
  workspace: {
    getWorkspaceFolder: vi.fn(),
  },
  CodeActionKind: {
    QuickFix: 'quickfix',
    Refactor: 'refactor',
    SourceAction: 'source',
  },
  CodeAction: vi.fn().mockImplementation((title, kind) => ({
    title,
    kind,
    edit: undefined,
    diagnostics: undefined,
  })),
  WorkspaceEdit: vi.fn().mockImplementation(() => ({
    insert: vi.fn(),
    replace: vi.fn(),
    delete: vi.fn(),
  })),
  Position: vi.fn().mockImplementation((line, character) => ({ line, character })),
  Range: vi.fn().mockImplementation((start, end) => ({ start, end })),
}));

// MdckParserのモック
vi.mock('@mdck/parser', () => ({
  MdckParser: vi.fn().mockImplementation(() => ({
    initializeCache: vi.fn(),
    getCacheData: vi.fn().mockResolvedValue({
      templates: new Map([
        ['existing-template', {
          filePath: '/workspace/templates/existing.md',
          startLine: 1,
          endLine: 3,
          dependencies: [],
        }],
      ]),
    }),
  })),
}));

describe('MdckCodeActionProvider', () => {
  let provider: MdckCodeActionProvider;
  let mockDocument: any;
  let mockRange: any;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MdckCodeActionProvider();
    
    mockDocument = {
      languageId: 'markdown',
      uri: { fsPath: '/workspace/test.md' },
      lineAt: vi.fn().mockReturnValue({ text: 'mock line text' }),
      lineCount: 10,
      getText: vi.fn().mockReturnValue(''),
    };

    mockRange = {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 20 },
    };

    mockContext = {
      diagnostics: [],
    };

    // workspace.getWorkspaceFolderのモック
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue({
      uri: { fsPath: '/workspace' },
    } as any);
  });

  it('should create code action provider', () => {
    expect(provider).toBeDefined();
  });

  it('should return empty array for non-markdown files', async () => {
    mockDocument.languageId = 'javascript';

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    expect(actions).toHaveLength(0);
  });

  it('should provide quick fix for undefined template reference', async () => {
    const diagnostic = {
      source: 'mdck',
      code: 'M003',
      range: mockRange,
      message: 'Undefined template reference: "test-template"',
    };
    mockContext.diagnostics = [diagnostic];

    mockDocument.lineAt.mockReturnValue({
      text: '::template{id="test-template"}',
    });

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    expect(actions.length).toBeGreaterThan(0);
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Create template "test-template"',
      vscode.CodeActionKind.QuickFix
    );
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Remove template reference "test-template"',
      vscode.CodeActionKind.QuickFix
    );
  });

  it('should provide quick fix for duplicate template', async () => {
    const diagnostic = {
      source: 'mdck',
      code: 'M002',
      range: mockRange,
      message: 'Duplicate template ID: "duplicate-template"',
    };
    mockContext.diagnostics = [diagnostic];

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    expect(actions.length).toBeGreaterThan(0);
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Remove duplicate template definition',
      vscode.CodeActionKind.QuickFix
    );
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Rename template ID',
      vscode.CodeActionKind.QuickFix
    );
  });

  it('should provide quick fix for circular reference', async () => {
    const diagnostic = {
      source: 'mdck',
      code: 'M004',
      range: mockRange,
      message: 'Circular reference detected',
    };
    mockContext.diagnostics = [diagnostic];

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    expect(actions.length).toBeGreaterThan(0);
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Remove circular reference',
      vscode.CodeActionKind.QuickFix
    );
  });

  it('should provide refactor actions for selected text', async () => {
    mockDocument.getText.mockReturnValue('Selected content');

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    expect(actions.length).toBeGreaterThan(0);
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Extract to template',
      vscode.CodeActionKind.Refactor
    );
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Wrap with tag',
      vscode.CodeActionKind.Refactor
    );
  });

  it('should provide format action', async () => {
    mockDocument.getText.mockReturnValue('');

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    expect(actions.length).toBeGreaterThan(0);
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Format mdck directives',
      vscode.CodeActionKind.Source
    );
  });

  it('should handle markdown-checklist language', async () => {
    mockDocument.languageId = 'markdown-checklist';
    mockDocument.getText.mockReturnValue('');

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    expect(actions.length).toBeGreaterThan(0);
  });

  it('should ignore non-mdck diagnostics', async () => {
    const diagnostic = {
      source: 'other-linter',
      code: 'OTHER001',
      range: mockRange,
      message: 'Other error',
    };
    mockContext.diagnostics = [diagnostic];

    const actions = await provider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    // フォーマットアクションのみ提供される
    expect(actions.length).toBe(1);
    expect(vscode.CodeAction).toHaveBeenCalledWith(
      'Format mdck directives',
      vscode.CodeActionKind.Source
    );
  });

  it('should handle cache errors gracefully', async () => {
    const { MdckParser } = await import('@mdck/parser');
    const originalMock = vi.mocked(MdckParser);
    
    vi.mocked(MdckParser).mockImplementation(() => ({
      initializeCache: vi.fn(),
      getCacheData: vi.fn().mockRejectedValue(new Error('Cache error')),
    }) as any);

    const errorProvider = new MdckCodeActionProvider();
    mockDocument.getText.mockReturnValue('Selected content');

    const actions = await errorProvider.provideCodeActions(
      mockDocument,
      mockRange,
      mockContext,
      {} as any
    );

    // エラーが発生してもアクションは提供される
    expect(actions.length).toBeGreaterThan(0);
    
    // モックを元に戻す
    vi.mocked(MdckParser).mockImplementation(originalMock);
  });
});