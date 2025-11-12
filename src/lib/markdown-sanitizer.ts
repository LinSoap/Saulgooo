import { visit } from 'unist-util-visit';
import type { Root, Html } from 'mdast';

/**
 * Rehype 插件：将自定义 XML 标签转换为文本节点
 * 这样可以保持原始格式，同时避免被浏览器当作 HTML 标签处理
 */
export function remarkSanitizeXmlTags() {
    return (tree: Root) => {
        visit(tree, 'html', (node: Html, _index, _parent) => {
            // 匹配自定义的 XML 风格标签
            const xmlTagPattern = /^<\/?(?:example|commentary|instruction|thinking|response|context|userRequest|editorContext|repoContext|reminderInstructions)(?:\s[^>]*)?>$/i;

            if (xmlTagPattern.exec(node.value) !== null) {
                // 将 HTML 节点转换为文本节点
                type MutableNode = Omit<Html, 'type'> & { type: string };
                (node as MutableNode).type = 'text';
                // 保持原始内容不变
            }
        });
    };
}

/**
 * 预处理 markdown 内容，转义所有看起来像 HTML 标签但不是标准 HTML 的标签
 */
export function preprocessMarkdown(content: string): string {
    // 标准 HTML 标签列表（不需要转义的）
    const standardHtmlTags = new Set([
        'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
        'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
        'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
        'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
        'em', 'embed',
        'fieldset', 'figcaption', 'figure', 'footer', 'form',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
        'i', 'iframe', 'img', 'input', 'ins',
        'kbd',
        'label', 'legend', 'li', 'link',
        'main', 'map', 'mark', 'meta', 'meter',
        'nav', 'noscript',
        'object', 'ol', 'optgroup', 'option', 'output',
        'p', 'param', 'picture', 'pre', 'progress',
        'q',
        'rp', 'rt', 'ruby',
        's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg',
        'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track',
        'u', 'ul',
        'var', 'video',
        'wbr'
    ]);

    // 在代码块外部查找并转义非标准 HTML 标签
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockDelimiter = '';

    return lines.map(line => {
        // 检测代码块边界
        if (/^```/.exec(line) !== null || /^~~~/.exec(line) !== null || line.startsWith('    ')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBlockDelimiter = /^```|^~~~/.exec(line) ? line.substring(0, 3) : '    ';
            } else if (line.startsWith(codeBlockDelimiter)) {
                inCodeBlock = false;
            }
            return line;
        }

        // 在代码块内，不处理
        if (inCodeBlock) {
            return line;
        }

        // 在代码块外，转义非标准 HTML 标签
        return line.replace(/<(\/?)([\w-]+)([^>]*)>/g, (match: string, slash: string, tagName: string, attrs: string) => {
            // 如果是标准 HTML 标签，不转义
            if (standardHtmlTags.has(tagName.toLowerCase())) {
                return match;
            }
            // 转义非标准标签
            return `&lt;${slash}${tagName}${attrs}&gt;`;
        });
    }).join('\n');
}
