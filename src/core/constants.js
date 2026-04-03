// ============================================================
// ⚙️ GolemBrain Constants
// ============================================================

function parsePositiveInteger(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

/** @enum {number} 時間相關常數 (毫秒) */
const TIMINGS = Object.freeze({
    INPUT_DELAY: 800,
    SYSTEM_DELAY: 2000,
    POLL_INTERVAL: 500,
    TIMEOUT: 300000,           // 5 分鐘總超時
    BROWSER_RETRY_DELAY: 1000,
    CDP_TIMEOUT: 5000,
    ACTION_TIMEOUT_MS: parsePositiveInteger(process.env.PLAYWRIGHT_ACTION_TIMEOUT_MS, 15000),
    RETRY_BACKOFF_BASE_MS: parsePositiveInteger(process.env.PLAYWRIGHT_RETRY_BACKOFF_BASE_MS, 500),
});

/** @enum {number} 限制與閾值 */
const LIMITS = Object.freeze({
    MAX_INTERACT_RETRY: 3,
    MAX_BROWSER_RETRY: 3,
    STABLE_THRESHOLD_COMPLETE: 10,   // 已收到 BEGIN 後，停頓 10 次 (5秒) 強制截斷
    STABLE_THRESHOLD_THINKING: 60,   // 未收到 BEGIN，Thinking Mode 容忍 60 次 (30秒)
});

/** @enum {string} LLM 後端 URL */
const URLS = Object.freeze({
    GEMINI_APP: 'https://gemini.google.com/app',
    GEMINI_FALLBACKS: ['https://gemini.google.com/app?hl=zh-TW'],
    PERPLEXITY_APP: 'https://www.perplexity.ai/',
    CHATGPT_APP: 'https://chatgpt.com/',
    CLAUDE_APP: 'https://claude.ai/new',
});

/** 瀏覽器啟動參數 (環境感知) */
function getBrowserArgs() {
    const isMacOS = process.platform === 'darwin';
    const isSandboxDisabled = process.env.PLAYWRIGHT_SANDBOX === 'false';

    const args = [
        // 🔒 沙箱策略：
        // - macOS: 永遠不加 --no-sandbox（系統會自動沙箱化）
        // - Linux 容器: 允許通過 PLAYWRIGHT_SANDBOX=false 關閉沙箱
        ...(isSandboxDisabled && !isMacOS ? ['--no-sandbox'] : []),
        '--disable-dev-shm-usage',
        // - 僅在 Linux 且沙箱關閉時啟用
        ...(isSandboxDisabled && !isMacOS ? ['--disable-setuid-sandbox'] : []),
        '--window-size=1366,768',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',

        // --- 記憶體與程序最佳化 ---
        '--disable-site-isolation-trials',
        '--disable-features=IsolateOrigins,site-per-process',
        '--renderer-process-limit=1',

        // --- 停用背景通訊與服務 ---
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-component-update',

        // --- 停用多餘 UI 與媒體 ---
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-notifications',
        '--disable-animations',
    ];

    return args;
}

const BROWSER_ARGS = Object.freeze(getBrowserArgs());

/** Chrome Lock 檔案名稱 */
const LOCK_FILES = Object.freeze(['SingletonLock', 'SingletonSocket', 'SingletonCookie']);

/** 🏛️ 金字塔式分層記憶保留策略 */
const MEMORY_TIERS = Object.freeze({
    // Tier 0: 每小時原始日誌
    HOURLY_RETENTION_MS: 3 * 24 * 60 * 60 * 1000,    // 72 小時
    // Tier 1: 每日摘要
    DAILY_RETENTION_MS: 90 * 24 * 60 * 60 * 1000,     // 90 天
    DAILY_SUMMARY_CHARS: 1500,
    // Tier 2: 每月精華
    MONTHLY_RETENTION_MS: 5 * 365 * 24 * 60 * 60 * 1000, // 5 年
    MONTHLY_SUMMARY_CHARS: 3000,
    // Tier 3: 年度回顧 (永久)
    YEARLY_SUMMARY_CHARS: 5000,
    // Tier 4: 紀元里程碑 (永久)
    ERA_SUMMARY_CHARS: 8000,
});

/** 日誌保留時間 (毫秒) - 向下相容 */
const LOG_RETENTION_MS = MEMORY_TIERS.HOURLY_RETENTION_MS;

/** 🧠 各後端的 DOM Selector 組合 */
const BACKEND_SELECTORS = Object.freeze({
    gemini: {
        input: 'textarea, div[contenteditable="true"], rich-textarea > div, p[data-placeholder], .ql-editor',
        send: 'button[aria-label*="Send"], button[aria-label*="傳送"], button[aria-label*="Submit"], span[data-icon="send"], button.bg-primary',
        response: '.model-response-text, .message-content, .markdown, div[data-test-id="message-content"], .prose',
        upload: 'input[type="file"], button[aria-label*="Add image"], button[aria-label*="上傳"], button[aria-label*="圖片"]',
    },
    perplexity: {
        input: 'textarea[placeholder], div[contenteditable="true"], textarea',
        send: 'button[aria-label*="Submit"], button[type="submit"]',
        response: '.prose, .markdown, [data-testid="answer"]',
        upload: 'input[type="file"], button[aria-label*="Add"]',
    },
    chatgpt: {
        input: '#prompt-textarea, div[contenteditable="true"][data-id="root"], textarea',
        send: 'button[data-testid="send-button"], button[aria-label*="Send"], button[type="submit"]',
        response: '[data-message-author-role="assistant"] .markdown, .prose, div.text-base',
        upload: 'input[type="file"], button[aria-label*="Add"]',
    },
    claude: {
        input: 'div[contenteditable="true"].ProseMirror, div[contenteditable="true"][role="textbox"], textarea',
        send: 'button[aria-label*="Send"], button[type="submit"], button.bg-accent-main-100',
        response: 'div[data-is-streaming] .font-claude-message, .font-claude-message, .prose',
        upload: 'input[type="file"], button[aria-label*="Add"]',
    },
});

module.exports = {
    TIMINGS,
    LIMITS,
    URLS,
    BROWSER_ARGS,
    LOCK_FILES,
    LOG_RETENTION_MS,
    MEMORY_TIERS,
    BACKEND_SELECTORS,
};
