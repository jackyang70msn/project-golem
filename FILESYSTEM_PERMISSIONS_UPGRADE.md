# Filesystem Access Upgrade (方案 B 實現)

**日期**: 2026-04-01
**狀態**: ✅ 已實現
**變更等級**: 🚨 破壞性變更（移除第 8 條協議限制）

---

## 📋 改動摘要

### 移除的限制
**原第 8 條協議**：
```
SKILL BOUNDARY: You are STRICTLY FORBIDDEN from autonomously inspecting,
scanning, or loading any files in 'src/skills/'. You DO NOT HAVE A PHYSICAL
BODY or FILESYSTEM presence; you only exist within this conversation.
```

### 新增的能力
**新第 8 條協議**：
```
FILESYSTEM ACCESS (新增): You now have direct read/write access to the filesystem.
- Allowed directories: ./golem_memory/, ./config/, ./data/, ./logs/
- CRITICAL: ALWAYS validate and normalize paths before any operation
- Use the 'command' action type to execute Node.js file operations via shell
```

---

## 🔧 修改文件列表

### 1. `packages/protocol/ProtocolFormatter.js`

**修改位置**: `buildEnvelope()` 方法（第 102 行）

**變更**:
- ✅ 移除舊第 8 條（SKILL BOUNDARY）
- ✅ 新增新第 8 條（FILESYSTEM ACCESS）
- ✅ 重新編號後續條款（原 9、10 變為 9、10）

**新增第 8 條內容**:
```javascript
8. FILESYSTEM ACCESS (新增): You now have direct read/write access to the filesystem.
   - Allowed directories: ./golem_memory/, ./config/, ./data/, ./logs/
   - CRITICAL: ALWAYS validate and normalize paths before any operation
   - DO NOT attempt to write to system directories, parent directories, or sensitive locations
   - Use the 'command' action type to execute Node.js file operations via shell
   - Example: {"action": "command", "parameter": "node -e 'const fs=require(\"fs\"); fs.writeFileSync(\"./config/myfile.json\", JSON.stringify({...}))'"}
```

**修改位置 2**: `buildSystemPrompt()` 方法中的 `superProtocol` 變數（第 260 行）

**新增段落**:
```javascript
4.5 🗂️ FILESYSTEM OPERATIONS (NEW CAPABILITY):
- You now have direct filesystem read/write capabilities in allowed directories.
- **Allowed Base Paths**: ./golem_memory/, ./config/, ./data/, ./logs/
- **Critical Safety Rules**:
  1. ALWAYS use path.resolve() and path.normalize() to validate paths
  2. NEVER allow path traversal (../, /etc/, /system, absolute paths outside project)
  3. Use path.isAbsolute() check - reject any absolute paths
  4. Keep operations within allowed directories only
- **Recommended Methods**:
  - Reading: `node -e 'const fs=require("fs"); console.log(fs.readFileSync("./config/file.json", "utf8"))'`
  - Writing: `node -e 'const fs=require("fs"); fs.writeFileSync("./data/out.json", JSON.stringify({...}))'`
  - Directory ops: `node -e 'const fs=require("fs"); console.log(fs.readdirSync("./golem_memory/"))'`
- **Path Validation Example** (詳見下文)
- **Use via command action**: {"action": "command", "parameter": "node -e '...'"}
```

---

## 💡 使用示例

### 讀取文件

```json
[GOLEM_ACTION]
{
  "action": "command",
  "parameter": "node -e 'const fs=require(\"fs\"); console.log(fs.readFileSync(\"./golem_memory/config.json\", \"utf8\"))'"
}
```

### 寫入文件

```json
[GOLEM_ACTION]
{
  "action": "command",
  "parameter": "node -e 'const fs=require(\"fs\"); fs.writeFileSync(\"./data/output.json\", JSON.stringify({name: \"test\", value: 123}))'"
}
```

### 列出目錄

```json
[GOLEM_ACTION]
{
  "action": "command",
  "parameter": "node -e 'const fs=require(\"fs\"); console.log(fs.readdirSync(\"./golem_memory/\"))'"
}
```

### 安全的路徑驗證（Agent 應遵守）

```javascript
const path = require('path');
const userPath = './golem_memory/myfile.json';

// 1. 規範化路徑
const normalized = path.resolve(userPath);

// 2. 檢查絕對路徑
if (path.isAbsolute(userPath)) {
    throw new Error('❌ 禁止使用絕對路徑！');
}

// 3. 檢查路徑遍歷
const allowedBase = path.resolve('./golem_memory');
if (!normalized.startsWith(allowedBase)) {
    throw new Error('❌ 路徑遍歷攻擊被阻止！');
}

// ✅ 安全，可以讀寫
```

---

## ⚠️ 安全邊界 (Safety Boundaries)

### 允許的操作
✅ 讀取 `./golem_memory/` 下的檔案
✅ 寫入 `./config/` 下的配置
✅ 創建 `./data/` 下的臨時檔案
✅ 寫入 `./logs/` 下的日誌

### 禁止的操作
❌ 訪問 `/etc/`, `/system`, `/root` 等系統目錄
❌ 路徑遍歷 (`../../../etc/passwd`)
❌ 刪除核心檔案 (`src/`, `packages/`)
❌ 讀取敏感憑證 (系統環境變數)

### 執行層防護
即使 Agent 嘗試違反邊界，CommandHandler 應在運行時檢查路徑：

```javascript
// 建議在 CommandHandler 或 Executor 中新增驗證層
const validatePath = (userPath) => {
    const path = require('path');
    const allowedDirs = ['./golem_memory/', './config/', './data/', './logs/'];

    const normalized = path.resolve(userPath);
    const isAllowed = allowedDirs.some(dir =>
        normalized.startsWith(path.resolve(dir))
    );

    if (!isAllowed) {
        throw new Error(`⛔ 路徑 "${userPath}" 超出允許範圍`);
    }
};
```

---

## 🔄 向後相容性

### 對現有代碼的影響
- **技能系統**: ✅ 無影響（技能仍通過 SkillHandler 加載）
- **指令執行**: ✅ 無影響（CommandHandler 邏輯不變）
- **記憶系統**: ✅ 無影響（保留原有行為）
- **通訊平台**: ✅ 無影響（Telegram、Discord 集成不變）

### 受影響的服務
- Agent 的系統 Prompt（已更新）
- 協議驗證邏輯（新增路徑檢查）

---

## 📝 測試清單

- [ ] 驗證 Agent 可以讀取 `./golem_memory/` 中的檔案
- [ ] 驗證 Agent 可以寫入 `./data/` 中的檔案
- [ ] 驗證路徑遍歷防護有效（拒絕 `../../../etc/passwd`）
- [ ] 驗證絕對路徑被拒絕（拒絕 `/etc/passwd`）
- [ ] 驗證現有技能功能正常
- [ ] 驗證指令執行正常
- [ ] 檢查日誌中是否有異常警告

---

## 🚀 後續改進建議

1. **運行時路徑驗證** (Priority: High)
   - 在 CommandHandler 或 Executor 中新增驗證層
   - 記錄所有文件操作到審計日誌

2. **沙盒模式** (Priority: Medium)
   - 考慮使用 Node.js `vm` 模塊限制執行環境
   - 或使用容器化運行 Agent 命令

3. **權限模型** (Priority: Low)
   - 引入基於角色的權限系統
   - 為不同的 Agent 分配不同的目錄存取權限

---

## 📚 相關文檔

- [核心協議完整說明](packages/protocol/README.md)
- [ProtocolFormatter 實現](packages/protocol/ProtocolFormatter.js)
- [安全防護指南](docs/AGENTS.md)

---

**實現者**: Claude Code
**最後更新**: 2026-04-01
