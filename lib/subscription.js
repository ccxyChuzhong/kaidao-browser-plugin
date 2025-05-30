/**
 * 订阅管理类 - 增强版本
 */
class SubscriptionManager {
    constructor(webdavClient) {
        this.webdavClient = webdavClient;
        this.subscriptionPath = 'webdav-subscribe/subscription.json';
        this.nodePath = 'webdav-subscribe/node-info.txt';
        this.enableProxyCheck = false;
        this.proxyUrl = '';
        this.maxConcurrent = 5;
        this.checkTimeout = 10000;
        this.lastNodeContent = '';
    }

    /**
     * 设置自定义路径
     * @param {string} subscriptionPath - 订阅文件路径
     * @param {string} nodePath - 节点文件路径
     */
    setPaths(subscriptionPath, nodePath) {
        this.subscriptionPath = subscriptionPath;
        this.nodePath = nodePath;
    }

    /**
     * 设置代理配置
     * @param {boolean} enableProxyCheck - 是否启用代理检测
     * @param {string} proxyUrl - 代理地址
     */
    setProxyConfig(enableProxyCheck, proxyUrl) {
        this.enableProxyCheck = enableProxyCheck;
        this.proxyUrl = proxyUrl;
    }

    /**
     * 设置检测配置
     * @param {number} maxConcurrent - 最大并发数
     * @param {number} checkTimeout - 检测超时时间
     */
    setCheckConfig(maxConcurrent, checkTimeout) {
        this.maxConcurrent = maxConcurrent;
        this.checkTimeout = checkTimeout;
    }

    /**
     * 获取订阅信息
     * @returns {Promise<Array>} - 订阅列表
     */
    async getSubscriptions() {
        try {
            const data = await this.webdavClient.getJSON(this.subscriptionPath);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('获取订阅信息失败:', error);
            throw error;
        }
    }

    /**
     * 保存订阅信息
     * @param {Array} subscriptions - 订阅列表
     */
    async saveSubscriptions(subscriptions) {
        try {
            const content = JSON.stringify(subscriptions, null, 2);
            await this.webdavClient.request(this.subscriptionPath, 'PUT', {
                body: content,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('保存订阅信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取节点信息
     * @returns {Promise<string>} - 节点内容
     */
    async getNodeInfo() {
        try {
            const content = await this.webdavClient.getFile(this.nodePath);
            this.lastNodeContent = content;
            return content;
        } catch (error) {
            console.error('获取节点信息失败:', error);
            throw error;
        }
    }

    /**
     * 检测订阅是否有效 - 优化的HTTP代理支持
     * @param {string} url - 订阅 URL
     * @returns {Promise<boolean>} - 订阅是否有效
     */
    async checkSubscription(url) {
        try {
            console.log(`开始检测订阅: ${url}`);
            console.log(`代理设置: 启用=${this.enableProxyCheck}, 地址=${this.proxyUrl}`);
            
            let content;
            
            if (this.enableProxyCheck && this.proxyUrl) {
                // 使用代理检测
                try {
                    // 通过background脚本使用远程代理
                    content = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            action: 'checkSubscriptionWithProxy',
                            url: url,
                            proxyUrl: this.proxyUrl,
                            timeout: this.checkTimeout
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else if (response.success) {
                                resolve(response.content);
                            } else {
                                reject(new Error(response.error));
                            }
                        });
                    });
                    console.log('代理检测成功');
                } catch (proxyError) {
                    console.warn('代理检测失败，尝试直连:', proxyError.message);
                    content = await this.checkSubscriptionDirect(url);
                    console.log('直连检测成功');
                }
            } else {
                // 直接检测
                content = await this.checkSubscriptionDirect(url);
                console.log('直连检测完成');
            }
            
            // 验证内容
            if (!content || content.trim().length === 0) {
                throw new Error('订阅内容为空');
            }
            
            // 检查内容是否为有效的订阅格式
            const isValid = this.validateSubscriptionContent(content);
            if (!isValid) {
                throw new Error('订阅内容格式无效');
            }
            
            return true;
        } catch (error) {
            console.error(`检测订阅失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 通过代理检测订阅
     * @param {string} url - 订阅 URL
     * @returns {Promise<string>} - 订阅内容
     */
    async checkSubscriptionWithProxy(url) {
        return new Promise((resolve, reject) => {
            // 创建一个XMLHttpRequest对象
            const xhr = new XMLHttpRequest();
            
            // 设置请求
            xhr.open('GET', url, true);
            
            // 设置请求头
            xhr.setRequestHeader('Accept', '*/*');
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.setRequestHeader('X-Proxy-URL', this.proxyUrl);


            
            // xhr.signal = this.proxyUrl;
            // 设置超时
            xhr.timeout = this.checkTimeout;
            
            // 设置响应类型
            xhr.responseType = 'text';
            
            // 处理加载完成事件
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };
            
            // 处理错误事件
            xhr.onerror = function() {
                reject(new Error('网络请求失败，请检查代理设置'));
            };
            
            // 处理超时事件
            xhr.ontimeout = function() {
                reject(new Error('请求超时'));
            };
            
            // 发送请求
            xhr.send();
        });
    }

    /**
     * 直连检测订阅
     * @param {string} url - 订阅 URL
     * @returns {Promise<string>} - 订阅内容
     */
    async checkSubscriptionDirect(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.checkTimeout);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'WebDAV-Extension/1.0',
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache'
                },
                referrerPolicy: 'no-referrer-when-downgrade'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.text();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    }

    /**
     * 验证订阅内容
     * @param {string} content - 订阅内容
     * @returns {boolean} - 内容是否有效
     */
    validateSubscriptionContent(content) {
        if (!content || content.trim().length === 0) {
            return false;
        }

        // 检查是否包含常见的订阅格式标识
        const patterns = [
            /vmess:\/\/[A-Za-z0-9+/=]+/,
            /vless:\/\/[A-Za-z0-9\-]+@/,
            /trojan:\/\/[A-Za-z0-9\-]+@/,
            /ss:\/\/[A-Za-z0-9+/=]+/,
            /ssr:\/\/[A-Za-z0-9+/=]+/,
            /hysteria:\/\/[A-Za-z0-9\-]+@/,
            /hysteria2:\/\/[A-Za-z0-9\-]+@/,
            /proxies:\s*$/m,
            /server:\s*[\w\.\-]+/,
            /port:\s*\d+/,
            /cipher:\s*\w+/,
            /protocol:\s*\w+/,
            /"type":\s*"(vmess|vless|trojan|ss|ssr|hysteria|hysteria2)"/,
        ];
        
        const hasValidPattern = patterns.some(pattern => pattern.test(content));
        
        if (hasValidPattern) {
            console.log('检测到有效的订阅格式');
            return true;
        }
        
        // 检查是否是base64编码的内容
        if (this.isBase64Content(content)) {
            try {
                const decoded = atob(content.trim());
                console.log('检测到base64编码内容，解码后检查');
                return this.validateSubscriptionContent(decoded);
            } catch (error) {
                console.warn('base64解码失败:', error);
            }
        }
        
        console.log('未检测到有效的订阅格式');
        return false;
    }

    /**
     * 检查是否是base64内容
     * @param {string} content - 内容
     * @returns {boolean} - 是否是base64
     */
    isBase64Content(content) {
        const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
        const trimmed = content.trim();
        return trimmed.length > 0 && 
               trimmed.length % 4 === 0 && 
               base64Pattern.test(trimmed) &&
               trimmed.length > 20; // 避免短字符串误判
    }

    /**
     * 生成 Clash 导入链接
     * @param {object} subscription - 订阅对象
     * @returns {string} - Clash 导入链接
     */
    generateClashLink(subscription) {
        return `clash://install-config?url=${encodeURIComponent(subscription.url)}&name=${encodeURIComponent(subscription.name)}`;
    }

    /**
     * 解析节点文本为节点列表
     * @param {string} nodeText - 节点文本内容
     * @returns {Array} - 节点列表
     */
    parseNodeInfo(nodeText) {
        if (!nodeText) return [];
        
        const lines = nodeText.split('\n').filter(line => line.trim());
        const nodes = [];
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            
            if (trimmedLine.startsWith('vmess://') || 
                trimmedLine.startsWith('vless://') || 
                trimmedLine.startsWith('trojan://') || 
                trimmedLine.startsWith('ss://') || 
                trimmedLine.startsWith('ssr://')||
                trimmedLine.startsWith('hysteria://') ||
                trimmedLine.startsWith('hysteria2://')) {
                nodes.push({
                    name: `节点 ${index + 1}`,
                    address: trimmedLine
                });
            } else if (trimmedLine.includes(' ')) {
                const parts = trimmedLine.split(' ');
                const name = parts[0] || `节点 ${index + 1}`;
                const address = parts.slice(1).join(' ') || '';
                
                nodes.push({ name, address });
            } else {
                nodes.push({
                    name: `节点 ${index + 1}`,
                    address: trimmedLine
                });
            }
        });
        
        return nodes;
    }
}
