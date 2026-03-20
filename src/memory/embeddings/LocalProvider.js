/**
 * 🎨 Local Embedding Provider (免 API Key)
 * 使用 Transformers.js 在本地進行運算，具備極佳隱私性。
 */
class LocalProvider {
    constructor(modelName = 'Xenova/bge-small-zh-v1.5') {
        this.modelName = modelName;
        this.pipeline = null;
    }
    
    async _init() {
        if (this.pipeline) return;
        const { pipeline } = await import('@xenova/transformers');
        console.log(`📥 [Memory:Embedding] 正在加載本地模型: ${this.modelName}...`);
        this.pipeline = await pipeline('feature-extraction', this.modelName);
    }
    
    async getEmbedding(text) {
        await this._init();
        const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
    
    getIdentifier() { 
        return `local_${this.modelName.replace(/[^a-z0-9]/gi, '_')}`; 
    }
}

module.exports = LocalProvider;
