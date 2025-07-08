// packages/vscode-ext/src/providers/diagnostics.ts
import * as vscode from 'vscode';
import { MdckParser, LintReport, LintResult } from '@mdck/parser';

export class MdckDiagnosticsProvider {
  private parser: MdckParser;
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.parser = new MdckParser();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('mdck');
  }

  /**
   * ドキュメントの診断を実行
   */
  async provideDiagnostics(document: vscode.TextDocument): Promise<void> {
    // Markdownファイルのみ処理
    if (document.languageId !== 'markdown' && document.languageId !== 'markdown-checklist') {
      return;
    }

    try {
      const content = document.getText();
      const lintReport = await this.parser.lint(content, document.uri.fsPath);
      
      const diagnostics = this.convertLintResultsToDiagnostics(lintReport, document);
      this.diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
      console.error('Failed to provide diagnostics:', error);
      // エラーが発生した場合は診断をクリア
      this.diagnosticCollection.set(document.uri, []);
    }
  }

  /**
   * LintResultをVSCode Diagnosticに変換
   */
  private convertLintResultsToDiagnostics(
    lintReport: LintReport,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    return lintReport.results.map(result => this.convertLintResultToDiagnostic(result, document));
  }

  /**
   * 個別のLintResultをDiagnosticに変換
   */
  private convertLintResultToDiagnostic(
    result: LintResult,
    document: vscode.TextDocument
  ): vscode.Diagnostic {
    // 行番号は1-basedから0-basedに変換
    const line = Math.max(0, result.line - 1);
    const column = Math.max(0, (result.column || 1) - 1);
    
    // 範囲を計算（行全体をハイライト）
    const lineText = document.lineAt(line).text;
    const range = new vscode.Range(
      line,
      column,
      line,
      lineText.length
    );

    const diagnostic = new vscode.Diagnostic(
      range,
      result.message,
      this.convertSeverity(result.severity)
    );

    diagnostic.code = result.ruleId;
    diagnostic.source = 'mdck';

    return diagnostic;
  }

  /**
   * LintSeverityをVSCode DiagnosticSeverityに変換
   */
  private convertSeverity(severity: 'error' | 'warn' | 'info'): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warn':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Warning;
    }
  }

  /**
   * 診断をクリア
   */
  clear(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}