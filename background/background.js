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
        checkSubscriptionWithProxy(message.url, message.proxyUrl, message.timeout)
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
 * 通过HTTP代理检测订阅
 * @param {string} targetUrl - 目标订阅URL
 * @param {string} proxyUrl - HTTP代理地址
 * @param {number} timeout - 超时时间
 * @returns {Promise<string>} - 订阅内容
 */
async function checkSubscriptionWithProxy(targetUrl, proxyUrl, timeout) {
    console.log(`开始HTTP代理检测:`);
    console.log(`目标URL: ${targetUrl}`);
    console.log(`代理地址: ${proxyUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        // 解析代理URL
        const proxyConfig = parseProxyUrl(proxyUrl);
        console.log('代理配置:', proxyConfig);
        
        // HTTP代理的标准做法：
        // 1. 对于HTTP目标：直接向代理发送请求，Host头设为目标域名
        // 2. 对于HTTPS目标：需要先CONNECT，但浏览器环境有限制
        
        const targetUrlObj = new URL(targetUrl);
        const isHttps = targetUrlObj.protocol === 'https:';
        
        let response;
        
        if (isHttps) {
            // HTTPS需要特殊处理，尝试几种方法
            response = await tryHttpsProxyMethods(targetUrl, proxyConfig, controller.signal);
        } else {
            // HTTP可以直接通过代理
            response = await httpProxyRequest(targetUrl, proxyConfig, controller.signal);
        }
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`代理响应错误: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        if (!content || content.trim().length === 0) {
            throw new Error('代理返回空内容');
        }
        
        console.log(`代理检测成功，获取内容长度: ${content.length}`);
        return content;
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.warn(`代理检测失败: ${error.message}`);
        
        // 如果代理失败，尝试直连作为备选
        console.log('尝试直连作为备选...');
        try {
            const directContent = await directRequest(targetUrl, timeout);
            console.log('直连成功');
            return directContent;
        } catch (directError) {
            console.error(`直连也失败: ${directError.message}`);
            throw new Error(`代理失败: ${error.message}; 直连失败: ${directError.message}`);
        }
    }
}

/**
 * 解析代理URL
 * @param {string} proxyUrl - 代理地址
 * @returns {object} - 解析后的代理配置
 */
function parseProxyUrl(proxyUrl) {
    try {
        const url = new URL(proxyUrl);
        
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('仅支持HTTP/HTTPS代理');
        }
        
        return {
            protocol: url.protocol,
            hostname: url.hostname,
            port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 8080),
            username: url.username || null,
            password: url.password || null,
            baseUrl: `${url.protocol}//${url.hostname}:${url.port || (url.protocol === 'https:' ? 443 : 8080)}`
        };
    } catch (error) {
        throw new Error(`无效的代理地址: ${proxyUrl} - ${error.message}`);
    }
}

/**
 * HTTP代理请求
 * @param {string} targetUrl - 目标URL
 * @param {object} proxyConfig - 代理配置
 * @param {AbortSignal} signal - 取消信号
 * @returns {Promise<Response>} - 响应对象
 */
async function httpProxyRequest(targetUrl, proxyConfig, signal) {
    console.log('执行HTTP代理请求');
    
    const targetUrlObj = new URL(targetUrl);
    const headers = {
        'Host': targetUrlObj.host,
        'User-Agent': 'WebDAV-Extension/1.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
        'Connection': 'close'
    };
    
    // 添加代理认证（如果需要）
    if (proxyConfig.username && proxyConfig.password) {
        const auth = btoa(`${proxyConfig.username}:${proxyConfig.password}`);
        headers['Proxy-Authorization'] = `Basic ${auth}`;
    }
    
    // HTTP代理标准方法：向代理发送完整URL
    const response = await fetch(targetUrl, {
        method: 'GET',
        headers: headers,
        signal: signal,
        // 这里是关键：设置代理
        // 但fetch API本身不支持代理参数，需要其他方法
    });
    
    return response;
}

/**
 * HTTPS代理方法尝试
 * @param {string} targetUrl - 目标HTTPS URL
 * @param {object} proxyConfig - 代理配置
 * @param {AbortSignal} signal - 取消信号
 * @returns {Promise<Response>} - 响应对象
 */
async function tryHttpsProxyMethods(targetUrl, proxyConfig, signal) {
    console.log('尝试HTTPS代理方法');
    
    // 方法1: 尝试通过代理服务器的HTTP接口
    try {
        return await httpsThroughHttpProxy(targetUrl, proxyConfig, signal);
    } catch (error) {
        console.warn('HTTPS through HTTP proxy failed:', error.message);
    }
    
    // 方法2: 如果代理支持HTTPS endpoints
    try {
        return await httpsDirectProxy(targetUrl, proxyConfig, signal);
    } catch (error) {
        console.warn('HTTPS direct proxy failed:', error.message);
    }
    
    // 方法3: 尝试转换为HTTP请求（某些代理支持）
    try {
        const httpUrl = targetUrl.replace('https://', 'http://');
        return await httpProxyRequest(httpUrl, proxyConfig, signal);
    } catch (error) {
        console.warn('HTTPS to HTTP conversion failed:', error.message);
    }
    
    throw new Error('所有HTTPS代理方法都失败');
}

/**
 * 通过HTTP代理访问HTTPS
 * @param {string} targetUrl - 目标HTTPS URL
 * @param {object} proxyConfig - 代理配置
 * @param {AbortSignal} signal - 取消信号
 * @returns {Promise<Response>} - 响应对象
 */
async function httpsThroughHttpProxy(targetUrl, proxyConfig, signal) {
    const targetUrlObj = new URL(targetUrl);
    const headers = {
        'User-Agent': 'WebDAV-Extension/1.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
    };
    
    // 添加代理认证
    if (proxyConfig.username && proxyConfig.password) {
        const auth = btoa(`${proxyConfig.username}:${proxyConfig.password}`);
        headers['Proxy-Authorization'] = `Basic ${auth}`;
    }
    
    // 构造通过代理的请求URL
    const proxyRequestUrl = `${proxyConfig.baseUrl}/${targetUrl}`;
    
    console.log(`通过代理请求: ${proxyRequestUrl}`);
    
    return await fetch(proxyRequestUrl, {
        method: 'GET',
        headers: headers,
        signal: signal
    });
}

/**
 * HTTPS直接代理
 * @param {string} targetUrl - 目标HTTPS URL
 * @param {object} proxyConfig - 代理配置
 * @param {AbortSignal} signal - 取消信号
 * @returns {Promise<Response>} - 响应对象
 */
async function httpsDirectProxy(targetUrl, proxyConfig, signal) {
    const headers = {
        'User-Agent': 'WebDAV-Extension/1.0',
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
        'X-Target-URL': targetUrl,
        'X-Proxy-Method': 'GET'
    };
    
    // 添加代理认证
    if (proxyConfig.username && proxyConfig.password) {
        const auth = btoa(`${proxyConfig.username}:${proxyConfig.password}`);
        headers['Proxy-Authorization'] = `Basic ${auth}`;
    }
    
    // 向代理发送POST请求，携带目标URL信息
    return await fetch(proxyConfig.baseUrl, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            method: 'GET',
            url: targetUrl,
            headers: {
                'User-Agent': 'WebDAV-Extension/1.0',
                'Accept': '*/*'
            }
        }),
        signal: signal
    });
}

/**
 * 直连请求
 * @param {string} targetUrl - 目标URL
 * @param {number} timeout - 超时时间
 * @returns {Promise<string>} - 响应内容
 */
async function directRequest(targetUrl, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'WebDAV-Extension/1.0',
                'Accept': '*/*',
                'Cache-Control': 'no-cache'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.text();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}