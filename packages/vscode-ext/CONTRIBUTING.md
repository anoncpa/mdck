# Contributing to mdck VSCode Extension

Thank you for your interest in contributing to the mdck VSCode Extension! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- VSCode 1.89.0+
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/mdck.git
   cd mdck
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

### Project Structure

```
packages/vscode-ext/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── providers/                # Language service providers
│   │   ├── diagnostics.ts        # Error/warning detection
│   │   ├── completion.ts         # Auto-completion
│   │   ├── hover.ts              # Hover information
│   │   └── code-action.ts        # Quick fixes & refactoring
│   └── utils/                    # Utility functions
├── package.json                  # Extension manifest
├── language-configuration.json   # Language settings
└── README.md                     # User documentation
```

## 🔧 Development Workflow

### Running the Extension

1. **Open in VSCode**
   ```bash
   code packages/vscode-ext
   ```

2. **Launch Extension Development Host**
   - Press `F5` or run "Run Extension" from Run and Debug panel
   - This opens a new VSCode window with the extension loaded

3. **Test your changes**
   - Create/open a Markdown file in the Extension Development Host
   - Test the features you're working on

### Testing

We use Vitest for unit testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/providers/completion.test.ts
```

### Code Quality

- **TypeScript**: All code must be properly typed
- **ESLint**: Follow the configured linting rules
- **Prettier**: Code formatting is enforced

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 📝 Coding Guidelines

### TypeScript Style

```typescript
// ✅ Good: Proper typing and naming
interface TemplateDefinition {
  readonly id: string;
  readonly filePath: string;
  readonly startLine: number;
  readonly endLine: number;
}

// ❌ Bad: Missing types and unclear naming
function process(data: any): any {
  return data.stuff;
}
```

### VSCode API Usage

```typescript
// ✅ Good: Proper error handling and disposal
const registration = vscode.languages.registerCompletionItemProvider(
  ['markdown'],
  provider
);
context.subscriptions.push(registration);

// ❌ Bad: Missing disposal
vscode.languages.registerCompletionItemProvider(['markdown'], provider);
```

### Testing Patterns

```typescript
// ✅ Good: Comprehensive test with mocks
describe('CompletionProvider', () => {
  let provider: CompletionProvider;
  let mockDocument: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new CompletionProvider();
    mockDocument = createMockDocument();
  });

  it('should provide template completions', async () => {
    // Arrange
    mockDocument.lineAt.mockReturnValue({ text: '::template{id="' });
    
    // Act
    const completions = await provider.provideCompletionItems(mockDocument, position);
    
    // Assert
    expect(completions).toHaveLength(2);
    expect(completions[0].label).toBe('hello-world');
  });
});
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - VSCode version
   - Extension version
   - Operating system

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Sample files if applicable

3. **Expected vs Actual Behavior**
   - What you expected to happen
   - What actually happened

4. **Additional Context**
   - Screenshots or GIFs
   - Console errors
   - Related issues

## ✨ Feature Requests

For new features:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** - why is this needed?
3. **Propose a solution** - how should it work?
4. **Consider alternatives** - are there other approaches?

## 🔄 Pull Request Process

### Before Submitting

1. **Create an issue** to discuss the change
2. **Fork the repository** and create a feature branch
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Ensure all tests pass**

### PR Guidelines

1. **Clear title and description**
   - Summarize the change
   - Reference related issues

2. **Small, focused changes**
   - One feature/fix per PR
   - Easy to review and test

3. **Test coverage**
   - Add tests for new code
   - Maintain existing test coverage

### Review Process

1. **Automated checks** must pass
   - Tests
   - Linting
   - Type checking

2. **Code review** by maintainers
   - Functionality
   - Code quality
   - Documentation

3. **Testing** in Extension Development Host
   - Manual verification
   - Edge case testing

## 🏗️ Architecture Guidelines

### Provider Pattern

Each language feature is implemented as a separate provider:

```typescript
export class MdckCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    // Implementation
  }
}
```

### Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return fallbackValue;
}
```

### Performance Considerations

- **Lazy loading**: Only load what's needed
- **Caching**: Cache expensive operations
- **Debouncing**: Avoid excessive API calls
- **Cancellation**: Respect cancellation tokens

## 📚 Resources

### VSCode Extension Development
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

### Testing
- [Vitest Documentation](https://vitest.dev/)
- [VSCode Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig)

## 🤝 Community

- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Use GitHub Issues for bugs and features
- **Discord**: Join our community Discord server

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to mdck! 🎉