# @mdck/tsconfig

Shared TypeScript configuration for mdck packages.

## Usage

This package provides a base TypeScript configuration that can be extended by other packages in the mdck monorepo.

### Installation

```bash
npm install --save-dev @mdck/tsconfig
```

### Configuration

In your `tsconfig.json`:

```json
{
  "extends": "@mdck/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Base Configuration

The base configuration includes:

- **Target**: ES2022
- **Module**: ESNext with Node resolution
- **Strict Mode**: Enabled with all strict checks
- **Source Maps**: Enabled for debugging
- **Declaration**: Enabled for type definitions
- **Incremental**: Enabled for faster builds

## License

MIT License - see [LICENSE](../../LICENSE) for details.