#!/usr/bin/env zsh

# SRT 配置生成器
# 此脚本动态生成 SRT 配置文件，自动获取家目录下的所有内容作为 denyRead 路径

set -euo pipefail

# Configuration
CONFIG_FILE="${HOME}/.srt-settings.json"
BACKUP_FILE="${HOME}/.srt-settings.json.backup"

# 输出颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # 无颜色

# 打印彩色输出函数
print_info() {
    echo -e "${GREEN}[信息]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 创建现有配置的备份
create_backup() {
    if [[ -f "$CONFIG_FILE" ]]; then
        print_info "正在备份现有配置文件到 $BACKUP_FILE"
        cp "$CONFIG_FILE" "$BACKUP_FILE"
    fi
}

# 获取家目录下所有目录（除了 workspaces）
get_deny_read_paths() {
    local deny_paths=()

    # 添加应该始终拒绝访问的敏感目录
    deny_paths+=("\"~/.ssh\"")
    deny_paths+=("\"~/.gnupg\"")
    deny_paths+=("\"~/.aws\"")
    deny_paths+=("\"~/.config/gcloud\"")
    deny_paths+=("\"~/.kube\"")
    deny_paths+=("\"~/.docker\"")

    # 获取家目录下所有目录，排除 workspaces 和其他需要保留的目录
    while IFS= read -r -d '' dir; do
        # 转换为带 ~ 的相对路径
        rel_path="~${dir#$HOME}"

        # 跳过 workspaces 目录和其他需要保持可访问的目录
        if [[ "$rel_path" != "~/workspaces" &&
              "$rel_path" != "~" &&
              ! "$rel_path" =~ ^~/\.Trash ]]; then
            deny_paths+=("\"$rel_path\"")
        fi
    done < <(find "$HOME" -maxdepth 1 -type d ! -path "$HOME" -print0 2>/dev/null | sort -z)

    # 输出每个路径占一行，供数组读取
    printf '%s\n' "${deny_paths[@]}"
}

# 生成 SRT 配置
generate_config() {
    print_info "正在生成 SRT 配置..."

    # 获取拒绝读取的路径
    local deny_read_paths
    deny_read_paths=($(get_deny_read_paths))

    # 生成格式正确的 JSON 配置
    {
        echo '{'
        echo '  "network": {'
        echo '    "allowedDomains": [],'
        echo '    "deniedDomains": [],'
        echo '    "allowUnixSockets": [],'
        echo '    "allowLocalBinding": false'
        echo '  },'
        echo '  "filesystem": {'
        echo '    "denyRead": ['

        # 添加路径，格式正确
        local first=true
        for path in "${deny_read_paths[@]}"; do
            if [[ "$first" == true ]]; then
                echo "      $path"
                first=false
            else
                echo "      ,$path"
            fi
        done

        echo '    ],'
        echo '    "allowWrite": ['
        echo '      "~/workspaces",'
        echo '      "/home/'"${USER}"'/workspaces",'
        echo '      "/tmp"'
        echo '    ],'
        echo '    "denyWrite": []'
        echo '  },'
        echo '  "ignoreViolations": {'
        echo '    "*": ["/usr/bin", "/System"]'
        echo '  },'
        echo '  "enableWeakerNestedSandbox": false'
        echo '}'
    } > "$CONFIG_FILE"

    print_info "配置已成功生成在 $CONFIG_FILE"
}

# 显示摘要
show_summary() {
    print_info "SRT 配置摘要："
    echo "  - 配置文件: $CONFIG_FILE"
    echo "  - 备份文件: $BACKUP_FILE"
    echo ""
    print_warning "注意：此配置会拒绝对您/home目录中大多数目录的读取访问。"
    print_warning "只有 ~/workspaces 保持可访问。"
    echo ""
    print_info "使用此配置："
    echo "  srt --settings $CONFIG_FILE <命令>"
    echo ""
    print_info "从备份恢复："
    echo "  cp $BACKUP_FILE $CONFIG_FILE"
}

# 主执行函数
main() {
    print_info "SRT 配置生成器"
    echo "================================"
    echo ""

    # 检查是否可以写入配置位置
    if ! touch "$CONFIG_FILE" 2>/dev/null; then
        print_error "无法写入 $CONFIG_FILE。请检查权限。"
        exit 1
    fi

    # 创建备份
    create_backup

    # 生成配置
    generate_config

    # 显示摘要
    show_summary
}

# 处理命令行参数
case "${1:-}" in
    -h|--help)
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  -h, --help     显示此帮助信息"
        echo "  -r, --restore  从备份恢复配置"
        echo "  -s, --show     显示当前配置"
        echo ""
        exit 0
        ;;
    -r|--restore)
        if [[ -f "$BACKUP_FILE" ]]; then
            print_info "正在从备份恢复配置..."
            cp "$BACKUP_FILE" "$CONFIG_FILE"
            print_info "配置已成功恢复。"
        else
            print_error "在 $BACKUP_FILE 找不到备份文件"
            exit 1
        fi
        exit 0
        ;;
    -s|--show)
        if [[ -f "$CONFIG_FILE" ]]; then
            print_info "当前 SRT 配置："
            cat "$CONFIG_FILE"
        else
            print_error "在 $CONFIG_FILE 找不到配置文件"
            exit 1
        fi
        exit 0
        ;;
esac

# 运行主函数
main "$@"