/**
 * 统一的文件扩展名到编程语言的映射配置
 * 用于代码高亮和文件类型判断
 */

// 扩展名 -> Shiki语言标识符
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    mjs: 'javascript',
    cjs: 'javascript',

    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',

    // Python
    py: 'python',
    pyw: 'python',
    pyi: 'python',

    // Java/Kotlin
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',

    // C/C++
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',

    // C#
    cs: 'csharp',

    // Go
    go: 'go',

    // Rust
    rs: 'rust',

    // Ruby
    rb: 'ruby',

    // PHP
    php: 'php',

    // Shell
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'fish',

    // Config files
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    ini: 'ini',

    // Markdown
    md: 'markdown',
    mdx: 'mdx',

    // SQL
    sql: 'sql',

    // Docker
    dockerfile: 'dockerfile',

    // Others
    graphql: 'graphql',
    gql: 'graphql',
    vue: 'vue',
    svelte: 'svelte',
    r: 'r',
    swift: 'swift',
    dart: 'dart',
    lua: 'lua',
    perl: 'perl',
    scala: 'scala',
    elm: 'elm',
    clojure: 'clojure',
};

// 所有可以当作代码文件处理的扩展名
export const CODE_EXTENSIONS = Object.keys(EXTENSION_TO_LANGUAGE);

// MIME类型 -> 文件类型分类
export const TEXT_MIME_TYPES = new Set([
    // 标准文本类型（所有 text/* 都会被自动包含）
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
    'application/x-javascript',
    'application/x-yaml',
    'application/yaml',
    'application/x-sh',
    'application/x-python',
    'application/x-httpd-php',
    'application/rtf',
    'application/sql',
    'text/x-c',
    'text/x-c++',
    'text/x-java',
    'text/x-python',
    'text/x-go',
    'text/x-rust',
    'text/x-sh',
    'text/csv',
    'message/rfc822',
]);

/**
 * 根据文件扩展名获取语言标识符
 */
export function getLanguageFromExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return EXTENSION_TO_LANGUAGE[ext] ?? 'text';
}
