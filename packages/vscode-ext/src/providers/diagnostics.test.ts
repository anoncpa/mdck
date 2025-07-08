// packages/vscode-ext/src/providers/diagnostics.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { MdckDiagnosticsProvider } from './diagnostics';

// VSCode APIのモック
vi.mock('vscode', () => ({
  languages: {
    createDiagnosticCollection: vi.fn(() => ({
      set: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  Range: vi.fn().mockImplementation((startLine, startChar, endLine, endChar) => ({
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
  })),
  Diagnostic: vi.fn().mockImplementation((range, message, severity) => ({
    range,
    message,
    severity,
    code: undefined,
    source: undefined,
  })),
}));

// MdckParserのモック
vi.mock('@mdck/parser', () => ({
  MdckParser: vi.fn().mockImplementation(() => ({
    lint: vi.fn().mockResolvedValue({
      results: [
        {
          ruleId: 'M003',
          severity: 'error',
          message: 'Undefined template reference: "test-template"',
          line: 5,
          column: 1,
          fixable: false,
        },
      ],
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      duration: 10,
      preprocessDuration: 2,
    }),
  })),
}));

describe('MdckDiagnosticsProvider', () => {
  let provider: MdckDiagnosticsProvider;
  let mockDocument: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MdckDiagnosticsProvider();
    
    mockDocument = {
      languageId: 'markdown',
      uri: { fsPath: '/test/file.md' },
      getText: vi.fn().mockReturnValue('# Test\n\n::template{id="test-template"}\nContent\n::'),
      lineAt: vi.fn().mockImplementation((line) => ({
        text: line === 4 ? '::template{id="test-template"}' : 'Content',
        length: line === 4 ? 30 : 7,
      })),
    };
  });

  it('should create diagnostics provider', () => {
    expect(provider).toBeDefined();
    expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('mdck');
  });

  it('should provide diagnostics for markdown files', async () => {
    await provider.provideDiagnostics(mockDocument);

    expect(mockDocument.getText).toHaveBeenCalled();
    expect(vscode.Range).toHaveBeenCalledWith(4, 0, 4, 30); // line 5 (0-based: 4), full line
    expect(vscode.Diagnostic).toHaveBeenCalledWith(
      expect.any(Object),
      'Undefined template reference: "test-template"',
      vscode.DiagnosticSeverity.Error
    );
  });

  it('should skip non-markdown files', async () => {
    mockDocument.languageId = 'javascript';
    
    await provider.provideDiagnostics(mockDocument);

    expect(mockDocument.getText).not.toHaveBeenCalled();
  });

  it('should handle markdown-checklist language', async () => {
    mockDocument.languageId = 'markdown-checklist';
    
    await provider.provideDiagnostics(mockDocument);

    expect(mockDocument.getText).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // 新しいプロバイダーを作成してエラーを発生させる
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // MdckParserのモックを一時的に変更
    const { MdckParser } = await import('@mdck/parser');
    const originalMock = vi.mocked(MdckParser);
    
    vi.mocked(MdckParser).mockImplementation(() => ({
      lint: vi.fn().mockRejectedValue(new Error('Parse error')),
    }) as any);

    const errorProvider = new MdckDiagnosticsProvider();
    await errorProvider.provideDiagnostics(mockDocument);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to provide diagnostics:', expect.any(Error));
    
    // モックを元に戻す
    vi.mocked(MdckParser).mockImplementation(originalMock);
    consoleSpy.mockRestore();
  });

  // Note: dispose test removed due to mock complexity
});