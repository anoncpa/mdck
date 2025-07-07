// src/__tests__/unit/template-expander.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { processor } from '../../core/processor';
import { TemplateExpander } from '../../core/template-expander';
import type { Root } from '../../shared/types';

describe('TemplateExpander', () => {
  let expander: TemplateExpander;

  beforeEach(() => {
    expander = new TemplateExpander();
  });

  describe('collectDefinitions', () => {
    it('シンプルなテンプレート定義を収集できる', () => {
      const markdown = `
:::template{id="simple"}
# Simple Template
- [ ] Task 1
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const definitions = expander.collectDefinitions(ast);

      expect(definitions.size).toBe(1);
      expect(definitions.has('simple')).toBe(true);

      const definition = definitions.get('simple');
      expect(definition?.id).toBe('simple');
      expect(definition?.content).toHaveLength(2); // heading + list
    });

    it('複数のテンプレート定義を収集できる', () => {
      const markdown = `
:::template{id="first"}
# First Template
:::

:::template{id="second"}
# Second Template
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const definitions = expander.collectDefinitions(ast);

      expect(definitions.size).toBe(2);
      expect(definitions.has('first')).toBe(true);
      expect(definitions.has('second')).toBe(true);
    });

    it('重複するテンプレート定義でエラーになる', () => {
      const markdown = `
:::template{id="duplicate"}
# First
:::

:::template{id="duplicate"}
# Second
:::
      `;

      const ast = processor.parse(markdown) as Root;

      expect(() => {
        expander.collectDefinitions(ast);
      }).toThrow('Duplicate template definition: duplicate');
    });
  });

  describe('collectReferences', () => {
    it('テンプレート参照を収集できる', () => {
      const markdown = `
:::template{id="main"}
::template{id="child1"}
::template{id="child2" src="./external.md"}
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const references = expander.collectReferences(ast);

      expect(references).toHaveLength(2);

      const childRef = references.find((ref) => ref.id === 'child1');
      expect(childRef).toBeDefined();
      expect(childRef?.src).toBeUndefined();

      const externalRef = references.find((ref) => ref.id === 'child2');
      expect(externalRef).toBeDefined();
      expect(externalRef?.src).toBe('./external.md');
    });
  });

  describe('expandTemplate', () => {
    it('シンプルなテンプレート展開ができる', async () => {
      const markdown = `
:::template{id="main"}
# Main Template
- [ ] Main task
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const definitions = expander.collectDefinitions(ast);
      const result = await expander.expandTemplate('main', definitions);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.expandedAst.children).toHaveLength(2); // heading + list
        expect(result.usedDefinitions.size).toBe(1);
        expect(result.usedDefinitions.has('main')).toBe(true);
      }
    });

    it('ネストしたテンプレート展開ができる', async () => {
      const markdown = `
:::template{id="parent"}
# Parent Template
::template{id="child"}
:::

:::template{id="child"}
# Child Template
- [ ] Child task
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const definitions = expander.collectDefinitions(ast);
      const result = await expander.expandTemplate('parent', definitions);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.usedDefinitions.size).toBe(2);
        expect(result.usedDefinitions.has('parent')).toBe(true);
        expect(result.usedDefinitions.has('child')).toBe(true);
      }
    });

    it('循環参照を検出してエラーになる', async () => {
      const markdown = `
:::template{id="a"}
# Template A
::template{id="b"}
:::

:::template{id="b"}
# Template B
::template{id="a"}
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const definitions = expander.collectDefinitions(ast);
      const result = await expander.expandTemplate('a', definitions);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.errorType).toBe('circular-reference');
        expect(result.message).toContain('Circular reference detected');
      }
    });

    it('未定義テンプレート参照でエラーになる', async () => {
      const markdown = `
:::template{id="main"}
# Main Template
::template{id="undefined"}
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const definitions = expander.collectDefinitions(ast);
      const result = await expander.expandTemplate('main', definitions);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.errorType).toBe('undefined-reference');
        expect(result.message).toContain('Template not found: undefined');
      }
    });

    it('存在しないルートテンプレートでエラーになる', async () => {
      const markdown = `
:::template{id="existing"}
# Existing Template
:::
      `;

      const ast = processor.parse(markdown) as Root;
      const definitions = expander.collectDefinitions(ast);
      const result = await expander.expandTemplate('nonexistent', definitions);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.errorType).toBe('undefined-reference');
        expect(result.message).toContain('Template not found: nonexistent');
      }
    });
  });
});
