// src/formatters/index.ts
import { ConsoleFormatter } from './console';
import { JsonFormatter } from './json';
import { SarifFormatter } from './sarif';
import { JunitFormatter } from './junit';
import type { OutputFormat, Formatter } from '../types';

/**
 * フォーマッターファクトリー
 */
export function createFormatter(format: OutputFormat, options: { color?: boolean; pretty?: boolean } = {}): Formatter {
  switch (format) {
    case 'console':
      return new ConsoleFormatter(options.color ?? true);
    case 'json':
      return new JsonFormatter(options.pretty ?? false);
    case 'sarif':
      return new SarifFormatter();
    case 'junit':
      return new JunitFormatter();
    default:
      throw new Error(`Unknown output format: ${format}`);
  }
}

export { ConsoleFormatter, JsonFormatter, SarifFormatter, JunitFormatter };