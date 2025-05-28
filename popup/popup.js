/**
 * 插件弹窗 UI 控制器 - 修复版本
 */
document.addEventListener('DOMContentLoaded', () => {

    // 在popup.js中添加代理测试功能
    const testProxyBtn = document.getElementById('testProxyBtn');
    const proxyTestResult = document.getElementById('proxyTestResult');

    testProxyBtn.addEventListener('click', async () => {
        const proxyUrl = proxyUrlInput.value.trim();
        
        if (!proxyUrl) {
            showToast('请输入代理地址', 'error');
            return;
        }
        
        testProxyBtn.disabled = true;
        testProxyBtn.textContent = '测试中...';
        proxyTestResult.textContent = '';
        
        try {
            // 使用一个简单的HTTP网站测试代理
            const testUrl = 'http://httpbin.org/ip';
            
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'checkSubscriptionWithProxy',
                    url: testUrl,
                    proxyUrl: proxyUrl,
                    timeout: 5000
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
            
            proxyTestResult.textContent = '✓ 代理连接正常';
            proxyTestResult.style.color = '#2ecc71';
            showToast('代理测试成功');
            
        } catch (error) {
            proxyTestResult.textContent = `✗ 代理测试失败: ${error.message}`;
            proxyTestResult.style.color = '#e74c3c';
            showToast('代理测试失败: ' + error.message, 'error');
        } finally {
            testProxyBtn.disabled = false;
            testProxyBtn.textContent = '测试代理连接';
        }
    });
    // DOM 元素
    const loginForm = document.getElementById('loginForm');
    const webdavUrlInput = document.getElementById('webdavUrl');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginSection = document.getElementById('loginSection');
    const mainSection = document.getElementById('mainSection');
    const settingsSection = document.getElementById('settingsSection');
    
    // Tab 相关元素
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const subscriptionTab = document.getElementById('subscriptionTab');
    const nodeTab = document.getElementById('nodeTab');
    
    // 订阅相关元素
    const subscriptionList = document.getElementById('subscriptionList');
    const addSubscriptionBtn = document.getElementById('addSubscriptionBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const checkAllBtn = document.getElementById('checkAllBtn');
    
    // 节点相关元素
    const nodeList = document.getElementById('nodeList');
    const refreshNodeBtn = document.getElementById('refreshNodeBtn');
    
    // 设置相关元素
    const settingsBtn = document.getElementById('settingsBtn');
    const pinBtn = document.getElementById('pinBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const backBtn = document.getElementById('backBtn');
    const customWebdavPathInput = document.getElementById('customWebdavPath');
    const customNodePathInput = document.getElementById('customNodePath');
    const enableProxyCheckbox = document.getElementById('enableProxyCheck');
    const proxyUrlInput = document.getElementById('proxyUrl');
    const proxyGroup = document.getElementById('proxyGroup');
    const proxyGroup1 = document.getElementById('proxyGroup1');
    const maxConcurrentInput = document.getElementById('maxConcurrent');
    const checkTimeoutInput = document.getElementById('checkTimeout');
    
    // Modal 相关元素
    const editModal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const editForm = document.getElementById('editForm');
    const editName = document.getElementById('editName');
    const editUrl = document.getElementById('editUrl');
    const editRemark = document.getElementById('editRemark');
    const editType = document.getElementById('editType');
    const closeModal = document.getElementById('closeModal');
    const cancelEdit = document.getElementById('cancelEdit');
    
    const statusText = document.getElementById('statusText');

    // 状态变量
    let webdavClient = null;
    let subscriptionManager = null;
    let currentSubscriptions = [];
    let currentNodes = [];
    let editingIndex = -1;
    let checkingCount = 0;

    // 默认配置
    const defaultConfig = {
        webdavUrl: 'https://dav.jianguoyun.com/dav/',
        subscriptionPath: 'webdav-subscribe/subscription.json',
        nodePath: 'webdav-subscribe/node-info.txt',
        enableProxyCheck: false,
        proxyUrl: 'http://127.0.0.1:7890',
        maxConcurrent: 5,
        checkTimeout: 10000
    };

    // 初始化
    initializeApp();

    // 初始化应用
    async function initializeApp() {
        // 从存储中加载配置，使用默认值
        chrome.storage.local.get([
            'webdavUrl', 'username', 'password', 'subscriptionPath', 'nodePath', 
            'enableProxyCheck', 'proxyUrl', 'maxConcurrent', 'checkTimeout'
        ], (data) => {
            webdavUrlInput.value = data.webdavUrl || defaultConfig.webdavUrl;
            if (data.username) usernameInput.value = data.username;
            if (data.password) passwordInput.value = data.password;
            customWebdavPathInput.value = data.subscriptionPath || defaultConfig.subscriptionPath;
            customNodePathInput.value = data.nodePath || defaultConfig.nodePath;
            enableProxyCheckbox.checked = data.enableProxyCheck || defaultConfig.enableProxyCheck;
            proxyUrlInput.value = data.proxyUrl || defaultConfig.proxyUrl;
            maxConcurrentInput.value = data.maxConcurrent || defaultConfig.maxConcurrent;
            checkTimeoutInput.value = data.checkTimeout || defaultConfig.checkTimeout;
            
            // 更新代理设置显示
            updateProxyGroupVisibility();

            // 如果有保存的凭据，尝试自动登录
            if (data.webdavUrl && data.username && data.password) {
                loginWebDAV(data.webdavUrl, data.username, data.password);
            }
        });

        // 设置 Tab 切换事件
        setupTabSwitching();
        
        // 设置全局事件监听
        setupGlobalEvents();
    }

    // 设置全局事件
    function setupGlobalEvents() {
        // 给 window 对象添加全局函数
        window.editSubscription = editSubscription;
        window.deleteSubscription = deleteSubscription;
        window.importToClash = importToClash;
        window.copySubscriptionUrl = copySubscriptionUrl;
        window.checkSubscription = checkSubscription;
        window.copyNodeAddress = copyNodeAddress;
    }

    // 设置 Tab 切换
    function setupTabSwitching() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                switchTab(tabName);
            });
        });
    }

    // 切换 Tab
    function switchTab(tabName) {
        // 更新按钮状态
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // 更新内容显示
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        if (tabName === 'subscription') {
            subscriptionTab.classList.add('active');
        } else if (tabName === 'node') {
            nodeTab.classList.add('active');
        }
    }

    // 登录 WebDAV
    async function loginWebDAV(url, username, password) {
        try {
            setStatus('正在连接到 WebDAV...');
            
            // 验证输入
            if (!url || !username || !password) {
                throw new Error('请填写完整的 WebDAV 信息');
            }

            // 创建 WebDAV 客户端
            webdavClient = new WebDAVClient(url, username, password);
            
            // 测试连接
            setStatus('正在测试连接...');
            let connected = false;
            
            try {
                connected = await webdavClient.ping();
            } catch (error) {
                console.warn('Ping 失败，尝试其他方法:', error);
                try {
                    connected = await webdavClient.testConnection();
                } catch (testError) {
                    console.warn('连接测试失败:', testError);
                    connected = false;
                }
            }
            
            if (!connected) {
                throw new Error('WebDAV 连接失败，请检查服务器地址、用户名和密码');
            }
            
            // 创建订阅管理器
            subscriptionManager = new SubscriptionManager(webdavClient);
            
            // 设置自定义路径和配置
            updateSubscriptionManagerConfig();
            
            // 保存凭据到存储
            chrome.storage.local.set({
                webdavUrl: url,
                username,
                password
            });
            
            // 切换 UI 显示
            loginSection.classList.add('hidden');
            mainSection.classList.remove('hidden');
            
            // 加载数据
            await loadData();
            
            setStatus('已连接到 WebDAV');
            showToast('WebDAV 连接成功！');
        } catch (error) {
            console.error('登录失败:', error);
            setStatus('登录失败: ' + error.message);
            showToast('WebDAV 登录失败: ' + error.message, 'error');
        }
    }

    // 更新订阅管理器配置
    function updateSubscriptionManagerConfig() {
        if (subscriptionManager) {
            subscriptionManager.setPaths(
                customWebdavPathInput.value,
                customNodePathInput.value
            );
            subscriptionManager.setProxyConfig(
                enableProxyCheckbox.checked,
                proxyUrlInput.value
            );
            subscriptionManager.setCheckConfig(
                parseInt(maxConcurrentInput.value) || defaultConfig.maxConcurrent,
                parseInt(checkTimeoutInput.value) || defaultConfig.checkTimeout
            );
        }
    }

    // 加载数据
    async function loadData() {
        try {
            setStatus('正在加载数据...');
            
            // 加载订阅
            try {
                currentSubscriptions = await subscriptionManager.getSubscriptions();
                renderSubscriptions(currentSubscriptions);
            } catch (error) {
                console.error('加载订阅失败:', error);
                showToast('订阅文件加载失败，可能文件不存在', 'warning');
                currentSubscriptions = [];
                renderSubscriptions([]);
            }
            
            // 加载节点
            try {
                const nodeInfo = await subscriptionManager.getNodeInfo();
                currentNodes = subscriptionManager.parseNodeInfo(nodeInfo);
                renderNodes(currentNodes);
            } catch (error) {
                console.error('加载节点失败:', error);
                showToast('节点文件加载失败，可能文件不存在', 'warning');
                currentNodes = [];
                renderNodes([]);
            }
            
            setStatus('数据加载完成');
        } catch (error) {
            console.error('加载数据失败:', error);
            setStatus('加载数据失败: ' + error.message);
            showToast('数据加载失败: ' + error.message, 'error');
        }
    }

    // 渲染订阅列表
    function renderSubscriptions(subscriptions) {
        subscriptionList.innerHTML = '';
        
        if (subscriptions.length === 0) {
            subscriptionList.innerHTML = '<p class="empty-message">没有找到订阅信息</p>';
            return;
        }
        
        subscriptions.forEach((subscription, index) => {
            const item = document.createElement('div');
            item.className = 'subscription-item';
            item.dataset.index = index;
            
            const isClashSupported = subscription.type === 'clash' || subscription.type === 'xray+clash';
            
            item.innerHTML = `
                <h3>
                    <span>${escapeHtml(subscription.name || '未命名订阅')}</span>
                    <span class="type-badge ${subscription.type.replace('+', '-')}">${escapeHtml(subscription.type)}</span>
                </h3>
                <p title="${escapeHtml(subscription.url)}">URL: ${escapeHtml(subscription.url || '')}</p>
                ${subscription.remark ? `<p>备注: ${escapeHtml(subscription.remark)}</p>` : ''}
                <div class="item-actions">
                    <button class="btn-edit" data-index="${index}">编辑</button>
                    <button class="btn-delete" data-index="${index}">删除</button>
                    <button class="btn-clash ${isClashSupported ? '' : 'disabled'}" 
                            data-index="${index}"
                            ${isClashSupported ? '' : 'disabled'}>Clash导入</button>
                    <button class="btn-copy" data-index="${index}">复制</button>
                    <button class="btn-check" data-index="${index}">检测</button>
                </div>
                <div class="status-indicator" id="status-${index}"></div>
            `;
            
            subscriptionList.appendChild(item);
        });

        // 添加事件监听器
        addSubscriptionEventListeners();
    }

    // 添加订阅事件监听器
    function addSubscriptionEventListeners() {
        // 编辑按钮
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                editSubscription(index);
            });
        });

        // 删除按钮
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                deleteSubscription(index);
            });
        });

        // Clash 导入按钮
        document.querySelectorAll('.btn-clash').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (!btn.disabled) {
                    importToClash(index);
                }
            });
        });

        // 复制按钮
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                copySubscriptionUrl(index);
            });
        });

        // 检测按钮
        document.querySelectorAll('.btn-check').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                checkSubscription(index);
            });
        });
    }

    // 渲染节点列表
    function renderNodes(nodes) {
        nodeList.innerHTML = '';
        
        if (nodes.length === 0) {
            nodeList.innerHTML = '<p class="empty-message">没有找到节点信息</p>';
            return;
        }
        
        nodes.forEach((node, index) => {
            const item = document.createElement('div');
            item.className = 'node-item';
            
            item.innerHTML = `
                <h3>${escapeHtml(node.name || '未命名节点')}</h3>
                <p title="${escapeHtml(node.address)}">${escapeHtml(node.address || '')}</p>
                <div class="item-actions">
                    <button class="btn-copy" data-index="${index}">复制地址</button>
                </div>
            `;
            
            nodeList.appendChild(item);
        });

        // 添加节点事件监听器
        document.querySelectorAll('#nodeList .btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                copyNodeAddress(index);
            });
        });
    }

    // 编辑订阅
    function editSubscription(index) {
        editingIndex = index;
        const subscription = currentSubscriptions[index];
        
        modalTitle.textContent = '编辑订阅';
        editName.value = subscription.name;
        editUrl.value = subscription.url;
        editRemark.value = subscription.remark || '';
        editType.value = subscription.type;
        
        editModal.classList.remove('hidden');
    }

    // 删除订阅
    async function deleteSubscription(index) {
        if (confirm('确定要删除这个订阅吗？')) {
            try {
                currentSubscriptions.splice(index, 1);
                await saveSubscriptions();
                renderSubscriptions(currentSubscriptions);
                showToast('订阅删除成功');
            } catch (error) {
                showToast('删除失败: ' + error.message, 'error');
            }
        }
    }

    // Clash 导入
    function importToClash(index) {
        const subscription = currentSubscriptions[index];
        const clashLink = subscriptionManager.generateClashLink(subscription);
        
        ClipboardUtils.copyToClipboard(clashLink)
            .then(() => {
                showToast('已复制 Clash 链接到剪贴板');
                chrome.runtime.sendMessage({
                    action: 'openClashLink',
                    url: clashLink
                });
            })
            .catch(error => {
                showToast('复制失败', 'error');
            });
    }

    // 复制订阅 URL
    function copySubscriptionUrl(index) {
        const subscription = currentSubscriptions[index];
        ClipboardUtils.copyToClipboard(subscription.url)
            .then(() => showToast('已复制到剪贴板'))
            .catch(() => showToast('复制失败', 'error'));
    }

    // 检测单个订阅
    async function checkSubscription(index) {
        const statusIndicator = document.getElementById(`status-${index}`);
        statusIndicator.innerHTML = '<span class="badge badge-warning">检测中...</span>';
        
        try {
            const subscription = currentSubscriptions[index];
            const isValid = await subscriptionManager.checkSubscription(subscription.url);
            statusIndicator.innerHTML = isValid 
                ? '<span class="badge badge-success">有效</span>' 
                : '<span class="badge badge-error">无效</span>';
        } catch (error) {
            statusIndicator.innerHTML = '<span class="badge badge-error">检测失败</span>';
        }
    }

    // 复制节点地址
    function copyNodeAddress(index) {
        const node = currentNodes[index];
        if (node) {
            ClipboardUtils.copyToClipboard(node.address)
                .then(() => showToast('已复制到剪贴板'))
                .catch(() => showToast('复制失败', 'error'));
        }
    }

    // 多线程检测所有订阅
    async function checkAllSubscriptions() {
        if (currentSubscriptions.length === 0) {
            showToast('没有可检测的订阅', 'warning');
            return;
        }

        const maxConcurrent = parseInt(maxConcurrentInput.value) || defaultConfig.maxConcurrent;
        checkingCount = 0;
        
        setStatus(`正在检测所有订阅... (并发数: ${maxConcurrent})`);
        checkAllBtn.disabled = true;
        checkAllBtn.textContent = '检测中...';

        // 初始化所有状态指示器
        currentSubscriptions.forEach((_, index) => {
            const statusIndicator = document.getElementById(`status-${index}`);
            if (statusIndicator) {
                statusIndicator.innerHTML = '<span class="badge badge-warning">等待检测...</span>';
            }
        });

        try {
            // 创建并发检测任务
            const tasks = currentSubscriptions.map((subscription, index) => 
                () => checkSubscriptionWithProgress(subscription, index)
            );

            // 并发执行检测任务
            await runConcurrentTasks(tasks, maxConcurrent);
            
            setStatus('所有订阅检测完成');
            showToast('所有订阅检测完成');
        } catch (error) {
            console.error('批量检测失败:', error);
            showToast('批量检测失败: ' + error.message, 'error');
        } finally {
            checkAllBtn.disabled = false;
            checkAllBtn.textContent = '检测全部';
        }
    }

    // 带进度的订阅检测
    async function checkSubscriptionWithProgress(subscription, index) {
        const statusIndicator = document.getElementById(`status-${index}`);
        if (!statusIndicator) return;

        statusIndicator.innerHTML = '<span class="badge badge-warning">检测中...</span>';
        
        try {
            const isValid = await subscriptionManager.checkSubscription(subscription.url);
            statusIndicator.innerHTML = isValid 
                ? '<span class="badge badge-success">有效</span>' 
                : '<span class="badge badge-error">无效</span>';
            
            checkingCount++;
            setStatus(`正在检测订阅... (${checkingCount}/${currentSubscriptions.length})`);
        } catch (error) {
            statusIndicator.innerHTML = '<span class="badge badge-error">检测失败</span>';
            console.error(`检测订阅 ${index} 失败:`, error);
        }
    }

    // 并发执行任务
    async function runConcurrentTasks(tasks, maxConcurrent) {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const promise = task().then(result => {
                executing.splice(executing.indexOf(promise), 1);
                return result;
            });

            results.push(promise);
            executing.push(promise);

            if (executing.length >= maxConcurrent) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    }

    // 保存订阅
    async function saveSubscriptions() {
        if (subscriptionManager) {
            await subscriptionManager.saveSubscriptions(currentSubscriptions);
        }
    }

    // 更新代理组可见性
    function updateProxyGroupVisibility() {
        if (enableProxyCheckbox.checked) {
            proxyGroup.classList.add('show');
            proxyGroup1.classList.add('show');
        } else {
            proxyGroup.classList.remove('show');
            proxyGroup1.classList.remove('show');
        }
    }

    // 设置状态栏文本
    function setStatus(message) {
        statusText.textContent = message;
    }

    // 显示通知消息
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, type === 'error' ? 5000 : 3000);
    }

    // 转义 HTML 特殊字符
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 退出登录
    function logout() {
        // 清除存储的凭据
        chrome.storage.local.remove(['username', 'password']);
        
        // 重置状态
        webdavClient = null;
        subscriptionManager = null;
        currentSubscriptions = [];
        currentNodes = [];
        
        // 重置 UI
        loginSection.classList.remove('hidden');
        mainSection.classList.add('hidden');
        settingsSection.classList.add('hidden');
        
        // 清空表单
        usernameInput.value = '';
        passwordInput.value = '';
        
        setStatus('已退出登录');
        showToast('已退出登录');
    }

    // 创建独立窗口
    function createIndependentWindow() {
        const url = chrome.runtime.getURL('popup/popup.html');
        chrome.windows.create({
            url: url,
            type: 'popup',
            width: 500,
            height: 650,
            focused: true
        }, (window) => {
            if (chrome.runtime.lastError) {
                showToast('创建独立窗口失败', 'error');
            } else {
                showToast('已创建独立窗口');
                // 关闭当前弹窗
                self.close();
            }
        });
    }

    // 事件监听器
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = webdavUrlInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!url || !username || !password) {
            showToast('请填写所有字段', 'error');
            return;
        }
        
        loginWebDAV(url, username, password);
    });

    // 新增订阅
    addSubscriptionBtn.addEventListener('click', () => {
        editingIndex = -1;
        modalTitle.textContent = '新增订阅';
        editName.value = '';
        editUrl.value = '';
        editRemark.value = '';
        editType.value = 'clash';
        editModal.classList.remove('hidden');
    });

    // 编辑表单提交
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const subscription = {
            name: editName.value.trim(),
            url: editUrl.value.trim(),
            remark: editRemark.value.trim(),
            type: editType.value
        };

        if (!subscription.name || !subscription.url) {
            showToast('名称和地址不能为空', 'error');
            return;
        }

        try {
            if (editingIndex === -1) {
                // 新增
                currentSubscriptions.unshift(subscription);
            } else {
                // 编辑
                currentSubscriptions[editingIndex] = subscription;
            }

            await saveSubscriptions();
            renderSubscriptions(currentSubscriptions);
            editModal.classList.add('hidden');
            showToast(editingIndex === -1 ? '订阅新增成功' : '订阅修改成功');
        } catch (error) {
            showToast('保存失败: ' + error.message, 'error');
        }
    });

    // 关闭模态框
    closeModal.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    cancelEdit.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    // 点击模态框外部关闭
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.add('hidden');
        }
    });
    
    refreshBtn.addEventListener('click', () => {
        if (webdavClient) {
            loadData();
        } else {
            showToast('请先登录 WebDAV', 'warning');
        }
    });

    refreshNodeBtn.addEventListener('click', () => {
        if (webdavClient) {
            loadData();
        } else {
            showToast('请先登录 WebDAV', 'warning');
        }
    });
    
    checkAllBtn.addEventListener('click', checkAllSubscriptions);
    
    settingsBtn.addEventListener('click', () => {
        loginSection.classList.add('hidden');
        mainSection.classList.add('hidden');
        settingsSection.classList.remove('hidden');
    });
    
    pinBtn.addEventListener('click', createIndependentWindow);
    
    logoutBtn.addEventListener('click', () => {
        if (confirm('确定要退出登录吗？')) {
            logout();
        }
    });

    enableProxyCheckbox.addEventListener('change', updateProxyGroupVisibility);
    
    saveSettingsBtn.addEventListener('click', () => {
        const subscriptionPath = customWebdavPathInput.value.trim();
        const nodePath = customNodePathInput.value.trim();
        const enableProxyCheck = enableProxyCheckbox.checked;
        const proxyUrl = proxyUrlInput.value.trim();
        const maxConcurrent = parseInt(maxConcurrentInput.value) || defaultConfig.maxConcurrent;
        const checkTimeout = parseInt(checkTimeoutInput.value) || defaultConfig.checkTimeout;
        
        if (!subscriptionPath || !nodePath) {
            showToast('路径不能为空', 'error');
            return;
        }

        if (maxConcurrent < 1 || maxConcurrent > 20) {
            showToast('并发数必须在 1-20 之间', 'error');
            return;
        }

        if (checkTimeout < 1000 || checkTimeout > 60000) {
            showToast('超时时间必须在 1000-60000ms 之间', 'error');
            return;
        }
        
        // 更新订阅管理器配置
        updateSubscriptionManagerConfig();
        
        // 保存设置
        chrome.storage.local.set({
            subscriptionPath,
            nodePath,
            enableProxyCheck,
            proxyUrl,
            maxConcurrent,
            checkTimeout
        });
        
        // 返回主界面
        settingsSection.classList.add('hidden');
        
        if (webdavClient) {
            mainSection.classList.remove('hidden');
        } else {
            loginSection.classList.remove('hidden');
        }
        
        showToast('设置已保存');
    });
    
    backBtn.addEventListener('click', () => {
        settingsSection.classList.add('hidden');
        
        if (webdavClient) {
            mainSection.classList.remove('hidden');
        } else {
            loginSection.classList.remove('hidden');
        }
    });

    // 添加键盘快捷键支持
    document.addEventListener('keydown', (e) => {
        // Ctrl + R 刷新数据
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            if (webdavClient) {
                loadData();
            }
        }
        
        // ESC 关闭模态框
        if (e.key === 'Escape') {
            editModal.classList.add('hidden');
        }
    });
});

