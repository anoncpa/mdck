// packages/vscode-ext/src/extension.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate, deactivate } from './extension';

// VSCode APIのモック
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  },
  window: {
    showInformationMessage: vi.fn(),
  },
  workspace: {
    onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    textDocuments: [],
  },
  languages: {
    createDiagnosticCollection: vi.fn(() => ({
      set: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    })),
    registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerCodeActionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  Range: vi.fn(),
  Diagnostic: vi.fn(),
  CompletionItemKind: {
    Reference: 17,
    Keyword: 14,
  },
  CompletionItem: vi.fn(),
  MarkdownString: vi.fn(),
  SnippetString: vi.fn(),
  CodeActionKind: {
    QuickFix: 'quickfix',
    Refactor: 'refactor',
    SourceAction: 'source',
  },
  CodeAction: vi.fn(),
  WorkspaceEdit: vi.fn(),
}));

// MdckParserのモック
vi.mock('@mdck/parser', () => ({
  MdckParser: vi.fn().mockImplementation(() => ({
    parse: vi.fn().mockReturnValue({ ast: {}, directives: [] }),
  })),
}));

describe('Extension', () => {
  it('should activate without errors', () => {
    const mockContext = {
      subscriptions: [],
    } as any;

    expect(() => activate(mockContext)).not.toThrow();
    expect(mockContext.subscriptions).toHaveLength(7); // helloWorldCommand, onDidChangeTextDocument, onDidOpenTextDocument, diagnosticsProvider, completionRegistration, hoverRegistration, codeActionRegistration
  });

  it('should register hello world command', () => {
    const mockContext = {
      subscriptions: [],
    } as any;

    activate(mockContext);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'mdck.helloWorld',
      expect.any(Function)
    );
  });

  it('should deactivate without errors', () => {
    expect(() => deactivate()).not.toThrow();
  });
});