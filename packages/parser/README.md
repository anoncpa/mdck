# @mdck/parser

A powerful Markdown parser with template support and linting capabilities for mdck (Markdown Check List).

## Features

- 🔍 **Template System**: Define and expand reusable Markdown templates
- 🚨 **Built-in Linting**: Detect circular references, undefined templates, and duplicates
- ⚡ **Smart Caching**: Fast file processing with intelligent cache management
- 🔗 **External File Support**: Reference templates across multiple files
- 📊 **Dependency Analysis**: Automatic dependency graph construction
- 🛠️ **TypeScript Support**: Full type safety with comprehensive type definitions

## Installation

```bash
npm install @mdck/parser
```

## Quick Start

```typescript
import { MdckParser } from '@mdck/parser';

const parser = new MdckParser();

// Parse Markdown with mdck directives
const content = `
# My Document

:::template{id="greeting"}
Hello, **{{name}}**!
:::

:::template{id="greeting"}
Welcome to mdck!
:::
`;

const result = parser.parse(content);
console.log(result.directives); // Array of extracted directives
```

## Template System

### Defining Templates

```markdown
:::template{id="button"}
<button class="btn btn-primary">{{text}}</button>
:::
```

### Referencing Templates

```markdown
:::template{id="button" text="Click Me"}
:::
```

### External File References

```markdown
:::template{id="shared-header" src="./templates/common.md"}
:::
```

## Linting

The parser includes built-in linting rules to ensure template integrity:

```typescript
const lintReport = await parser.lint(content, 'example.md');

console.log(`Errors: ${lintReport.errorCount}`);
console.log(`Warnings: ${lintReport.warningCount}`);

lintReport.results.forEach(result => {
  console.log(`${result.severity}: ${result.message} (${result.ruleId})`);
});
```

### Available Lint Rules

- **M002**: Duplicate Template ID Detection
- **M003**: Undefined Template Reference Detection  
- **M004**: Circular Reference Detection

## Caching

Enable caching for improved performance:

```typescript
const parser = new MdckParser();

// Initialize cache for a project
parser.initializeCache('/path/to/project');

// Get cached data
const cacheData = await parser.getCacheData();
console.log(`Cached templates: ${cacheData.templates.size}`);

// Refresh cache when files change
await parser.refreshCache(['/path/to/changed/file.md']);
```

## Template Expansion

Expand templates with full dependency resolution:

```typescript
const templateContent = `
:::template{id="header"}
# {{title}}
:::

:::template{id="header" title="Welcome"}
:::
`;

const expansionResult = await parser.expandTemplate(
  templateContent,
  'header',
  '/path/to/file.md'
);

if (expansionResult.status === 'success') {
  const expandedMarkdown = parser.stringify(expansionResult.expandedAst);
  console.log(expandedMarkdown);
} else {
  console.error(`Expansion failed: ${expansionResult.message}`);
}
```

## API Reference

### MdckParser

#### Methods

- `parse(content: string): ParseResult` - Parse Markdown content
- `lint(content: string, filePath?: string): Promise<LintReport>` - Lint content
- `stringify(ast: Root): string` - Convert AST back to Markdown
- `initializeCache(projectRoot: string): void` - Initialize caching
- `getCacheData(): Promise<CacheData | null>` - Get cache data
- `refreshCache(targetFiles?: string[]): Promise<CacheUpdateResult | null>` - Refresh cache
- `expandTemplate(content: string, templateId: string, filePath?: string): Promise<TemplateExpansionResult>` - Expand template

#### Types

```typescript
interface ParseResult {
  ast: Root;                    // Markdown AST
  directives: MdckDirective[];  // Extracted directives
}

interface LintReport {
  filePath?: string;
  results: LintResult[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  duration: number;
  preprocessDuration: number;
}

interface LintResult {
  ruleId: LintRuleId;
  severity: LintSeverity;
  message: string;
  line: number;
  column?: number;
  fixable: boolean;
  filePath?: string;
  details?: Record<string, unknown>;
}
```

## Configuration

### Cache Configuration

```typescript
const parser = new MdckParser();
parser.initializeCache('/project/root', {
  maxConcurrency: 10,        // Max concurrent file processing
  cacheDirectory: '.mdck',   // Cache directory name
});
```

### Lint Configuration

```typescript
const lintConfig = {
  rules: new Map([
    ['M002', { enabled: true, severity: 'error' }],
    ['M003', { enabled: true, severity: 'warn' }],
    ['M004', { enabled: true, severity: 'error' }],
  ])
};

const report = await parser.lint(content, filePath, lintConfig);
```

## Error Handling

The parser provides detailed error information:

```typescript
try {
  const result = await parser.expandTemplate(content, 'template-id');
  if (result.status === 'error') {
    switch (result.errorType) {
      case 'circular-reference':
        console.error('Circular reference detected:', result.details.referencePath);
        break;
      case 'undefined-reference':
        console.error('Template not found:', result.details.templateId);
        break;
      case 'invalid-definition':
        console.error('Invalid template definition:', result.message);
        break;
    }
  }
} catch (error) {
  console.error('Parser error:', error.message);
}
```

## Performance Tips

1. **Use Caching**: Enable caching for projects with multiple files
2. **Batch Operations**: Process multiple files together when possible
3. **Incremental Updates**: Use `refreshCache()` for changed files only
4. **Concurrent Processing**: The parser automatically handles concurrent file processing

## Examples

### Basic Template Usage

```markdown
<!-- Define a reusable component -->
:::template{id="alert"}
<div class="alert alert-{{type}}">
  {{message}}
</div>
:::

<!-- Use the template -->
:::template{id="alert" type="warning" message="Please save your work!"}
:::
```

### Complex Template with Dependencies

```markdown
<!-- Base layout template -->
:::template{id="layout"}
<!DOCTYPE html>
<html>
<head><title>{{title}}</title></head>
<body>{{content}}</body>
</html>
:::

<!-- Page template that uses layout -->
:::template{id="page"}
:::template{id="layout" title="{{pageTitle}}" content="{{pageContent}}"}
:::
:::

<!-- Final usage -->
:::template{id="page" pageTitle="Welcome" pageContent="<h1>Hello World</h1>"}
:::
```

## Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.