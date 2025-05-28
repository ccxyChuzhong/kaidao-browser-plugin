/**
 * WebDAV 客户端工具类 - 修复版本
 */
class WebDAVClient {
    constructor(baseURL, username, password) {
        this.baseURL = baseURL.endsWith('/') ? baseURL : baseURL + '/';
        this.username = username;
        this.password = password;
        this.authHeader = 'Basic ' + btoa(username + ':' + password);
    }

    /**
     * 发送请求到 WebDAV 服务器
     * @param {string} path - 文件路径
     * @param {string} method - HTTP 方法
     * @param {object} options - 请求选项
     * @returns {Promise<Response>} - 响应对象
     */
    async request(path, method = 'GET', options = {}) {
        const url = new URL(path, this.baseURL).href;
        
        const headers = {
            'Authorization': this.authHeader,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Charset': 'utf-8',
            'Cache-Control': 'no-cache',
            'User-Agent': '-WebDAV-Extension/1.0',
            ...options.headers
        };

        // 如果是 PUT 或 POST 方法，设置内容类型
        if ((method === 'PUT' || method === 'POST') && options.body) {
            headers['Content-Type'] = 'application/octet-stream';
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

            const response = await fetch(url, {
                method,
                headers,
                body: options.body,
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`WebDAV 请求失败: ${response.status} ${response.statusText}`);
            }

            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('WebDAV 请求超时');
            }
            console.error('WebDAV 请求错误:', error);
            throw error;
        }
    }

    /**
     * 获取文件内容
     * @param {string} path - 文件路径
     * @returns {Promise<string>} - 文件内容
     */
    async getFile(path) {
        const response = await this.request(path);
        return await response.text();
    }

    /**
     * 获取 JSON 文件内容
     * @param {string} path - 文件路径
     * @returns {Promise<object>} - 解析后的 JSON 对象
     */
    async getJSON(path) {
        const response = await this.request(path);
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (error) {
            console.error('JSON 解析错误:', error);
            throw new Error('无效的 JSON 格式');
        }
    }

    /**
     * 检查文件是否存在
     * @param {string} path - 文件路径
     * @returns {Promise<boolean>} - 文件是否存在
     */
    async fileExists(path) {
        try {
            await this.request(path, 'HEAD');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 测试连接是否有效
     * @returns {Promise<boolean>} - 连接是否有效
     */
    async testConnection() {
        try {
            // 尝试访问根目录
            await this.request('', 'OPTIONS');
            return true;
        } catch (error) {
            console.error('WebDAV 连接测试失败:', error);
            return false;
        }
    }

    /**
     * Ping 服务器测试连接
     * @returns {Promise<boolean>} - 连接是否有效
     */
    async ping() {
        try {
            const response = await this.request('', 'PROPFIND', {
                headers: {
                    'Depth': '0',
                    'Content-Type': 'application/xml; charset=utf-8'
                },
                body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop></prop></propfind>'
            });
            return response.ok;
        } catch (error) {
            console.error('WebDAV Ping 失败:', error);
            return false;
        }
    }
}