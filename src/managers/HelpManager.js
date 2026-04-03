const { CONFIG, cleanEnv } = require('../config');
const Introspection = require('../services/Introspection');
const skills = require('../skills');
const skillManager = require('./SkillManager');

// ============================================================
// 📖 Help Manager (動態說明書) - v9.1 Enhanced
// ============================================================
class HelpManager {
    static async getManual() {
        const source = await Introspection.readSelf();
        const routerPattern = /text\.(?:startsWith|match)\(['"]\/?([a-zA-Z0-9_|]+)['"]\)/g;
        const foundCmds = new Set(['help', 'callme', 'patch', 'update', 'donate']);
        let match;
        while ((match = routerPattern.exec(source)) !== null) foundCmds.add(match[1].replace(/\|/g, '/').replace(/[\^\(\)]/g, ''));
        let skillList = "基礎系統操作";
        try {
            const SkillIndexManager = require('./SkillIndexManager');
            const index = new SkillIndexManager();
            const allSkills = await index.listAllSkills();
            await index.close();
            if (allSkills.length > 0) {
                skillList = allSkills.map(s => s.id).join(', ');
            }
        } catch (e) { }

        return `
🤖 **Golem v9.1 (Ultimate Chronos + MultiAgent + WebSkillEngine)**
---------------------------
⚡ **Node.js**: Reflex Layer + Action Executor
🧠 **Web Gemini**: Infinite Context Brain
🔥 **KeyChain v2**: 智慧冷卻 + API 節流
🛡️ **Flood Guard**: 離線訊息過濾
🌗 **Dual-Memory**: ${cleanEnv(process.env.GOLEM_MEMORY_MODE || 'browser')} mode
🥪 **Sync Mode**: Envelope/Sandwich Lock (Reliable)
🚦 **Queue**: Debounce & Serialization Active
⏰ **Chronos**: Timeline Scheduler Active
🎭 **MultiAgent**: Interactive Collaboration System
✨ **Skill Engine**: Web-Based Generation Active
🔍 **Auto-Discovery**: Active
👁️ **OpticNerve**: Vision Enabled
🔌 **Neuro-Link**: CDP Network Interception Active
📡 **連線狀態**: TG(${CONFIG.TG_TOKEN ? '✅' : '⚪'}) / DC(${CONFIG.DC_TOKEN ? '✅' : '⚪'})

🛠️ **可用指令:**
${Array.from(foundCmds).map(c => `• \`/${c}\``).join('\n')}

✨ **技能指令 (Skill Engine):**
• \`/learn <描述>\` - 使用網頁大腦編寫新功能
• \`/export <名稱>\` - 分享您的技能
• \`/skills\` - 查看所有技能
• **匯入**: 直接貼上 \`GOLEM_SKILL::...\`

🧠 **技能模組:** ${skillList}

☕ **支持開發者:**
${CONFIG.DONATE_URL}
`;
    }
}

module.exports = HelpManager;
