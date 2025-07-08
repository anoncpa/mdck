# mdck VSCode Extension

**Markdown Check List** - A powerful VSCode extension for managing markdown checklists with template support and intelligent editing features.

## 🚀 Features

### 📋 Template Management
- **Template Definition**: Create reusable content templates with `::template{id="name"}`
- **Template Reference**: Reference templates anywhere in your documents
- **Dependency Tracking**: Automatic detection of template dependencies

### 🔍 Real-time Diagnostics
- **Error Detection**: Undefined template references, duplicate IDs, circular dependencies
- **Warning Highlights**: Visual indicators for potential issues
- **Instant Feedback**: Real-time validation as you type

### 💡 Intelligent Code Completion
- **Template ID Completion**: Auto-complete available template IDs
- **Directive Completion**: Smart completion for `::template`, `::tag`, `::result`
- **Context Awareness**: Relevant suggestions based on cursor position

### 📖 Rich Hover Information
- **Template Details**: File path, line numbers, dependencies
- **Content Preview**: Quick preview of template content
- **Directive Help**: Detailed explanations and usage examples

### 🔧 Code Actions & Quick Fixes
- **Auto-fix Errors**: Create missing templates, remove invalid references
- **Refactoring Tools**: Extract content to templates, wrap with tags
- **Format Code**: Organize and format directive syntax

## 📦 Installation

### From VSCode Marketplace
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "mdck"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from releases
2. Open VSCode
3. Run `Extensions: Install from VSIX...` command
4. Select the downloaded file

## 🎯 Quick Start

### 1. Create Your First Template

```markdown
::template{id="meeting-notes"}
# Meeting Notes - {{date}}

**Attendees**: {{attendees}}

## Agenda
{{agenda}}

## Action Items
- [ ] {{action1}}
- [ ] {{action2}}
::
```

### 2. Use the Template

```markdown
::template{id="meeting-notes"}
```

### 3. Get Intelligent Assistance

- **Type `::` to see directive completions**
- **Type `::template{id="` to see available templates**
- **Hover over templates for detailed information**
- **Use Ctrl+. for quick fixes and refactoring**

## 📚 Directive Reference

### Template Directive
```markdown
::template{id="template-name"}
Template content here
::
```

### Tag Directive
```markdown
::tag{category="section"}
Tagged content
::
```

### Result Directive
```markdown
::result{type="output"}
Result content
::
```

## ⚙️ Configuration

The extension works out of the box, but you can customize it through VSCode settings:

```json
{
  "mdck.diagnostics.enabled": true,
  "mdck.completion.enabled": true,
  "mdck.hover.enabled": true,
  "mdck.codeActions.enabled": true
}
```

## 🔧 Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `mdck.helloWorld` | Show welcome message | - |

## 🎨 Supported Languages

- `markdown` - Standard Markdown files
- `markdown-checklist` - Enhanced Markdown with checklist support

## 🐛 Troubleshooting

### Templates Not Found
- Ensure templates are defined with proper `::template{id="name"}` syntax
- Check that template IDs are unique within your project
- Verify file paths are accessible

### Completion Not Working
- Make sure you're in a Markdown file
- Try typing `::` to trigger directive completion
- Check that the extension is activated

### Performance Issues
- Large projects may experience slower performance
- Consider organizing templates in separate files
- Use the cache refresh command if needed

## 📝 Examples

### Project Documentation Template
```markdown
::template{id="project-readme"}
# {{project-name}}

## Description
{{description}}

## Installation
```bash
npm install {{package-name}}
```

## Usage
{{usage-example}}

## Contributing
{{contributing-guidelines}}
::
```

### Bug Report Template
```markdown
::template{id="bug-report"}
## Bug Report

**Environment**: {{environment}}
**Version**: {{version}}

### Steps to Reproduce
1. {{step1}}
2. {{step2}}
3. {{step3}}

### Expected Behavior
{{expected}}

### Actual Behavior
{{actual}}
::
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Clone the repository
2. Run `npm install`
3. Open in VSCode
4. Press F5 to launch Extension Development Host

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/your-org/mdck)
- [Issue Tracker](https://github.com/your-org/mdck/issues)
- [Documentation](https://your-org.github.io/mdck)

## 🙏 Acknowledgments

- Built with [remark](https://remark.js.org/) and [remark-directive](https://github.com/remarkjs/remark-directive)
- Inspired by modern documentation tools and template systems