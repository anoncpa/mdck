# mdck VSCode Extension API Documentation

This document describes the internal API and architecture of the mdck VSCode Extension.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Provider APIs](#provider-apis)
- [Core Interfaces](#core-interfaces)
- [Extension Points](#extension-points)
- [Testing Framework](#testing-framework)

## 🏗️ Architecture Overview

The mdck VSCode Extension follows a modular provider-based architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension Host                    │
├─────────────────────────────────────────────────────────────┤
│                     extension.ts                           │
│                  (Main Entry Point)                        │
├─────────────────────────────────────────────────────────────┤
│  DiagnosticsProvider │ CompletionProvider │ HoverProvider   │
│                      │                    │                 │
│  CodeActionProvider  │    @mdck/parser    │   Utilities     │
├─────────────────────────────────────────────────────────────┤
│                    Language Features                        │
│  • Error Detection   • Auto-completion   • Hover Info      │
│  • Quick Fixes      • Refactoring       • Code Actions    │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Extension Entry Point** (`extension.ts`)
   - Manages extension lifecycle
   - Registers language providers
   - Handles resource disposal

2. **Language Providers** (`providers/`)
   - Implement VSCode language features
   - Integrate with @mdck/parser
   - Provide user-facing functionality

3. **Parser Integration**
   - Leverages @mdck/parser for core functionality
   - Handles template parsing and validation
   - Manages cache operations

## 🔌 Provider APIs

### DiagnosticsProvider

Provides real-time error detection and validation.

```typescript
class MdckDiagnosticsProvider {
  /**
   * Analyze document and provide diagnostics
   */
  async provideDiagnostics(document: vscode.TextDocument): Promise<void>

  /**
   * Convert parser lint results to VSCode diagnostics
   */
  private convertLintResultsToDiagnostics(
    lintReport: LintReport,
    document: vscode.TextDocument
  ): vscode.Diagnostic[]

  /**
   * Convert lint severity to VSCode diagnostic severity
   */
  private convertSeverity(severity: 'error' | 'warn' | 'info'): vscode.DiagnosticSeverity
}
```

**Usage Example:**
```typescript
const diagnosticsProvider = new MdckDiagnosticsProvider();
await diagnosticsProvider.provideDiagnostics(document);
```

### CompletionProvider

Provides intelligent auto-completion for templates and directives.

```typescript
class MdckCompletionProvider implements vscode.CompletionItemProvider {
  /**
   * Provide completion items based on context
   */
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]>

  /**
   * Check if cursor is in template reference context
   */
  private isTemplateReferenceContext(beforeCursor: string): boolean

  /**
   * Check if cursor is in directive context
   */
  private isDirectiveContext(beforeCursor: string): boolean

  /**
   * Generate template completion items from cache
   */
  private async provideTemplateCompletions(
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]>

  /**
   * Generate directive completion items
   */
  private provideDirectiveCompletions(): vscode.CompletionItem[]
}
```

**Context Detection:**
- Template reference: `/::template\s*\{\s*id\s*=\s*["']?[^"']*$/`
- Directive: `/::[\w]*$/`

### HoverProvider

Provides rich hover information for templates and directives.

```typescript
class MdckHoverProvider implements vscode.HoverProvider {
  /**
   * Provide hover information at cursor position
   */
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null>

  /**
   * Find template reference at position
   */
  private findTemplateReference(
    lineText: string,
    character: number
  ): { templateId: string; range: vscode.Range } | null

  /**
   * Find directive at position
   */
  private findDirective(
    lineText: string,
    character: number
  ): { directive: string; range: vscode.Range } | null

  /**
   * Create hover content for template
   */
  private async provideTemplateHover(
    document: vscode.TextDocument,
    templateMatch: { templateId: string; range: vscode.Range },
    position: vscode.Position
  ): Promise<vscode.Hover | null>

  /**
   * Create hover content for directive
   */
  private provideDirectiveHover(
    directiveMatch: { directive: string; range: vscode.Range },
    position: vscode.Position
  ): vscode.Hover
}
```

### CodeActionProvider

Provides quick fixes, refactoring, and source actions.

```typescript
class MdckCodeActionProvider implements vscode.CodeActionProvider {
  /**
   * Provide code actions for diagnostics and refactoring
   */
  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]>

  /**
   * Create quick fix actions for diagnostics
   */
  private createQuickFixActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[]

  /**
   * Create refactoring actions for selected text
   */
  private async createRefactorActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<vscode.CodeAction[]>
}
```

**Action Types:**
- `QuickFix`: Fix diagnostic errors
- `Refactor`: Extract/reorganize code
- `SourceAction`: Format/organize

## 🔧 Core Interfaces

### Extension Configuration

```typescript
interface ExtensionConfig {
  diagnostics: {
    enabled: boolean;
    severity: 'error' | 'warning' | 'info';
  };
  completion: {
    enabled: boolean;
    triggerCharacters: string[];
  };
  hover: {
    enabled: boolean;
    showPreview: boolean;
  };
  codeActions: {
    enabled: boolean;
    autoFix: boolean;
  };
}
```

### Template Information

```typescript
interface TemplateInfo {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  dependencies: string[];
  content?: string;
}
```

### Diagnostic Context

```typescript
interface DiagnosticContext {
  document: vscode.TextDocument;
  range: vscode.Range;
  severity: vscode.DiagnosticSeverity;
  message: string;
  code: string;
  source: 'mdck';
}
```

## 🔌 Extension Points

### Language Registration

```typescript
// Register language support
const languages = ['markdown', 'markdown-checklist'];

// Diagnostics
const diagnosticsProvider = new MdckDiagnosticsProvider();

// Completion
const completionRegistration = vscode.languages.registerCompletionItemProvider(
  languages,
  completionProvider,
  ':', '"', "'"
);

// Hover
const hoverRegistration = vscode.languages.registerHoverProvider(
  languages,
  hoverProvider
);

// Code Actions
const codeActionRegistration = vscode.languages.registerCodeActionsProvider(
  languages,
  codeActionProvider,
  {
    providedCodeActionKinds: [
      vscode.CodeActionKind.QuickFix,
      vscode.CodeActionKind.Refactor,
      vscode.CodeActionKind.SourceAction
    ]
  }
);
```

### Event Handling

```typescript
// Document change events
const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
  async (event) => {
    await diagnosticsProvider.provideDiagnostics(event.document);
  }
);

// Document open events
const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
  async (document) => {
    await diagnosticsProvider.provideDiagnostics(document);
  }
);
```

### Resource Management

```typescript
export function activate(context: vscode.ExtensionContext) {
  // Register all providers and event handlers
  context.subscriptions.push(
    completionRegistration,
    hoverRegistration,
    codeActionRegistration,
    onDidChangeTextDocument,
    onDidOpenTextDocument,
    diagnosticsProvider
  );
}

export function deactivate() {
  // Cleanup handled automatically by subscriptions
}
```

## 🧪 Testing Framework

### Test Structure

```typescript
describe('ProviderName', () => {
  let provider: ProviderClass;
  let mockDocument: MockDocument;
  let mockPosition: MockPosition;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ProviderClass();
    mockDocument = createMockDocument();
    mockPosition = createMockPosition();
  });

  it('should handle specific scenario', async () => {
    // Arrange
    setupMocks();

    // Act
    const result = await provider.method(mockDocument, mockPosition);

    // Assert
    expect(result).toMatchExpected();
  });
});
```

### Mock Utilities

```typescript
// VSCode API Mocks
vi.mock('vscode', () => ({
  languages: {
    createDiagnosticCollection: vi.fn(() => mockDiagnosticCollection),
    registerCompletionItemProvider: vi.fn(() => mockDisposable),
    registerHoverProvider: vi.fn(() => mockDisposable),
    registerCodeActionsProvider: vi.fn(() => mockDisposable),
  },
  workspace: {
    getWorkspaceFolder: vi.fn(() => mockWorkspaceFolder),
    onDidChangeTextDocument: vi.fn(() => mockDisposable),
    onDidOpenTextDocument: vi.fn(() => mockDisposable),
  },
  // ... other VSCode API mocks
}));

// Parser Mocks
vi.mock('@mdck/parser', () => ({
  MdckParser: vi.fn(() => mockParser),
}));
```

### Test Categories

1. **Unit Tests**: Individual provider methods
2. **Integration Tests**: Provider interactions
3. **Mock Tests**: VSCode API integration
4. **Error Handling**: Edge cases and failures

## 📊 Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   ```typescript
   // Load parser only when needed
   private async getParser(): Promise<MdckParser> {
     if (!this.parser) {
       this.parser = new MdckParser();
     }
     return this.parser;
   }
   ```

2. **Caching**
   ```typescript
   // Cache expensive operations
   private templateCache = new Map<string, TemplateInfo>();
   
   private async getTemplateInfo(id: string): Promise<TemplateInfo | null> {
     if (this.templateCache.has(id)) {
       return this.templateCache.get(id)!;
     }
     
     const info = await this.fetchTemplateInfo(id);
     this.templateCache.set(id, info);
     return info;
   }
   ```

3. **Debouncing**
   ```typescript
   // Debounce frequent operations
   private diagnosticsDebouncer = new Map<string, NodeJS.Timeout>();
   
   private debounceDiagnostics(document: vscode.TextDocument): void {
     const uri = document.uri.toString();
     
     if (this.diagnosticsDebouncer.has(uri)) {
       clearTimeout(this.diagnosticsDebouncer.get(uri)!);
     }
     
     const timeout = setTimeout(() => {
       this.provideDiagnostics(document);
       this.diagnosticsDebouncer.delete(uri);
     }, 300);
     
     this.diagnosticsDebouncer.set(uri, timeout);
   }
   ```

### Memory Management

- Dispose of resources properly
- Clear caches when appropriate
- Use weak references for temporary data
- Monitor extension memory usage

## 🔍 Debugging

### Debug Configuration

```json
{
  "type": "extensionHost",
  "request": "launch",
  "name": "Launch Extension",
  "runtimeExecutable": "${execPath}",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "preLaunchTask": "npm: build"
}
```

### Logging

```typescript
// Use console for development logging
console.log('Debug info:', data);
console.warn('Warning:', warning);
console.error('Error:', error);

// Use output channel for user-visible logs
const outputChannel = vscode.window.createOutputChannel('mdck');
outputChannel.appendLine('Extension activated');
```

### Common Issues

1. **Provider not triggering**: Check language registration
2. **Completion not working**: Verify trigger characters
3. **Diagnostics not updating**: Check event handlers
4. **Performance issues**: Profile and optimize hot paths

---

This API documentation provides a comprehensive guide for developers working on the mdck VSCode Extension. For user-facing documentation, see [README.md](../README.md).