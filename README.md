# mdck - Markdown Check List

[English](./README.md) | [日本語](./README.ja.md)

A powerful toolkit for creating, managing, and validating Markdown templates with intelligent linting and cross-file dependency tracking.

## 🚀 Overview

mdck (Markdown Check List) is a comprehensive solution for working with reusable Markdown templates. It provides a parser, CLI tools, and VS Code extension to help you create maintainable documentation with template-based content generation.

## 📦 Packages

This monorepo contains the following packages:

### [@mdck/parser](./packages/parser)
Core parsing engine with template expansion and linting capabilities.

```bash
npm install @mdck/parser
```

**Features:**
- Template definition and expansion
- Built-in linting rules (duplicate IDs, circular references, undefined templates)
- Smart caching for performance
- External file support
- TypeScript support

### [@mdck/cli](./packages/cli)
Command-line interface for linting, validation, and content generation.

```bash
npm install -g @mdck/cli
```

**Features:**
- Lint Markdown files for template issues
- Generate content from templates
- Multiple output formats (console, JSON, SARIF, JUnit)
- File validation and cache management

### [mdck VS Code Extension](./packages/vscode-ext)
Intelligent VS Code extension with real-time linting and auto-completion.

**Features:**
- Real-time template linting
- Smart auto-completion for template IDs
- Hover information and quick fixes
- Template snippets and syntax highlighting

## 🎯 Quick Start

### 1. Install the CLI

```bash
npm install -g @mdck/cli
```

### 2. Create a template

```markdown
<!-- templates/button.md -->
:::template{id="button"}
<button class="btn btn-{{type}}">{{text}}</button>
:::
```

### 3. Use the template

```markdown
<!-- docs/readme.md -->
:::template{id="button" type="primary" text="Get Started"}
:::
```

### 4. Lint and validate

```bash
mdck lint docs/
mdck generate button --var type="primary" --var text="Click Me"
```

## 🔧 Template Syntax

### Template Definition

```markdown
:::template{id="alert"}
<div class="alert alert-{{type}}">
  <strong>{{title}}</strong>
  {{message}}
</div>
:::
```

### Template Reference

```markdown
:::template{id="alert" type="warning" title="Warning" message="Please save your work!"}
:::
```

### External Template Reference

```markdown
:::template{id="shared-header" src="./templates/common.md"}
:::
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/mdck.git
cd mdck

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Package Scripts

```bash
# Build all packages
pnpm build

# Run tests for all packages
pnpm test

# Lint all packages
pnpm lint

# Clean build artifacts
pnpm clean
```

## 📖 Documentation

- [Parser API Documentation](./packages/parser/README.md)
- [CLI Usage Guide](./packages/cli/README.md)
- [VS Code Extension Guide](./packages/vscode-ext/README.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Setting up the development environment
- Code style and conventions
- Testing requirements
- Pull request process

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- Built with [remark](https://github.com/remarkjs/remark) and [remark-directive](https://github.com/remarkjs/remark-directive)
- Inspired by modern documentation tools and template systems
