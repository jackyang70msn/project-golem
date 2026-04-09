class ActionQueue {
    constructor(options = {}) {
        this.golemId = options.golemId || 'default';
        this.queue = [];
        this.isProcessing = false;
        this.memoryPressureGuard = null;
        this._deferCount = 0;
    }

    setMemoryPressureGuard(guard) {
        this.memoryPressureGuard = guard || null;
    }

    /**
     * 加入新任務到行動產線 (Action Queue)
     * @param {Object} ctx - 上下文物件
     * @param {Function} taskFn - 回傳 Promise 的執行函式 (例如 child_process.exec)
     * @param {Object} options - 選項, priority 等
     */
    async enqueue(ctx, taskFn, options = { isPriority: false }) {
        console.log(`📥 [Action Queue:${this.golemId}] 收到新行動任務、加入隊列 (Priority: ${options.isPriority})`);

        const taskItem = {
            ctx,
            taskFn,
            timestamp: Date.now(),
            isPriority: options.isPriority
        };

        if (options.isPriority) {
            this.queue.unshift(taskItem);
        } else {
            this.queue.push(taskItem);
        }

        this._processQueue();
    }

    /**
     * 內部佇列處理器 (Sequential Execution)
     */
    async _processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const task = this.queue.shift();

        const pressureSnapshot = this.memoryPressureGuard ? this.memoryPressureGuard.getSnapshot() : null;
        const pressure = pressureSnapshot && pressureSnapshot.pressure ? pressureSnapshot.pressure : 'normal';
        const shouldDeferForPressure =
            Boolean(this.memoryPressureGuard) &&
            Boolean(task) &&
            !task.isPriority &&
            // NOTE:
            // warning 不再阻塞 Action Queue，避免一般寫檔任務長時間飢餓。
            ['critical', 'fatal'].includes(pressure);

        if (shouldDeferForPressure) {
            this.queue.push(task);
            this.isProcessing = false;
            this._deferCount += 1;
            if (this._deferCount === 1 || this._deferCount % 10 === 0) {
                console.warn(
                    `⏸️ [Action Queue:${this.golemId}] 因記憶體壓力(${pressure})暫緩非優先任務，已延後 ${this._deferCount} 次。`
                );
            }
            setTimeout(() => this._processQueue(), 750);
            return;
        }

        try {
            this._deferCount = 0;
            console.log(`⚙️ [Action Queue:${this.golemId}] 從隊列取出，開始非同步執行行動任務...`);

            // 如果上層有指定發送 Typing 可以先發
            if (task.ctx && typeof task.ctx.sendTyping === 'function') {
                task.ctx.sendTyping().catch(() => { });
            }

            // 執行被封裝的物理操作
            await task.taskFn();

            console.log(`✅ [Action Queue:${this.golemId}] 行動任務非同步執行完畢。`);
        } catch (error) {
            console.error(`❌ [Action Queue:${this.golemId}] 行動任務執行失敗:`, error);
            if (task.ctx && typeof task.ctx.reply === 'function') {
                task.ctx.reply(`❌ **系統層任務執行崩潰:**\n\`\`\`\n${error.message}\n\`\`\``, { parse_mode: 'Markdown' }).catch(() => { });
            }
        } finally {
            this.isProcessing = false;

            // 稍作延遲再提取下一個任務，避免過度頻繁刷新
            setTimeout(() => this._processQueue(), 200);
        }
    }
}

module.exports = ActionQueue;
