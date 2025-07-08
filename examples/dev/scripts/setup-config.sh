#!/bin/bash

# mdck設定セットアップスクリプト
# 環境に応じて適切な設定ファイルを選択・適用します

set -e

# 色付き出力用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプ表示
show_help() {
    echo "mdck設定セットアップスクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0 [環境名]"
    echo ""
    echo "利用可能な環境:"
    echo "  development  - 開発環境向け設定（緩いルール、自動修正有効）"
    echo "  strict       - 厳格設定（CI/CD環境向け、警告でも失敗）"
    echo "  default      - デフォルト設定（バランス型）"
    echo ""
    echo "例:"
    echo "  $0 development"
    echo "  $0 strict"
    echo "  $0 default"
    echo ""
    echo "オプション:"
    echo "  -h, --help   このヘルプを表示"
    echo "  -f, --force  既存の設定ファイルを強制上書き"
}

# エラー処理
error_exit() {
    echo -e "${RED}エラー: $1${NC}" >&2
    exit 1
}

# 成功メッセージ
success_msg() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 警告メッセージ
warning_msg() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 情報メッセージ
info_msg() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 設定ファイルの存在確認
check_config_exists() {
    local config_file="$1"
    if [[ ! -f "$config_file" ]]; then
        error_exit "設定ファイルが見つかりません: $config_file"
    fi
}

# 設定ファイルのコピー
copy_config() {
    local source="$1"
    local target="$2"
    local force="$3"
    
    # ターゲットディレクトリの作成
    mkdir -p "$(dirname "$target")"
    
    # 既存ファイルの確認
    if [[ -f "$target" && "$force" != "true" ]]; then
        echo -n "設定ファイルが既に存在します。上書きしますか? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            warning_msg "設定ファイルの更新をスキップしました"
            return 0
        fi
    fi
    
    # バックアップの作成
    if [[ -f "$target" ]]; then
        local backup="${target}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$target" "$backup"
        info_msg "既存の設定をバックアップしました: $backup"
    fi
    
    # 設定ファイルのコピー
    cp "$source" "$target"
    success_msg "設定ファイルを適用しました: $target"
}

# 設定の検証
validate_config() {
    local config_file="$1"
    
    info_msg "設定ファイルの検証中..."
    
    # JSONの構文チェック
    if ! python3 -m json.tool "$config_file" > /dev/null 2>&1; then
        error_exit "設定ファイルのJSON構文が正しくありません: $config_file"
    fi
    
    success_msg "設定ファイルの検証が完了しました"
}

# mdckコマンドの存在確認
check_mdck_command() {
    if ! command -v mdck &> /dev/null; then
        warning_msg "mdckコマンドが見つかりません"
        info_msg "以下のコマンドでインストールできます:"
        echo "  npm install -g @mdck/cli"
        return 1
    fi
    return 0
}

# 設定の表示
show_config() {
    local config_file="$1"
    
    echo ""
    info_msg "適用された設定の概要:"
    echo "----------------------------------------"
    
    if check_mdck_command; then
        mdck config --list --config "$config_file" 2>/dev/null || {
            warning_msg "mdckコマンドで設定を表示できませんでした"
            echo "設定ファイル: $config_file"
        }
    else
        echo "設定ファイル: $config_file"
        echo ""
        echo "主要な設定項目:"
        if command -v jq &> /dev/null; then
            echo "  プロジェクト名: $(jq -r '.project.name // "未設定"' "$config_file")"
            echo "  環境: $(jq -r '.project.environment // "未設定"' "$config_file")"
            echo "  リンティングルール: $(jq -r '.lint.rules | keys | join(", ")' "$config_file")"
            echo "  出力形式: $(jq -r '.output.format // "未設定"' "$config_file")"
        else
            warning_msg "jqコマンドがないため、詳細な設定を表示できません"
        fi
    fi
    
    echo "----------------------------------------"
}

# メイン処理
main() {
    local environment=""
    local force="false"
    
    # 引数の解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -f|--force)
                force="true"
                shift
                ;;
            development|strict|default)
                environment="$1"
                shift
                ;;
            *)
                error_exit "不明な引数: $1"
                ;;
        esac
    done
    
    # 環境が指定されていない場合
    if [[ -z "$environment" ]]; then
        echo "環境を選択してください:"
        echo "1) development - 開発環境向け"
        echo "2) strict      - 厳格設定（CI/CD向け）"
        echo "3) default     - デフォルト設定"
        echo -n "選択 (1-3): "
        read -r choice
        
        case $choice in
            1) environment="development" ;;
            2) environment="strict" ;;
            3) environment="default" ;;
            *) error_exit "無効な選択です" ;;
        esac
    fi
    
    # スクリプトのディレクトリを取得
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_dir="$(dirname "$script_dir")"
    local config_dir="$project_dir/.mdck"
    
    # 設定ファイルのパス
    local source_config=""
    case "$environment" in
        development)
            source_config="$config_dir/config-development.json"
            ;;
        strict)
            source_config="$config_dir/config-strict.json"
            ;;
        default)
            source_config="$config_dir/config.json"
            ;;
        *)
            error_exit "サポートされていない環境: $environment"
            ;;
    esac
    
    local target_config="$config_dir/config.json"
    
    # 設定ファイルの存在確認
    check_config_exists "$source_config"
    
    info_msg "環境 '$environment' の設定を適用します"
    info_msg "ソース: $source_config"
    info_msg "ターゲット: $target_config"
    
    # 設定ファイルのコピー
    copy_config "$source_config" "$target_config" "$force"
    
    # 設定の検証
    validate_config "$target_config"
    
    # 設定の表示
    show_config "$target_config"
    
    echo ""
    success_msg "設定セットアップが完了しました！"
    
    # 次のステップの案内
    echo ""
    info_msg "次のステップ:"
    echo "  1. チェックリストをリント: mdck lint"
    echo "  2. 設定を確認: mdck config --list"
    echo "  3. テンプレートを生成: mdck generate <template-id>"
}

# スクリプト実行
main "$@"