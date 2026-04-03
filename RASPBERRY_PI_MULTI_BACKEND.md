# 樹莓派上部署多後端 Golem

## 快速步驟

### 1️⃣ 在樹莓派上拉取最新代碼

```bash
cd ~/project-golem
git pull origin main
npm install
```

### 2️⃣ 選擇後端並配置

編輯 `.env` 文件：

```bash
nano .env
```

找到並設定：

```bash
# 選一個後端（預設是 gemini）
GOLEM_BACKEND=gemini        # ← 改這個
# GOLEM_BACKEND=chatgpt
# GOLEM_BACKEND=claude
# GOLEM_BACKEND=perplexity
# GOLEM_BACKEND=ollama

# 無頭模式（樹莓派推薦）
PLAYWRIGHT_HEADLESS=true

# 或者虛擬桌面模式
GOLEM_DESKTOP_MODE=true
GOLEM_NOVNC_PORT=6080
```

### 3️⃣ 首次啟動 - 在桌面電腦上登入

**第一次選擇新後端時，需要在有瀏覽器的地方登入。**

在您的桌面電腦上：

```bash
# 先在 Windows/Mac/Linux 電腦上
PLAYWRIGHT_HEADLESS=       # 空值（有瀏覽器）
GOLEM_BACKEND=chatgpt      # 改成您要的後端

npm start
```

瀏覽器會打開，**手動登入帳號**，Cookies 自動存到 `golem_memory/`。

登入後 `Ctrl+C` 停止。

### 4️⃣ 複製到樹莓派

```bash
# 在您的電腦上，複製 golem_memory 目錄（含 Cookies）
scp -r golem_memory pi@raspberry-pi-ip:~/project-golem/
# 例如：
scp -r golem_memory pi@192.168.1.100:~/project-golem/
```

### 5️⃣ 在樹莓派上啟動

```bash
ssh pi@raspberry-pi-ip

cd ~/project-golem

# 編輯 .env，設定：
PLAYWRIGHT_HEADLESS=true
GOLEM_BACKEND=chatgpt      # 用您登入過的後端

# 啟動
./setup.sh --deploy-linux

# 或者簡單啟動
npm start
```

---

## 樹莓派的最佳實踐

### 對於每個後端的建議

| 後端 | 樹莓派適用度 | 備註 |
|------|-----------|------|
| **Gemini** | ⭐⭐⭐⭐⭐ | 推薦，免費，運行最快 |
| **Ollama** | ⭐⭐⭐⭐⭐ | 推薦，不需要瀏覽器 |
| **ChatGPT** | ⭐⭐⭐ | 可以，但 Playwright 消耗資源 |
| **Claude** | ⭐⭐⭐ | 可以，流式回應可能較慢 |
| **Perplexity** | ⭐⭐⭐⭐ | 不錯，比較穩定 |

### 記憶體優化

樹莓派記憶體有限，建議：

```bash
# .env 中限制記憶體使用
GOLEM_WORKER_MEMORY_LIMIT_MB=256   # Pi 4/5: 256-512MB
PLAYWRIGHT_HEADLESS=true            # 節省資源

# 如果還是吃緊，試試 Ollama 後端
GOLEM_BACKEND=ollama
```

### 增加 Swap

如果頻繁出現記憶體不足：

```bash
# 建立 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久啟用（編輯 /etc/fstab）
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 訪問樹莓派上的 Golem

### 方式 1：無頭模式（Command Line）

```bash
# 在樹莓派上啟動
npm start

# 在電腦上通過 Telegram / Discord 與 Golem 交互
# （假設已設定 TELEGRAM_TOKEN 或 DISCORD_TOKEN）
```

### 方式 2：虛擬桌面（noVNC）

```bash
# .env 中設定
GOLEM_DESKTOP_MODE=true
GOLEM_NOVNC_PORT=6080

# 啟動
./setup.sh --deploy-linux

# 在電腦瀏覽器訪問
http://樹莓派-IP:6080/vnc.html
```

### 方式 3：Web Dashboard

```bash
# Dashboard 預設埠 3000
http://樹莓派-IP:3000
```

---

## 故障排除

### 問題：找不到 golem_memory

**原因**：Cookie 未同步

**解決**：
```bash
# 在有瀏覽器的電腦上重新登入
PLAYWRIGHT_HEADLESS= npm start

# 手動登入，然後：
# Ctrl+C 停止

# 重新複製到樹莓派
scp -r golem_memory pi@樹莓派-IP:~/project-golem/
```

### 問題：樹莓派啟動很慢

**原因**：Playwright 初始化需要時間

**解決**：
```bash
# 使用 nohup 後台運行
cd ~/project-golem
nohup npm start > golem.log 2>&1 &

# 查看日誌
tail -f golem.log
```

### 問題：ChatGPT/Claude 無法回應

**原因**：Session 過期或 Cookies 失效

**解決**：
```bash
# 重新在桌面電腦上登入
# 然後重新同步 golem_memory 到樹莓派

# 或直接在樹莓派上清除並重新登入
rm -rf golem_memory/
PLAYWRIGHT_HEADLESS=       # 切換到有頭模式
npm start                  # 手動登入
```

---

## 自動啟動（開機自啟）

編輯 `~/.bashrc` 或 `~/.profile`：

```bash
# 在末尾加入
if [ -z "$GOLEM_STARTED" ]; then
    export GOLEM_STARTED=1
    cd ~/project-golem
    nohup npm start > golem.log 2>&1 &
    echo "✅ Golem started in background"
fi
```

或使用 systemd 服務（更推薦）：

```bash
# 建立 /etc/systemd/system/golem.service
sudo nano /etc/systemd/system/golem.service
```

內容：
```ini
[Unit]
Description=Project Golem
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/project-golem
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

啟用：
```bash
sudo systemctl daemon-reload
sudo systemctl enable golem
sudo systemctl start golem

# 查看狀態
sudo systemctl status golem

# 查看日誌
journalctl -u golem -f
```

---

## 下一步

1. **在樹莫派上試試 Gemini 後端**（最簡單）
2. **試試 Ollama**（最省資源）
3. **嘗試 ChatGPT 或 Claude**（功能最強）

祝順利！🎉
