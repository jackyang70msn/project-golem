const ResponseParser = require('../../src/utils/ResponseParser');
const MultiAgentHandler = require('../../src/core/action_handlers/MultiAgentHandler');
const SkillHandler = require('../../src/core/action_handlers/SkillHandler');
const CommandHandler = require('../../src/core/action_handlers/CommandHandler');
const fs = require('fs');
const path = require('path');

function hasFileSuccessClaim(replyText = '') {
    return /(已成功建立|已建立|已生成|已成功生成|已寫入|successfully\s+(created|generated|written)|has been\s+(created|generated|written))/i.test(replyText);
}

function extractClaimedPaths(replyText = '') {
    if (!replyText) return [];
    const matches = replyText.match(/(?:\.\/)?(?:logs|data|config|golem_memory)\/[A-Za-z0-9._\-\/]+\.[A-Za-z0-9]+/g) || [];
    const unique = new Set();
    for (const raw of matches) {
        const cleaned = String(raw || '').trim().replace(/^[`'"]+|[`'".,!?;:]+$/g, '');
        if (!cleaned) continue;
        const rel = cleaned.startsWith('./') ? cleaned : `./${cleaned}`;
        unique.add(rel);
    }
    return Array.from(unique);
}

function actionMentionsPath(actions = [], relPath = '') {
    if (!relPath || !Array.isArray(actions)) return false;
    const normalizedRel = relPath.replace(/\\/g, '/');
    const bareRel = normalizedRel.replace(/^\.\//, '');
    const baseName = path.basename(normalizedRel);

    return actions.some((act) => {
        if (!act || typeof act !== 'object') return false;
        const chunks = [
            act.cmd,
            act.parameter,
            act.command,
            typeof act.args === 'string' ? act.args : '',
            typeof act.summary === 'string' ? act.summary : '',
        ]
            .filter(Boolean)
            .map((x) => String(x));

        if (chunks.length === 0) return false;
        const merged = chunks.join('\n');
        return merged.includes(normalizedRel) || merged.includes(bareRel) || merged.includes(baseName);
    });
}

function applyFileClaimGuard(replyText = '', actions = []) {
    if (!replyText || !hasFileSuccessClaim(replyText)) return { replyText, mismatches: [] };
    const claimedPaths = extractClaimedPaths(replyText);
    if (claimedPaths.length === 0) return { replyText, mismatches: [] };

    const mismatches = claimedPaths.filter((relPath) => {
        const absPath = path.resolve(process.cwd(), relPath);
        const exists = fs.existsSync(absPath);
        const pendingWrite = actionMentionsPath(actions, relPath);
        return !exists && !pendingWrite;
    });

    if (mismatches.length === 0) return { replyText, mismatches: [] };

    const mismatchText = mismatches.map((p) => `- ${p}`).join('\n');
    const guardedReply = `${replyText}\n\n⚠️ [防呆校驗] 以下檔案目前尚未在本機確認存在，前述敘述可能為預估：\n${mismatchText}`;
    return { replyText: guardedReply, mismatches };
}

// ============================================================
// 🧬 NeuroShunter (神經分流中樞 - 核心路由器)
// ============================================================
class NeuroShunter {
    static async dispatch(ctx, rawResponse, brain, controller, options = {}) {
        let textToParse = rawResponse;
        let attachments = options.attachments || [];

        // 📥 [v9.1.10] 支援結構化回應物件 { text, attachments }
        if (rawResponse && typeof rawResponse === 'object' && !Array.isArray(rawResponse)) {
            textToParse = rawResponse.text || "";
            attachments = [...attachments, ...(rawResponse.attachments || [])];
        }

        const parsed = ResponseParser.parse(textToParse);
        let shouldSuppressReply = options.suppressReply === true;

        // 🎯 [v9.1.13] 靜默模式自癒：如果沒有後續動作 (Action)，代表任務結束，強制解除靜默以顯示最終回覆
        if (shouldSuppressReply && parsed.actions.length === 0) {
            console.log(`📢 [NeuroShunter] 偵測到任務結束或無後續動作，自動解除靜默模式。`);
            shouldSuppressReply = false;
        }

        // 核心：偵測 [INTERVENE] 標籤以實現觀察者模式自主介入
        if (textToParse.includes('[INTERVENE]')) {
            console.log(`🚀 [NeuroShunter] 偵測到 AI 自主介入請求 [INTERVENE]！`);
            shouldSuppressReply = false;
        }

        if (parsed.reply && parsed.reply.includes('[INTERVENE]')) {
            parsed.reply = parsed.reply.replace(/\[INTERVENE\]/g, '').trim();
        }
        
        // 🧯 防呆：回覆若宣稱檔案已建立，先做實體存在檢查，避免幻覺回報成功。
        if (parsed.reply) {
            const guarded = applyFileClaimGuard(parsed.reply, parsed.actions);
            if (guarded.mismatches.length > 0) {
                console.warn(`⚠️ [NeuroShunter] 檔案宣稱校驗失敗: ${guarded.mismatches.join(', ')}`);
                parsed.reply = guarded.replyText;
            }
        }

        // 1. 處理長期記憶寫入
        if (parsed.memory) {
            console.log(`[GOLEM_MEMORY]\n${parsed.memory}`);
            await brain.memorize(parsed.memory, { type: 'fact', timestamp: Date.now() });
        }

        // 1. 處理直接回覆 (讓 AI 的解說文字在行動之前出現)
        if (parsed.reply && !shouldSuppressReply) {
            let finalReply = parsed.reply;
            if (ctx.platform === 'telegram' && ctx.shouldMentionSender) {
                finalReply = `${ctx.senderMention} ${parsed.reply}`;
            }
            console.log(`[TERMINAL] 🤖 [Golem] 說: ${finalReply}${attachments.length > 0 ? ' 📎 含有附件' : ''}`);

            // ✨ [Log] 記錄 AI 回應
            if (brain && typeof brain._appendChatLog === 'function') {
                brain._appendChatLog({
                    sender: 'Golem',
                    content: finalReply,
                    type: 'ai',
                    role: 'Assistant',
                    isSystem: false,
                    attachments: attachments
                });
            }

            // 附件處理：若無附件則維持單參數呼叫，相容既有上下文與測試
            if (attachments.length > 0) {
                await ctx.reply(finalReply, { attachments: attachments });
            } else {
                await ctx.reply(finalReply);
            }
        } else if (parsed.reply && shouldSuppressReply) {
            console.log(`🤫 [NeuroShunter] 檢測到靜默模式，已攔截回覆內容。`);
        }

        // 2. 處理結構化 Action 分配 (讓批准視窗在回覆之後彈出)
        if (parsed.actions.length > 0) {
            console.log(`[GOLEM_ACTION] (${shouldSuppressReply ? 'Silent' : 'Normal'})\n${JSON.stringify(parsed.actions, null, 2)}`);
            const normalActions = [];

            for (const act of parsed.actions) {
                switch (act.action) {
                    case 'multi_agent':
                        await MultiAgentHandler.execute(ctx, act, controller, brain);
                        break;
                    default:
                        // 檢查是否為動態擴充技能
                        const isSkillHandled = await SkillHandler.execute(ctx, act, brain);
                        if (!isSkillHandled) {
                            // 若不是已知框架 Action 和非動態技能，則視為底層 Shell 指令
                            normalActions.push(act);
                        }
                        break;
                }
            }

            // 處理剩餘的終端指令序列並自動啟動回饋循環 (Feedback Loop)
            if (normalActions.length > 0) {
                await CommandHandler.execute(ctx, normalActions, controller, brain, (c, r, b, ctrl) => this.dispatch(c, r, b, ctrl, options));
            }
        }
    }
}

module.exports = NeuroShunter;
