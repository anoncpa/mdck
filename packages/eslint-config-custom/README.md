# @mdck/eslint-config-custom

Shared ESLint configuration for mdck packages.

## Usage

This package provides a consistent ESLint configuration across all mdck packages.

### Installation

```bash
npm install --save-dev @mdck/eslint-config-custom
```

### Configuration

In your `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['@mdck/eslint-config-custom'],
  // Add package-specific overrides here
};
```

## Rules

The configuration includes:

- **Base**: ESLint recommended rules
- **TypeScript**: TypeScript-specific linting rules
- **Code Style**: Consistent formatting and style rules
- **Best Practices**: Security and performance best practices

## License

MIT License - see [LICENSE](../../LICENSE) for details.