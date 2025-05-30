/**
 * 后台脚本 - 优化的HTTP代理支持
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log(' WebDAV 订阅管理器已安装');
    
    // 设置默认配置
    chrome.storage.local.get([
        'webdavUrl', 'subscriptionPath', 'nodePath', 
        'enableProxyCheck', 'proxyUrl', 'maxConcurrent', 'checkTimeout'
    ], (data) => {
        const defaultSettings = {};
        
        if (!data.webdavUrl) defaultSettings.webdavUrl = 'https://dav.jianguoyun.com/dav/';
        if (!data.subscriptionPath) defaultSettings.subscriptionPath = 'webdav-subscribe/subscription.json';
        if (!data.nodePath) defaultSettings.nodePath = 'webdav-subscribe/node-info.txt';
        if (data.enableProxyCheck === undefined) defaultSettings.enableProxyCheck = false;
        if (!data.proxyUrl) defaultSettings.proxyUrl = 'http://127.0.0.1:7890';
        if (!data.maxConcurrent) defaultSettings.maxConcurrent = 5;
        if (!data.checkTimeout) defaultSettings.checkTimeout = 10000;
        
        if (Object.keys(defaultSettings).length > 0) {
            chrome.storage.local.set(defaultSettings);
        }
    });
});

// 处理消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openClashLink') {
        try {
            chrome.tabs.create({ url: message.url });
            sendResponse({ success: true });
        } catch (error) {
            console.error('打开 Clash 链接失败:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    } else if (message.action === 'checkSubscriptionWithProxy') {
        // 使用远程代理服务器请求目标URL
        fetchWithRemoteProxy(message.url, message.proxyUrl, message.timeout)
            .then(content => {
                sendResponse({ success: true, content });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

/**
 * 使用远程代理服务器请求目标URL
 * @param {string} targetUrl - 目标URL
 * @param {string} proxyUrl - 代理服务器URL
 * @param {number} timeout - 超时时间(毫秒)
 * @returns {Promise<string>} - 响应内容
 */
async function fetchWithRemoteProxy(targetUrl, proxyUrl, timeout) {
    console.log(`使用远程代理请求: ${targetUrl}`);
    console.log(`代理服务器: ${proxyUrl}`);
    
    // 创建一个AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        // 构建请求URL - 目标URL作为查询参数
        const encodedTargetUrl = encodeURIComponent(targetUrl);
        const requestUrl = encodedTargetUrl;
        
        console.log(`发送请求到: ${requestUrl}`);
        
        // 发送GET请求到代理服务器
        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'WebDAV-Extension/1.0',
                'Accept': '*/*',
                'Cache-Control': 'no-cache',
                'X-Proxy-URL': proxyUrl
            },
            referrerPolicy: 'no-referrer-when-downgrade',
        });
        
        // 清除超时
        clearTimeout(timeoutId);
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`代理服务器返回错误: ${response.status} ${response.statusText}`);
        }
        
        // 获取响应内容
        const content = await response.text();
        
        // 检查内容是否为空
        if (!content || content.trim().length === 0) {
            throw new Error('代理服务器返回空内容');
        }
        
        console.log(`代理请求成功，内容长度: ${content.length}`);
        return content;
        
    } catch (error) {
        // 清除超时
        clearTimeout(timeoutId);
        
        // 处理超时错误
        if (error.name === 'AbortError') {
            throw new Error('代理请求超时');
        }
        
        // 重新抛出其他错误
        console.error('代理请求失败:', error);
        throw error;
    }
}
