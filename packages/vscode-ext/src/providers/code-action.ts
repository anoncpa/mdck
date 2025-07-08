// packages/vscode-ext/src/providers/code-action.ts
import * as vscode from 'vscode';
import { MdckParser } from '@mdck/parser';

export class MdckCodeActionProvider implements vscode.CodeActionProvider {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
  }

  /**
   * コードアクションを提供
   */
  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    // Markdownファイルのみ処理
    if (document.languageId !== 'markdown' && document.languageId !== 'markdown-checklist') {
      return [];
    }

    const actions: vscode.CodeAction[] = [];

    // 診断に基づくクイックフィックス
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source === 'mdck') {
        actions.push(...this.createQuickFixActions(document, diagnostic));
      }
    }

    // リファクタリングアクション
    actions.push(...await this.createRefactorActions(document, range));

    return actions;
  }

  /**
   * クイックフィックスアクションを作成
   */
  private createQuickFixActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // ルールIDに基づいてアクションを生成
    switch (diagnostic.code) {
      case 'M003': // Undefined template reference
        actions.push(...this.createUndefinedTemplateActions(document, diagnostic));
        break;
      case 'M002': // Duplicate template ID
        actions.push(...this.createDuplicateTemplateActions(document, diagnostic));
        break;
      case 'M004': // Circular reference
        actions.push(...this.createCircularReferenceActions(document, diagnostic));
        break;
    }

    return actions;
  }

  /**
   * 未定義テンプレート参照のアクション
   */
  private createUndefinedTemplateActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;

    // テンプレートIDを抽出
    const templateMatch = lineText.match(/::template\s*\{\s*id\s*=\s*["']([^"']+)["']\s*\}/);
    if (!templateMatch) return actions;

    const templateId = templateMatch[1];

    // 1. テンプレート定義を作成するアクション
    const createTemplateAction = new vscode.CodeAction(
      `Create template "${templateId}"`,
      vscode.CodeActionKind.QuickFix
    );
    createTemplateAction.edit = this.createTemplateDefinitionEdit(document, templateId);
    createTemplateAction.diagnostics = [diagnostic];
    actions.push(createTemplateAction);

    // 2. テンプレート参照を削除するアクション
    const removeReferenceAction = new vscode.CodeAction(
      `Remove template reference "${templateId}"`,
      vscode.CodeActionKind.QuickFix
    );
    removeReferenceAction.edit = this.createRemoveReferenceEdit(document, diagnostic.range);
    removeReferenceAction.diagnostics = [diagnostic];
    actions.push(removeReferenceAction);

    return actions;
  }

  /**
   * 重複テンプレートIDのアクション
   */
  private createDuplicateTemplateActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // 重複テンプレートを削除するアクション
    const removeDuplicateAction = new vscode.CodeAction(
      'Remove duplicate template definition',
      vscode.CodeActionKind.QuickFix
    );
    removeDuplicateAction.edit = this.createRemoveTemplateEdit(document, diagnostic.range);
    removeDuplicateAction.diagnostics = [diagnostic];
    actions.push(removeDuplicateAction);

    // テンプレートIDを変更するアクション
    const renameAction = new vscode.CodeAction(
      'Rename template ID',
      vscode.CodeActionKind.QuickFix
    );
    renameAction.edit = this.createRenameTemplateEdit(document, diagnostic.range);
    renameAction.diagnostics = [diagnostic];
    actions.push(renameAction);

    return actions;
  }

  /**
   * 循環参照のアクション
   */
  private createCircularReferenceActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // 循環参照を削除するアクション
    const removeCircularAction = new vscode.CodeAction(
      'Remove circular reference',
      vscode.CodeActionKind.QuickFix
    );
    removeCircularAction.edit = this.createRemoveReferenceEdit(document, diagnostic.range);
    removeCircularAction.diagnostics = [diagnostic];
    actions.push(removeCircularAction);

    return actions;
  }

  /**
   * リファクタリングアクションを作成
   */
  private async createRefactorActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];
    const selectedText = document.getText(range);

    // 選択されたテキストがある場合のリファクタリング
    if (selectedText.trim()) {
      // 1. 選択範囲をテンプレートに抽出
      const extractTemplateAction = new vscode.CodeAction(
        'Extract to template',
        vscode.CodeActionKind.Refactor
      );
      extractTemplateAction.edit = await this.createExtractTemplateEdit(document, range, selectedText);
      actions.push(extractTemplateAction);

      // 2. 選択範囲をタグで囲む
      const wrapWithTagAction = new vscode.CodeAction(
        'Wrap with tag',
        vscode.CodeActionKind.Refactor
      );
      wrapWithTagAction.edit = this.createWrapWithTagEdit(document, range);
      actions.push(wrapWithTagAction);
    }

    // 3. ファイル全体のフォーマット
    const formatAction = new vscode.CodeAction(
      'Format mdck directives',
      vscode.CodeActionKind.Source
    );
    formatAction.edit = this.createFormatDirectivesEdit(document);
    actions.push(formatAction);

    return actions;
  }

  /**
   * テンプレート定義作成の編集
   */
  private createTemplateDefinitionEdit(
    document: vscode.TextDocument,
    templateId: string
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // ファイルの末尾にテンプレート定義を追加
    const lastLine = document.lineCount - 1;
    const endPosition = new vscode.Position(lastLine, document.lineAt(lastLine).text.length);
    
    const templateDefinition = `\n\n::template{id="${templateId}"}\n<!-- TODO: Add template content -->\n::`;
    
    edit.insert(document.uri, endPosition, templateDefinition);
    return edit;
  }

  /**
   * 参照削除の編集
   */
  private createRemoveReferenceEdit(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // 行全体を削除
    const line = document.lineAt(range.start.line);
    const fullLineRange = new vscode.Range(
      new vscode.Position(range.start.line, 0),
      new vscode.Position(range.start.line + 1, 0)
    );
    
    edit.delete(document.uri, fullLineRange);
    return edit;
  }

  /**
   * テンプレート削除の編集
   */
  private createRemoveTemplateEdit(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // テンプレート全体を削除（::template から :: まで）
    const startLine = range.start.line;
    let endLine = startLine;
    
    // 終了の :: を探す
    for (let i = startLine + 1; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text.trim();
      if (lineText === '::') {
        endLine = i;
        break;
      }
    }
    
    const templateRange = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine + 1, 0)
    );
    
    edit.delete(document.uri, templateRange);
    return edit;
  }

  /**
   * テンプレートID変更の編集
   */
  private createRenameTemplateEdit(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(range.start.line);
    const lineText = line.text;
    
    // 現在のテンプレートIDを抽出
    const templateMatch = lineText.match(/::template\s*\{\s*id\s*=\s*["']([^"']+)["']\s*\}/);
    if (templateMatch) {
      const currentId = templateMatch[1];
      const newId = `${currentId}-renamed`;
      const newLineText = lineText.replace(currentId, newId);
      
      edit.replace(document.uri, line.range, newLineText);
    }
    
    return edit;
  }

  /**
   * テンプレート抽出の編集
   */
  private async createExtractTemplateEdit(
    document: vscode.TextDocument,
    range: vscode.Range,
    selectedText: string
  ): Promise<vscode.WorkspaceEdit> {
    const edit = new vscode.WorkspaceEdit();
    
    // 一意なテンプレートIDを生成
    const templateId = await this.generateUniqueTemplateId(document);
    
    // 選択範囲をテンプレート参照に置換
    const templateReference = `::template{id="${templateId}"}`;
    edit.replace(document.uri, range, templateReference);
    
    // ファイル末尾にテンプレート定義を追加
    const lastLine = document.lineCount - 1;
    const endPosition = new vscode.Position(lastLine, document.lineAt(lastLine).text.length);
    const templateDefinition = `\n\n::template{id="${templateId}"}\n${selectedText}\n::`;
    
    edit.insert(document.uri, endPosition, templateDefinition);
    return edit;
  }

  /**
   * タグで囲む編集
   */
  private createWrapWithTagEdit(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    const selectedText = document.getText(range);
    
    const wrappedText = `::tag{category="section"}\n${selectedText}\n::`;
    edit.replace(document.uri, range, wrappedText);
    
    return edit;
  }

  /**
   * ディレクティブフォーマットの編集
   */
  private createFormatDirectivesEdit(document: vscode.TextDocument): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // 簡単なフォーマット: 空行の調整
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;
      
      // ディレクティブの前後に適切な空行を追加
      if (lineText.trim().startsWith('::') && lineText.trim() !== '::') {
        const prevLine = i > 0 ? document.lineAt(i - 1) : null;
        if (prevLine && prevLine.text.trim() !== '' && !prevLine.text.trim().startsWith('::')) {
          edit.insert(document.uri, new vscode.Position(i, 0), '\n');
        }
      }
    }
    
    return edit;
  }

  /**
   * 一意なテンプレートIDを生成
   */
  private async generateUniqueTemplateId(document: vscode.TextDocument): Promise<string> {
    try {
      // キャッシュから既存のテンプレートIDを取得
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (workspaceFolder) {
        this.parser.initializeCache(workspaceFolder.uri.fsPath);
      }
      
      const cacheData = await this.parser.getCacheData();
      const existingIds = cacheData ? Array.from(cacheData.templates.keys()) : [];
      
      // 一意なIDを生成
      let counter = 1;
      let templateId = 'extracted-template';
      
      while (existingIds.includes(templateId)) {
        templateId = `extracted-template-${counter}`;
        counter++;
      }
      
      return templateId;
    } catch (error) {
      // エラーが発生した場合はタイムスタンプベースのIDを使用
      return `extracted-template-${Date.now()}`;
    }
  }
}