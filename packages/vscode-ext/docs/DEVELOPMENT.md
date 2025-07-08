# Development Guide

This guide covers the development workflow, best practices, and advanced topics for the mdck VSCode Extension.

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone and setup
git clone https://github.com/your-org/mdck.git
cd mdck
npm install

# Navigate to VSCode extension
cd packages/vscode-ext
```

### 2. Development Commands

```bash
# Build the extension
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### 3. Launch Extension Development Host

1. Open `packages/vscode-ext` in VSCode
2. Press `F5` or run "Run Extension" from Debug panel
3. New VSCode window opens with extension loaded
4. Create/open `.md` files to test functionality

## 🏗️ Architecture Deep Dive

### Extension Lifecycle

```typescript
// extension.ts - Main entry point
export function activate(context: vscode.ExtensionContext) {
  console.log('mdck extension is now active!');
  
  // Initialize providers
  const diagnosticsProvider = new MdckDiagnosticsProvider();
  const completionProvider = new MdckCompletionProvider();
  const hoverProvider = new MdckHoverProvider();
  const codeActionProvider = new MdckCodeActionProvider();
  
  // Register language features
  const registrations = [
    vscode.languages.registerCompletionItemProvider(
      ['markdown', 'markdown-checklist'],
      completionProvider,
      ':', '"', "'"
    ),
    vscode.languages.registerHoverProvider(
      ['markdown', 'markdown-checklist'],
      hoverProvider
    ),
    vscode.languages.registerCodeActionsProvider(
      ['markdown', 'markdown-checklist'],
      codeActionProvider,
      {
        providedCodeActionKinds: [
          vscode.CodeActionKind.QuickFix,
          vscode.CodeActionKind.Refactor,
          vscode.CodeActionKind.SourceAction
        ]
      }
    )
  ];
  
  // Setup event handlers
  const eventHandlers = [
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      await diagnosticsProvider.provideDiagnostics(event.document);
    }),
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      await diagnosticsProvider.provideDiagnostics(document);
    })
  ];
  
  // Register for disposal
  context.subscriptions.push(
    ...registrations,
    ...eventHandlers,
    diagnosticsProvider
  );
}

export function deactivate() {
  // Cleanup handled by subscriptions
}
```

### Provider Implementation Pattern

Each language feature follows a consistent pattern:

```typescript
export class MdckFeatureProvider implements vscode.FeatureProvider {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
  }

  async provideFeature(
    document: vscode.TextDocument,
    position: vscode.Position,
    // ... other parameters
  ): Promise<FeatureResult> {
    // 1. Validate input
    if (!this.isValidDocument(document)) {
      return null;
    }

    // 2. Extract context
    const context = this.extractContext(document, position);
    
    // 3. Process with parser
    const parserResult = await this.processWithParser(context);
    
    // 4. Convert to VSCode format
    return this.convertToVSCodeFormat(parserResult);
  }

  private isValidDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'markdown' || 
           document.languageId === 'markdown-checklist';
  }

  // ... helper methods
}
```

## 🧪 Testing Strategy

### Test Structure

```
src/providers/
├── diagnostics.ts
├── diagnostics.test.ts      # Unit tests for diagnostics
├── completion.ts
├── completion.test.ts       # Unit tests for completion
├── hover.ts
├── hover.test.ts           # Unit tests for hover
├── code-action.ts
└── code-action.test.ts     # Unit tests for code actions
```

### Mock Strategy

We use comprehensive mocking for VSCode APIs:

```typescript
// Mock VSCode API
vi.mock('vscode', () => ({
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
  workspace: {
    getWorkspaceFolder: vi.fn(() => ({
      uri: { fsPath: '/workspace' },
    })),
    onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    textDocuments: [],
  },
  // ... complete VSCode API mock
}));

// Mock parser
vi.mock('@mdck/parser', () => ({
  MdckParser: vi.fn(() => ({
    initializeCache: vi.fn(),
    getCacheData: vi.fn().mockResolvedValue(mockCacheData),
    lint: vi.fn().mockResolvedValue(mockLintReport),
    expandTemplate: vi.fn().mockResolvedValue(mockExpansionResult),
  })),
}));
```

### Test Categories

1. **Happy Path Tests**
   ```typescript
   it('should provide completions for template references', async () => {
     mockDocument.lineAt.mockReturnValue({ text: '::template{id="' });
     
     const completions = await provider.provideCompletionItems(
       mockDocument, mockPosition, mockToken, mockContext
     );
     
     expect(completions).toHaveLength(2);
     expect(completions[0].label).toBe('hello-world');
   });
   ```

2. **Edge Case Tests**
   ```typescript
   it('should handle empty cache gracefully', async () => {
     vi.mocked(parser.getCacheData).mockResolvedValue(null);
     
     const completions = await provider.provideCompletionItems(
       mockDocument, mockPosition, mockToken, mockContext
     );
     
     expect(completions).toHaveLength(0);
   });
   ```

3. **Error Handling Tests**
   ```typescript
   it('should handle parser errors gracefully', async () => {
     vi.mocked(parser.getCacheData).mockRejectedValue(new Error('Cache error'));
     const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
     
     const completions = await provider.provideCompletionItems(
       mockDocument, mockPosition, mockToken, mockContext
     );
     
     expect(completions).toHaveLength(0);
     expect(consoleSpy).toHaveBeenCalled();
     consoleSpy.mockRestore();
   });
   ```

## 🔧 Advanced Development

### Custom Language Configuration

```json
// language-configuration.json
{
  "comments": {
    "lineComment": "//",
    "blockComment": ["<!--", "-->"]
  },
  "brackets": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"]
  ],
  "autoClosingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""],
    ["'", "'"],
    ["`", "`"]
  ],
  "surroundingPairs": [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["\"", "\""],
    ["'", "'"],
    ["`", "`"]
  ]
}
```

### Extension Manifest Configuration

```json
// package.json - Key sections
{
  "contributes": {
    "languages": [
      {
        "id": "markdown-checklist",
        "aliases": ["Markdown Checklist", "mdck"],
        "extensions": [".md"],
        "configuration": "./language-configuration.json"
      }
    ],
    "commands": [
      {
        "command": "mdck.helloWorld",
        "title": "Hello World",
        "category": "mdck"
      }
    ],
    "configuration": {
      "title": "mdck",
      "properties": {
        "mdck.diagnostics.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable real-time diagnostics"
        }
      }
    }
  },
  "activationEvents": [
    "onLanguage:markdown"
  ]
}
```

### Performance Optimization

#### 1. Debouncing Frequent Operations

```typescript
class DebouncedDiagnosticsProvider {
  private debounceMap = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_DELAY = 300;

  async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    const uri = document.uri.toString();
    
    // Clear existing timeout
    if (this.debounceMap.has(uri)) {
      clearTimeout(this.debounceMap.get(uri)!);
    }
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      await this.performDiagnostics(document);
      this.debounceMap.delete(uri);
    }, this.DEBOUNCE_DELAY);
    
    this.debounceMap.set(uri, timeout);
  }
}
```

#### 2. Caching Expensive Operations

```typescript
class CachedTemplateProvider {
  private templateCache = new Map<string, TemplateInfo>();
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  async getTemplateInfo(templateId: string): Promise<TemplateInfo | null> {
    const now = Date.now();
    
    // Check cache validity
    if (now - this.cacheTimestamp > this.CACHE_TTL) {
      this.templateCache.clear();
      this.cacheTimestamp = now;
    }
    
    // Return cached result
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }
    
    // Fetch and cache
    const info = await this.fetchTemplateInfo(templateId);
    this.templateCache.set(templateId, info);
    return info;
  }
}
```

#### 3. Lazy Initialization

```typescript
class LazyProvider {
  private _parser?: MdckParser;
  
  private get parser(): MdckParser {
    if (!this._parser) {
      this._parser = new MdckParser();
    }
    return this._parser;
  }
}
```

### Error Handling Best Practices

```typescript
class RobustProvider {
  async provideFeature(document: vscode.TextDocument): Promise<Result[]> {
    try {
      // Main logic
      return await this.processDocument(document);
    } catch (error) {
      // Log error for debugging
      console.error('Provider error:', error);
      
      // Show user-friendly message if needed
      if (error instanceof UserFacingError) {
        vscode.window.showErrorMessage(error.message);
      }
      
      // Return safe fallback
      return [];
    }
  }
  
  private async processDocument(document: vscode.TextDocument): Promise<Result[]> {
    // Validate input
    if (!this.isValidDocument(document)) {
      throw new Error('Invalid document type');
    }
    
    // Process with timeout
    return await Promise.race([
      this.performProcessing(document),
      this.createTimeout(5000) // 5 second timeout
    ]);
  }
  
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), ms);
    });
  }
}
```

## 🐛 Debugging Techniques

### 1. Extension Development Host Debugging

```typescript
// Add breakpoints in your code
export class MdckCompletionProvider {
  async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    debugger; // Breakpoint here
    
    const line = document.lineAt(position);
    console.log('Current line:', line.text); // Debug output
    
    // ... rest of implementation
  }
}
```

### 2. Output Channel Logging

```typescript
class LoggingProvider {
  private outputChannel = vscode.window.createOutputChannel('mdck Debug');
  
  private log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    
    if (data) {
      this.outputChannel.appendLine(JSON.stringify(data, null, 2));
    }
  }
  
  async provideCompletions(document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
    this.log('Providing completions', { 
      uri: document.uri.toString(),
      languageId: document.languageId 
    });
    
    // ... implementation
  }
}
```

### 3. Test-Driven Debugging

```typescript
// Create focused tests for debugging
describe.only('Debugging completion provider', () => {
  it('should debug specific scenario', async () => {
    // Setup exact scenario
    mockDocument.lineAt.mockReturnValue({ text: '::template{id="test' });
    mockDocument.getText.mockReturnValue('::template{id="test');
    
    // Add console logs in implementation
    const result = await provider.provideCompletionItems(mockDocument, mockPosition);
    
    // Inspect result
    console.log('Debug result:', result);
    expect(result).toBeDefined();
  });
});
```

## 📦 Build and Packaging

### Build Process

```bash
# Development build
npm run build

# Production build (optimized)
npm run build:prod

# Watch mode for development
npm run build:watch
```

### Package for Distribution

```bash
# Install vsce (VSCode Extension CLI)
npm install -g vsce

# Package extension
vsce package

# This creates mdck-1.0.0.vsix file
```

### Publishing to Marketplace

```bash
# Login to marketplace
vsce login your-publisher-name

# Publish extension
vsce publish

# Publish specific version
vsce publish 1.0.1
```

## 🔄 Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/extension.yml
name: VSCode Extension CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build extension
      run: npm run build
    
    - name: Package extension
      run: npx vsce package
    
    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: extension-package
        path: '*.vsix'
```

## 📚 Resources

### VSCode Extension Development
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

### Language Server Protocol
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [LSP Implementation Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)

### Testing
- [Vitest Documentation](https://vitest.dev/)
- [Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

---

This development guide provides comprehensive information for working on the mdck VSCode Extension. For API details, see [API.md](API.md).