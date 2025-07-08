# @mdck/cli

Command-line interface for mdck (Markdown Check List) - a powerful tool for linting, validating, and generating content from Markdown templates.

## Features

- 🔍 **Lint Markdown Files**: Detect template issues, circular references, and undefined templates
- 📝 **Generate Content**: Expand templates with variables and dependencies
- 🗂️ **File Validation**: Validate Markdown syntax and structure
- ⚡ **Smart Caching**: Fast processing with intelligent cache management
- 📊 **Multiple Output Formats**: Console, JSON, SARIF, and JUnit XML
- 🛠️ **Configurable Rules**: Enable/disable specific linting rules

## Installation

```bash
# Install globally
npm install -g @mdck/cli

# Or use with npx
npx @mdck/cli --help
```

## Quick Start

```bash
# Lint all Markdown files in current directory
mdck lint

# Generate content from a template
mdck generate my-template --output result.md

# Validate file syntax
mdck validate docs/**/*.md

# Clear cache
mdck cache --clear
```

## Commands

### `mdck lint`

Lint Markdown files for template issues and syntax problems.

```bash
# Lint all Markdown files
mdck lint

# Lint specific files
mdck lint docs/README.md src/**/*.md

# Output to JSON format
mdck lint --format json --output report.json

# Enable specific rules only
mdck lint --rules M002,M003

# Disable specific rules
mdck lint --disable-rules M004

# Auto-fix issues where possible
mdck lint --fix
```

#### Options

- `--format <format>`: Output format (`console`, `json`, `sarif`, `junit`)
- `--output <file>`: Write output to file
- `--rules <rules>`: Comma-separated list of rules to enable
- `--disable-rules <rules>`: Comma-separated list of rules to disable
- `--config <file>`: Path to configuration file
- `--fix`: Automatically fix fixable issues
- `--cache/--no-cache`: Enable/disable caching (default: enabled)

#### Exit Codes

- `0`: No errors found
- `1`: Linting errors found
- `2`: Invalid arguments or configuration
- `3`: File not found
- `4`: General error

### `mdck generate`

Generate content from templates with variable substitution.

```bash
# Generate from template
mdck generate my-template

# Generate with variables
mdck generate button --var text="Click Me" --var type="primary"

# Save to file
mdck generate layout --output page.html --force

# Generate without cache
mdck generate header --no-cache
```

#### Options

- `--output <file>`: Output file (default: stdout)
- `--force`: Overwrite existing files
- `--var <key=value>`: Set template variables (can be used multiple times)
- `--cache/--no-cache`: Enable/disable caching (default: enabled)

### `mdck validate`

Validate Markdown files for syntax and structure.

```bash
# Validate all files
mdck validate

# Validate specific files
mdck validate docs/**/*.md

# Validate with cache disabled
mdck validate --no-cache
```

#### Options

- `--cache/--no-cache`: Enable/disable caching (default: enabled)

### `mdck cache`

Manage the mdck cache system.

```bash
# Show cache information
mdck cache --info

# Clear all cache
mdck cache --clear

# Rebuild cache
mdck cache --rebuild
```

#### Options

- `--clear`: Clear all cached data
- `--rebuild`: Rebuild cache from scratch
- `--info`: Show cache information

### `mdck completion`

Generate shell completion scripts.

```bash
# Generate bash completion
mdck completion --shell bash

# Generate zsh completion
mdck completion --shell zsh

# Generate fish completion
mdck completion --shell fish
```

#### Options

- `--shell <shell>`: Shell type (`bash`, `zsh`, `fish`)
- `--type <type>`: Completion type (`template`, `rule`, `file`, `config`)

### `mdck config`

Manage configuration settings.

```bash
# List all configuration
mdck config --list

# Get a configuration value
mdck config format

# Set a configuration value
mdck config format json

# Delete a configuration value
mdck config --delete format

# Use global configuration
mdck config --global format console
```

#### Options

- `--list`: Show all configuration values
- `--delete`: Delete a configuration key
- `--global`: Use global configuration

## Configuration

### Configuration File

Create a `.mdckrc.json` file in your project root:

```json
{
  "format": "console",
  "cache": true,
  "rules": {
    "M002": { "enabled": true, "severity": "error" },
    "M003": { "enabled": true, "severity": "warn" },
    "M004": { "enabled": true, "severity": "error" }
  },
  "exclude": [
    "node_modules/**",
    "dist/**",
    "*.tmp.md"
  ]
}
```

### Environment Variables

- `MDCK_CACHE_DIR`: Override cache directory (default: `.mdck`)
- `MDCK_CONFIG`: Path to configuration file
- `MDCK_NO_COLOR`: Disable colored output
- `MDCK_VERBOSE`: Enable verbose logging

## Output Formats

### Console (Default)

Human-readable output with colors and formatting:

```
✖ 2 problems (1 error, 1 warning)

docs/example.md
  1:1  error    Duplicate template ID 'header'  M002
  5:3  warning  Undefined template reference    M003
```

### JSON

Machine-readable JSON format:

```json
{
  "summary": {
    "errorCount": 1,
    "warningCount": 1,
    "totalCount": 2
  },
  "results": [
    {
      "filePath": "docs/example.md",
      "line": 1,
      "column": 1,
      "severity": "error",
      "message": "Duplicate template ID 'header'",
      "ruleId": "M002"
    }
  ]
}
```

### SARIF

Static Analysis Results Interchange Format for CI/CD integration:

```json
{
  "$schema": "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "mdck",
          "version": "1.0.0"
        }
      },
      "results": [...]
    }
  ]
}
```

### JUnit XML

For test result integration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="mdck-lint" tests="2" failures="1" errors="0">
  <testsuite name="docs_example_md" tests="2" failures="1" errors="0">
    <testcase name="M002-line-1" classname="docs/example.md">
      <failure message="Duplicate template ID 'header'" type="M002">
        File: docs/example.md
        Line: 1
        Rule: M002
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

## Examples

### Basic Linting Workflow

```bash
# 1. Lint all files and show results
mdck lint

# 2. Generate detailed JSON report
mdck lint --format json --output lint-report.json

# 3. Fix auto-fixable issues
mdck lint --fix

# 4. Validate the fixes
mdck validate
```

### Template Generation Workflow

```bash
# 1. List available templates
mdck cache --info

# 2. Generate content with variables
mdck generate email-template \
  --var recipient="John Doe" \
  --var subject="Welcome!" \
  --output welcome-email.md

# 3. Validate generated content
mdck validate welcome-email.md
```

### CI/CD Integration

```bash
# GitHub Actions / GitLab CI
mdck lint --format sarif --output results.sarif
mdck lint --format junit --output test-results.xml

# Return appropriate exit codes for CI
mdck lint || exit 1
```

### Advanced Configuration

```bash
# Custom configuration file
mdck lint --config .mdck-strict.json

# Specific rule configuration
mdck lint --rules M002,M003 --format json

# Performance optimization
mdck lint --cache --verbose
```

## Troubleshooting

### Common Issues

1. **Cache Issues**
   ```bash
   # Clear and rebuild cache
   mdck cache --clear
   mdck cache --rebuild
   ```

2. **Template Not Found**
   ```bash
   # Check available templates
   mdck cache --info
   
   # Rebuild cache to include new templates
   mdck cache --rebuild
   ```

3. **Performance Issues**
   ```bash
   # Enable caching for better performance
   mdck lint --cache
   
   # Use verbose mode to debug
   mdck lint --verbose
   ```

### Debug Mode

```bash
# Enable verbose logging
mdck lint --verbose

# Disable cache for debugging
mdck lint --no-cache --verbose
```

## Integration

### VS Code

Install the mdck VS Code extension for integrated linting and template support.

### Git Hooks

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
mdck lint --format console
exit $?
```

### Package.json Scripts

```json
{
  "scripts": {
    "lint:md": "mdck lint",
    "lint:md:fix": "mdck lint --fix",
    "validate:md": "mdck validate",
    "docs:generate": "mdck generate docs-template --output README.md"
  }
}
```

## Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.