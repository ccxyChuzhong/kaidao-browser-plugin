/**
 * 剪贴板工具类
 */
class ClipboardUtils {
    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>} - 是否复制成功
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            
            // 备用方法，如果 navigator.clipboard 不可用
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                console.error('备用复制方法也失败:', fallbackError);
                return false;
            }
        }
    }

    /**
     * 打开 URL
     * @param {string} url - 要打开的 URL
     */
    static openUrl(url) {
        window.open(url, '_blank');
    }
}