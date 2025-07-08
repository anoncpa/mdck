# mdck VSCode Extension - User Guide

Welcome to the **mdck VSCode Extension**! This comprehensive guide will help you master template management and boost your Markdown productivity.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Template System](#template-system)
- [Smart Features](#smart-features)
- [Workflow Examples](#workflow-examples)
- [Tips & Tricks](#tips--tricks)
- [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### What is mdck?

mdck (Markdown Check List) is a powerful system for creating reusable content templates in Markdown files. Think of it as "snippets on steroids" with intelligent validation and cross-file references.

### Key Benefits

- 📋 **Reusable Templates**: Create once, use everywhere
- 🔍 **Smart Validation**: Catch errors before they become problems
- 💡 **Intelligent Completion**: Auto-complete templates and directives
- 🔧 **Quick Fixes**: Automatic error resolution
- 📖 **Rich Information**: Hover for detailed template info

### Your First Template

Let's create a simple meeting notes template:

```markdown
::template{id="meeting-notes"}
# Meeting Notes - {{date}}

**Attendees**: {{attendees}}

## Agenda
{{agenda}}

## Action Items
- [ ] {{action1}}
- [ ] {{action2}}

## Next Steps
{{next-steps}}
::
```

Now use it anywhere:

```markdown
::template{id="meeting-notes"}
```

## 📋 Template System

### Template Syntax

Templates use the remark-directive syntax:

```markdown
::template{id="unique-name"}
Your template content here
Can span multiple lines
And include any Markdown
::
```

**Key Rules:**
- Template IDs must be unique within your project
- Use descriptive, kebab-case names
- Content between `::template{id="name"}` and `::` becomes the template

### Template Variables

While not yet expanded by the extension, you can use placeholder variables:

```markdown
::template{id="project-readme"}
# {{project-name}}

{{description}}

## Installation
```bash
npm install {{package-name}}
```

## Usage
{{usage-example}}
::
```

### Template Organization

**Best Practices:**
- Group related templates in dedicated files
- Use consistent naming conventions
- Document template purposes with comments

```markdown
<!-- Project Documentation Templates -->

::template{id="feature-spec"}
# Feature: {{feature-name}}

## Overview
{{overview}}

## Requirements
{{requirements}}
::

::template{id="bug-report"}
## Bug Report: {{title}}

**Environment**: {{environment}}
**Severity**: {{severity}}

### Description
{{description}}
::
```

## 🔍 Smart Features

### Real-time Diagnostics

The extension continuously validates your templates:

#### ❌ Undefined Template Reference
```markdown
::template{id="non-existent"}  <!-- Error: Template not found -->
```

**Quick Fixes Available:**
- ✨ Create template "non-existent"
- 🗑️ Remove template reference

#### ⚠️ Duplicate Template ID
```markdown
::template{id="greeting"}
Hello World!
::

::template{id="greeting"}  <!-- Warning: Duplicate ID -->
Duplicate greeting
::
```

**Quick Fixes Available:**
- 🗑️ Remove duplicate template definition
- ✏️ Rename template ID

#### 🔄 Circular Reference
```markdown
::template{id="a"}
Content with ::template{id="b"}
::

::template{id="b"}
Content with ::template{id="a"}  <!-- Error: Circular dependency -->
::
```

### Intelligent Completion

#### Template ID Completion

Type `::template{id="` and get instant suggestions:

![Template Completion](images/template-completion.gif)

**Features:**
- Shows all available templates
- Displays file location and line numbers
- Shows template dependencies
- Filters as you type

#### Directive Completion

Type `::` to see available directives:

- `template` - Template definition or reference
- `tag` - Content categorization
- `result` - Output display

### Rich Hover Information

Hover over any template reference for detailed information:

**Template Hover Shows:**
- 📋 Template name and ID
- 📁 File path and location
- 📍 Line number range
- 🔗 Dependencies
- 📝 Content preview (first 3 lines)

**Directive Hover Shows:**
- 📖 Detailed explanation
- 💡 Usage examples
- 🔧 Syntax reference

### Code Actions & Quick Fixes

Access powerful refactoring tools with `Ctrl+.` (Cmd+. on Mac):

#### Quick Fixes
- **Create Missing Templates**: Automatically generate template definitions
- **Remove Invalid References**: Clean up broken template links
- **Resolve Duplicates**: Rename or remove duplicate template IDs
- **Fix Circular References**: Break dependency cycles

#### Refactoring
- **Extract to Template**: Convert selected content to reusable template
- **Wrap with Tag**: Add tag directive around selected content

#### Source Actions
- **Format Directives**: Organize and clean up directive syntax

## 💼 Workflow Examples

### Documentation Workflow

**1. Create Template Library**

Create `templates/docs.md`:

```markdown
::template{id="api-endpoint"}
### {{method}} {{path}}

{{description}}

**Parameters:**
{{parameters}}

**Response:**
```json
{{response-example}}
```
::

::template{id="changelog-entry"}
## [{{version}}] - {{date}}

### Added
{{added-features}}

### Changed
{{changed-features}}

### Fixed
{{bug-fixes}}
::
```

**2. Use in Documentation**

In your API docs:

```markdown
# API Reference

::template{id="api-endpoint"}

::template{id="api-endpoint"}
```

**3. Maintain Consistency**

The extension ensures all references are valid and helps maintain consistent documentation structure.

### Project Management Workflow

**1. Create Project Templates**

```markdown
::template{id="sprint-planning"}
# Sprint {{sprint-number}} Planning

**Duration**: {{start-date}} to {{end-date}}
**Goal**: {{sprint-goal}}

## Backlog Items
{{backlog-items}}

## Capacity Planning
{{capacity-notes}}
::

::template{id="retrospective"}
# Sprint {{sprint-number}} Retrospective

## What Went Well
{{went-well}}

## What Could Improve
{{improvements}}

## Action Items
{{action-items}}
::
```

**2. Generate Consistent Reports**

```markdown
::template{id="sprint-planning"}

::template{id="retrospective"}
```

### Content Creation Workflow

**1. Blog Post Templates**

```markdown
::template{id="blog-post"}
# {{title}}

*Published: {{date}} | Author: {{author}}*

{{introduction}}

## {{section-1-title}}
{{section-1-content}}

## {{section-2-title}}
{{section-2-content}}

## Conclusion
{{conclusion}}

---
*Tags: {{tags}}*
::

::template{id="tutorial-post"}
# {{tutorial-title}}

## Prerequisites
{{prerequisites}}

## Step-by-Step Guide

### Step 1: {{step-1-title}}
{{step-1-content}}

### Step 2: {{step-2-title}}
{{step-2-content}}

## Conclusion
{{conclusion}}
::
```

## 💡 Tips & Tricks

### Productivity Tips

**1. Use Descriptive Template Names**
```markdown
<!-- ✅ Good -->
::template{id="user-story-acceptance-criteria"}

<!-- ❌ Avoid -->
::template{id="template1"}
```

**2. Organize Templates by Category**
```
templates/
├── documentation/
│   ├── api-docs.md
│   └── user-guides.md
├── project-management/
│   ├── sprints.md
│   └── meetings.md
└── content/
    ├── blog-posts.md
    └── tutorials.md
```

**3. Use Template Dependencies Wisely**
```markdown
::template{id="header-with-toc"}
::template{id="standard-header"}
::template{id="table-of-contents"}
::

::template{id="standard-header"}
# {{title}}
*Last updated: {{date}}*
::

::template{id="table-of-contents"}
## Table of Contents
{{toc-items}}
::
```

### Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Quick Fix | `Ctrl+.` | Show available code actions |
| Trigger Completion | `Ctrl+Space` | Force completion suggestions |
| Show Hover | `Ctrl+K Ctrl+I` | Show hover information |
| Go to Definition | `F12` | Navigate to template definition |

### Advanced Patterns

**1. Conditional Templates**
```markdown
::template{id="feature-with-tests"}
## Feature: {{feature-name}}

{{feature-description}}

### Implementation
{{implementation-details}}

### Tests
{{test-cases}}
::

::template{id="feature-without-tests"}
## Feature: {{feature-name}}

{{feature-description}}

### Implementation
{{implementation-details}}

> ⚠️ **Note**: Tests need to be added
::
```

**2. Nested Templates**
```markdown
::template{id="complete-api-doc"}
::template{id="api-header"}

::template{id="api-endpoint"}

::template{id="api-footer"}
::
```

## 🔧 Troubleshooting

### Common Issues

#### Templates Not Found

**Problem**: Template references show as undefined

**Solutions:**
1. Check template ID spelling
2. Ensure template is defined in accessible file
3. Verify template syntax: `::template{id="name"}`
4. Use "Reload Window" command to refresh cache

#### Completion Not Working

**Problem**: Auto-completion doesn't appear

**Solutions:**
1. Ensure you're in a Markdown file
2. Check file language mode (should be "Markdown")
3. Try manual trigger with `Ctrl+Space`
4. Verify extension is activated (check status bar)

#### Performance Issues

**Problem**: Extension feels slow or unresponsive

**Solutions:**
1. Check for very large Markdown files
2. Reduce number of templates in single file
3. Organize templates across multiple files
4. Restart VSCode if issues persist

#### Hover Information Missing

**Problem**: Hover doesn't show template details

**Solutions:**
1. Ensure cursor is over template reference
2. Check that template exists and is valid
3. Try `Ctrl+K Ctrl+I` to force hover
4. Verify workspace folder is properly detected

### Getting Help

**1. Check Extension Output**
- Open Output panel (`Ctrl+Shift+U`)
- Select "mdck" from dropdown
- Look for error messages

**2. Reload Extension**
- Open Command Palette (`Ctrl+Shift+P`)
- Run "Developer: Reload Window"

**3. Report Issues**
- Visit [GitHub Issues](https://github.com/your-org/mdck/issues)
- Include VSCode version, extension version, and sample files
- Describe steps to reproduce the problem

### Best Practices for Troubleshooting

1. **Start Simple**: Test with minimal template first
2. **Check Syntax**: Verify directive syntax is correct
3. **Use Diagnostics**: Pay attention to error messages
4. **Test Incrementally**: Add complexity gradually
5. **Keep Backups**: Version control your template files

## 🎓 Learning Resources

### Example Projects
- [Documentation Templates](examples/documentation/)
- [Project Management Templates](examples/project-management/)
- [Content Creation Templates](examples/content/)

### Community
- [GitHub Discussions](https://github.com/your-org/mdck/discussions)
- [Discord Community](https://discord.gg/mdck)
- [Stack Overflow Tag: mdck](https://stackoverflow.com/questions/tagged/mdck)

### Advanced Topics
- [Template Variable Expansion](advanced/variables.md)
- [Custom Directive Creation](advanced/custom-directives.md)
- [Integration with Other Tools](advanced/integrations.md)

---

**Happy templating!** 🎉

The mdck VSCode Extension is designed to make your Markdown workflow more efficient and consistent. Start with simple templates and gradually build a library of reusable content that saves you time and ensures consistency across your projects.