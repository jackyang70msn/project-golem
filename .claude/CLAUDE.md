# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📋 常用指令 (Common Commands)

### 核心啟動
```bash
# 標準啟動
npm start

# 啟動 Dashboard（Web UI）
npm run dashboard

# 開發模式（自動重載）
npm run dev
```

### 設定與安裝
```bash
# 自動安裝依賴並解決 Port 衝突
./setup.sh --magic

# 直接啟動（需先執行 --magic）
./setup.sh --start

# Docker 部署（無桌面環境）
./setup.sh --deploy-docker

# Linux 無桌面部署（含 noVNC）
./setup.sh --deploy-linux
```

### 測試與品質檢查
```bash
# 執行所有測試
npm test

# 測試覆蓋率報告
npm run test:coverage

# 安全測試（safeguard）
npm run test:security

# 架構邊界檢查
npm run arch:check

# 依賴安全審計
npm audit --omit=dev --audit-level=high
```

### 診斷與構建
```bash
# 系統診斷
npm run doctor

# 構建 Dashboard（web-dashboard）
npm run build
```

---

## 🏗️ 系統架構概述 (Architecture Overview)

### 分層結構 (Layered Architecture)

```
project-golem/
├── apps/
│   ├── runtime/          # 核心運行時（入口點：apps/runtime/index.js）
│   └── dashboard/        # Dashboard 插件層（dashboard UI）
├── src/
│   ├── core/            # 核心邏輯（Brain、Conversation、Message 管理）
│   ├── managers/        # 管理器層（技能、自主性、聊天日誌等）
│   ├── memory/          # 金字塔記憶系統
│   ├── skills/          # 技能膠囊（可熱載入）
│   ├── services/        # 外部服務適配器（Browser、LLM、API）
│   ├── infrastructure/  # 系統探測與環保適配器
│   ├── bridges/         # 通訊橋接（Telegram、Discord）
│   ├── runtime/         # 運行時管理（進程控制、內存壓力）
│   └── mcp/            # MCP 客戶端集成
├── packages/            # 可獨立版本化的核心模組
│   ├── memory/         # 記憶引擎 facade
│   ├── protocol/       # GOLEM_PROTOCOL 協議系統
│   └── security/       # 安全防護與命令守護
├── web-dashboard/       # Web UI + API 路由（Express）
├── infra/              # 基礎設施與部署模板
└── index.js, dashboard.js  # 相容性 shim（轉發到 apps/）
```

### 核心概念

**Browser-in-the-Loop**: Golem 使用 Playwright 自動化控制瀏覽器，直接操控 Web Gemini 以取得超過 1M token 的上下文窗口，規避標準 API 限制。

**GOLEM_PROTOCOL**: AI 的結構化回應格式（JSON in Markdown），NeuroShunter 解析這些指令決定何時回覆、記憶或執行技能。

**金字塔記憶**: 5 層壓縮機制（小時 → 日 → 月 → 年 → 紀元）確保 50 年記憶僅佔 3MB。

**技能膠囊**: 模組化的功能封裝，支援熱載入與 AI 自學（通過沙箱代碼執行）。

---

## 🔑 關鍵邊界與守則 (Architecture Boundaries)

### 分層邊界（可通過 `npm run arch:check` 驗證）

- **src/* 不得導入 apps/**
- **packages/* 不得導入 apps/**
- **跨套件導入被禁止**（packages/A → packages/B）

### Browser-in-the-Loop 原則

- **勿改寫 GolemBrain**: 不要將其轉換為官方 REST API。Golem 的核心價值在於 Playwright 瀏覽器自動化。
- **熱載入技能**: 新技能應放在 `src/skills/` 作為獨立模組。
- **協議遵守**: 所有 AI 回應必須遵循 GOLEM_PROTOCOL（`packages/protocol` 定義）。

### 記憶系統

- **修改時保留壓縮邏輯**: `src/memory/` 中的壓縮機制確保「50 年保存」承諾。
- **敏感資料隱私**: `golem_memory/` 資料夾包含 Google Cookie，禁止提交到版控。
- **記憶路徑**: 系統使用 LanceDB（默認）或 SQLite（日記）存儲。

---

## 📚 核心領域邏輯結構 (Core Business Logic)

### src/core/
主要編排層，不應包含深業務邏輯：
- **GolemBrain**: LLM 和瀏覽器交互的中樞
- **ConversationManager**: 對話狀態與防抖隊列
- **UniversalContext**: 跨平台邏輯抽象（抽象 Telegram/Discord/Web 通訊差異）
- **NeuroShunter**: 解析 GOLEM_PROTOCOL 並決定動作分流

### src/managers/
特定功能的管理器：
- **SkillManager**: 技能熱載入與執行
- **AutonomyManager**: 自主行動與排程
- **ChatLogManager**: 聊天日誌與分層存儲

### src/services/
外部系統適配器：
- **OllamaClient**: 本地模型支持
- **OpticNerve**: 視覺輸入（截圖分析）
- **KeyChain**: 敏感憑證存儲與管理

### src/memory/
金字塔記憶實現：
- **LanceDBProDriver**: 向量檢索引擎（在 packages/memory 中實現）
- **ExperienceMemory**: 經驗層記憶壓縮

---

## 🛠️ 技能開發指南 (Skill Development)

### 技能結構
技能是獨立模組，位於 `src/skills/`，支援：
- **核心技能** (`src/skills/core/`): 系統內置功能
- **自定義技能**: 用戶或 AI 生成的擴展

### 實現步驟
1. 創建文件 `src/skills/<skillname>.js`
2. 遵循 `GOLEM_PROTOCOL` 格式（JSON wrapped in Markdown）
3. 通過 `SkillManager` 熱載入（無需重啟）
4. AI 可通過 `/learn` 指令自動生成新技能

### 協議示例
```json
{
  "REPLY": "user-facing message",
  "MEMORY": "long-term memory entry",
  "ACTION": {
    "type": "skill_name",
    "params": { "key": "value" }
  }
}
```

---

## 🧠 記憶系統運作方式 (Memory System)

### 存儲層次
1. **Tier 0**: 每小時原始日誌
2. **Tier 1**: 每日摘要
3. **Tier 2**: 每月彙整
4. **Tier 3**: 年度回顧
5. **Tier 4**: 紀元里程碑

### 存儲位置
- **向量記憶**: `golem_memory/lancedb-pro/` 或 `golem_memory/vectors/`
- **日記 DB**: `golem_memory/diary-book.db`（SQLite WAL 模式）
- **敏感檔案**: Google Cookies, API tokens

### 自動輪轉（Diary Rotation）
- 超過 7 天的原始日記自動壓縮為週摘要
- API 端點支持手動觸發：`POST /api/diary/rotate`
- 備份與恢復：`POST /api/diary/backup`、`POST /api/diary/restore`

### 環境配置
```env
DIARY_RAW_RETENTION_DAYS=7
DIARY_WEEKLY_RETENTION_DAYS=365
DIARY_MONTHLY_RETENTION_DAYS=1825
DIARY_ROTATE_MIN_INTERVAL_MS=300000
```

---

## 🔐 安全與隱私 (Security & Privacy)

### 禁止事項
- ❌ **勿提交** `golem_memory/` 至版控
- ❌ **勿在根目錄運行** root/admin 身份（生產環境）
- ❌ **勿暴露** `.env` 中的 API keys 與 tokens

### 防護機制
- **CommandSafeguard** (`packages/security`): 命令白名單與注入防護
- **SecurityManager** (`packages/security`): 敏感操作日誌與審計
- **KeyChain**: 安全存儲憑證（加密存儲，隔離訪問）

### 測試安全防護
```bash
npm run test:security  # 運行 safeguard.test.js
```

---

## 🌐 外部整合 (External Integrations)

### 通訊平台
- **Telegram**: Grammy 框架 + TelegramBotFactory
- **Discord**: discord.js 庫
- **Web**: Express + Socket.io（Dashboard）

### LLM 後端
- **Google Gemini**: Playwright Browser-in-the-Loop（默認）
- **Ollama**: 本地/私有部署（`GOLEM_BACKEND=ollama`）

### MCP (Model Context Protocol)
Golem 支援 MCP Server 集成（如 NotebookLM）：
- 配置位置: `src/mcp/MCPManager.js`
- 使用指南: `docs/MCP-使用與開發指南.md`

### 嵌入向量 (Embedding)
- **本地**: `@xenova/transformers`（邊緣執行）
- **Ollama**: `GOLEM_EMBEDDING_PROVIDER=ollama`

---

## 📖 重要文檔清單 (Key Documentation)

| 文檔 | 說明 |
|-----|------|
| `docs/AGENTS.md` | **[必讀]** 編碼代理指南與架構模式 |
| `docs/大型產品架構藍圖.md` | 產品化分層與遷移路線圖 |
| `infra/architecture/README.md` | 架構治理規範與自動檢查 |
| `docs/記憶系統架構說明.md` | 金字塔壓縮原理深潛 |
| `docs/Web-Dashboard-使用說明.md` | Web UI 各分頁詳細說明 |
| `docs/開發者實作指南.md` | 新技能與協議實現指南 |
| `docs/MCP-使用與開發指南.md` | MCP Server 配置與調用 |

---

## ✅ 修改架構代碼前的檢查清單 (Pre-Modification Checklist)

修改以下核心層時**必須先讀取對應文檔**：

- [ ] **修改 src/core/GolemBrain.js**: 讀取 `docs/AGENTS.md`
- [ ] **修改記憶系統**: 讀取 `docs/記憶系統架構說明.md`
- [ ] **添加新技能**: 讀取 `docs/開發者實作指南.md`
- [ ] **架構重構**: 讀取 `docs/大型產品架構藍圖.md` + 執行 `npm run arch:check`
- [ ] **修改 packages/**: 確保不違反跨套件邊界規則
- [ ] **協議修改**: 讀取 `FILESYSTEM_PERMISSIONS_UPGRADE.md` (2026-04-01 新增)

---

## 🔄 Sprint 流程 (Sprint Workflow)

### 當前 Sprint
檢查 `.claude/CLAUDE.md` 的「當前 Sprint 目標」欄位了解進行中的工作。

### 結束時動作
- 執行 `npm run arch:check` 驗證邊界
- 運行 `npm test && npm run test:coverage`
- 提交 Sprint 交接摘要

---

## 💡 常見工作流程 (Common Workflows)

### 實現新技能
1. 創建 `src/skills/<name>.js`
2. 實現協議格式
3. 通過 `SkillManager.loadSkills()` 熱載入
4. 編寫測試驗證

### 修改核心邏輯
1. 讀取相關 ADR（若存在）
2. 確認邊界完整性
3. 修改代碼
4. 執行 `npm run arch:check`
5. 執行 `npm test`

### 部署到生產
1. 確保所有測試通過
2. 檢查安全審計 (`npm audit`)
3. 執行診斷 (`npm run doctor`)
4. 選擇部署方式：
   - Docker: `./setup.sh --deploy-docker`
   - Linux headless: `./setup.sh --deploy-linux`

---

## 📊 開發工具與除錯

### 日誌與診斷
- **系統診斷**: `npm run doctor` （檢查配置、依賴、環境）
- **錯誤日誌**: 檢查 `golem_memory/error-ledger.json`
- **Console 攔截**: `src/utils/ConsoleInterceptor.js`

### 性能監控
- **MemoryPressureGuard**: 防止內存溢出
- **RuntimeController**: 進程生命周期管理
- **EventBus**: 系統事件追蹤

### 調試技巧
- 使用 `nodemon --expose-gc` 自動重載與垃圾回收
- 檢查 `src/managers/ToolScanner.js` 了解系統可用工具
- 查看 `web-dashboard/routes/` 了解 API 端點

---

## 🔗 相關資源

- **官方倉庫**: [Project Golem on GitHub](https://github.com/arvincreator/project-golem)
- **Line 社群**: [Project Golem AI 系統代理群](https://line.me/ti/g2/wqhJdXFKfarYxBTv34waWRpY_EXSfuYTbWc4OA)
- **Discord 社群**: [Project Golem 官方頻道](https://discord.gg/bC6jtFQra)

---

**最後更新**: 2026-04-01
