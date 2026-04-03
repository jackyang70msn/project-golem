# 多後端支援 (ChatGPT / Claude / Gemini / Perplexity)

**狀態**: ✅ 已實現
**實現日期**: 2026-04-01

---

## 概述

Project Golem 現已支援以下 4 個 LLM 後端：

| 後端 | URL | 描述 | 登入需求 |
|------|-----|------|---------|
| **Gemini** (預設) | https://gemini.google.com/app | Google Gemini Web | Google 帳號 |
| **ChatGPT** | https://chatgpt.com/ | OpenAI ChatGPT Web | OpenAI 帳號 |
| **Claude** | https://claude.ai/new | Anthropic Claude Web | Anthropic 帳號 |
| **Perplexity** | https://www.perplexity.ai/ | Perplexity Web | Perplexity 帳號 |
| **Ollama** | 本地 | 本地 LLM API | 無需帳號 |

---

## 快速開始

### 1️⃣ 設定後端

在 `.env` 文件中設定：

```bash
# 選擇其中一個
GOLEM_BACKEND=gemini      # 預設
GOLEM_BACKEND=chatgpt
GOLEM_BACKEND=claude
GOLEM_BACKEND=perplexity
GOLEM_BACKEND=ollama
```

### 2️⃣ 首次啟動（有頭模式）

第一次使用新後端時，需要手動登入：

```bash
# 編輯 .env，確保：
PLAYWRIGHT_HEADLESS=       # 空值 = 有頭模式（有瀏覽器視窗）
GOLEM_BACKEND=chatgpt      # 改成您想使用的後端

# 啟動
npm start
```

瀏覽器會打開，**手動登入您的帳號**，Cookies 會自動存到 `golem_memory/`。

### 3️⃣ 之後啟動（無頭模式）

登入一次後，可以切換到無頭模式：

```bash
# 編輯 .env
PLAYWRIGHT_HEADLESS=true  # 無頭模式

# 重新啟動
npm start
```

---

## 各後端詳細說明

### ChatGPT (OpenAI)

**優點**：
- 功能完整（GPT-4、Vision 等）
- 回應品質高
- 穩定性好

**注意事項**：
- 需要有效的 OpenAI 帳號 + 付費額度
- 首次登入可能需要驗證電話或郵件
- 有 Cloudflare 反爬保護，但 Playwright + stealth 模式通常可過

**DOM Selector**：
```
Input:    #prompt-textarea
Send:     button[data-testid="send-button"]
Response: [data-message-author-role="assistant"]
```

---

### Claude (Anthropic)

**優點**：
- 長文本理解能力強
- 對中文支援良好
- 回應詳細

**注意事項**：
- 使用 ProseMirror 編輯器（contenteditable div）
- 回應流式傳輸，需要等待 `data-is-streaming` 完成
- Anthropic 會監測異常登入，首次登入可能受限

**DOM Selector**：
```
Input:    div[contenteditable="true"].ProseMirror
Send:     button[aria-label*="Send"]
Response: .font-claude-message
```

---

### Gemini (Google)

**優點**：
- 完全免費
- 整合 Google 生態（搜尋、圖片等）
- 支援 1M token 上下文窗口

**注意事項**：
- 需要 Google 帳號
- 首次啟動需要解 CAPTCHA
- 系統 Prompt 注入時需要一些時間

**DOM Selector**：
```
Input:    textarea, div[contenteditable="true"]
Send:     button[aria-label*="Send"]
Response: .markdown, .prose
```

---

### Perplexity

**優點**：
- 專為搜尋最佳化
- 回應包含來源引用
- 無需付費即可使用

**注意事項**：
- 網路搜尋功能可能增加延遲
- DOM 結構較簡單，穩定性好

**DOM Selector**：
```
Input:    textarea[placeholder]
Send:     button[aria-label*="Submit"]
Response: .prose, .markdown
```

---

### Ollama (本地)

**優點**：
- 完全離線，隱私保護最好
- 無需付費
- 支援多種開源模型

**注意事項**：
- 需要先安裝 Ollama
- 推薦模型：`llama2`, `neural-chat`, `mistral`
- 回應速度取決於本機硬體

**設定**：
```bash
# 安裝 Ollama
brew install ollama  # macOS
# 或下載 https://ollama.ai

# 啟動 Ollama 服務
ollama serve

# 在另一個終端啟動 Golem
GOLEM_BACKEND=ollama npm start
```

---

## 故障排除

### 問題 1️⃣：登入失敗 / CAPTCHA

**原因**：Playwright 被偵測為自動化工具

**解決方案**：
1. 確保使用最新版本的 Playwright
2. 手動登入時勾選「信任此設備」
3. 檢查網路是否被限制（VPN/代理）

### 問題 2️⃣：回應無法讀取

**原因**：DOM Selector 不符合最新版本

**解決方案**：
1. 檢查 `golem_selectors.json` 中是否有快取的 selector
2. 刪除快取重新開始：`rm golem_selectors.json`
3. 確保設定的後端與實際使用的一致

### 問題 3️⃣：無頭模式閃退

**原因**：Session 過期或 Cookies 失效

**解決方案**：
1. 刪除 Cookie 並重新登入：`rm -rf golem_memory/`
2. 改為有頭模式重新登入
3. 檢查後端網站是否有改版

### 問題 4️⃣：超時 (Timeout)

**原因**：網路慢或頁面載入慢

**解決方案**：
```bash
# 增加超時時間（毫秒）
PLAYWRIGHT_ACTION_TIMEOUT_MS=30000 npm start

# 或在 .env 中設定
PLAYWRIGHT_ACTION_TIMEOUT_MS=30000
```

---

## 實現細節

### 架構修改

修改的三個文件：

1. **`src/core/constants.js`**
   - 新增 `URLS.CHATGPT_APP` 和 `URLS.CLAUDE_APP`
   - 新增 `BACKEND_SELECTORS` 物件，包含各後端的 DOM selector 組

2. **`src/config/index.js`**
   - 修改 `normalizeBackend()` 接受新的後端值

3. **`src/core/GolemBrain.js`**
   - `_navigateToTarget()` 新增 `chatgpt` 和 `claude` 分支
   - `init()` 方法在導航後套用對應的 selector 組
   - `_resetConversation()` 更新日誌訊息

### 沒有修改的文件

- `PageInteractor.js` — 邏輯不變，只是 selector 值從常數中讀取
- `DOMDoctor.js` — 完全不受影響
- Protocol 系統 — 與後端無關

---

## 測試方案

### 測試 ChatGPT 後端

```bash
# 1. 編輯 .env
GOLEM_BACKEND=chatgpt
PLAYWRIGHT_HEADLESS=

# 2. 啟動，手動登入 OpenAI
npm start

# 3. 登入後，Ctrl+C 停止

# 4. 編輯 .env
PLAYWRIGHT_HEADLESS=true

# 5. 重新啟動，發送測試訊息
npm start

# 在 Telegram / Discord 發送：
# "你好，請自我介紹一下"
```

預期輸出：ChatGPT 的回應應被正確捕獲。

### 測試 Claude 後端

步驟相同，只需改 `GOLEM_BACKEND=claude`。

---

## 已知限制

1. **不支援多模型切換**
   - 目前每個後端只能用默認模型
   - 若要用不同模型，需要手動在網站上切換，重新啟動後會記住

2. **DOMDoctor 自動修復需要 API key**
   - 若沒有 Gemini API key，selector 失敗時不會自動修復
   - 但系統會嘗試 fallback selector，大多數情況下能運作

3. **登入狀態管理**
   - Cookie 存在 `golem_memory/Default/` (Chromium 標準路徑)
   - Session 過期時需要重新登入（哪怕在有頭模式下）

---

## 建議使用場景

| 場景 | 推薦後端 | 原因 |
|------|---------|------|
| 通用對話 | Gemini | 免費、穩定、1M token |
| 代碼協助 | ChatGPT | GPT-4 能力強 |
| 長文本總結 | Claude | 上下文窗口大、理解能力強 |
| 網路搜尋 | Perplexity | 專業搜尋能力 |
| 隱私優先 | Ollama | 完全本地離線 |
| 樹莓派部署 | Ollama | 無需瀏覽器資源 |

---

## 更新日誌

- **2026-04-01**: 初始版本，支援 4 個網頁版後端 (Gemini, ChatGPT, Claude, Perplexity)
