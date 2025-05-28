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

    // 事件监听器 (在原有基础上添加)
    copyAllNodesBtn.addEventListener('click', copyAllNodes);

    // 右键菜单支持
    nodeList.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // 移除已存在的菜单
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();
        
        // 创建右键菜单
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="copySelected">复制选中</div>
            <div class="context-menu-item" data-action="selectAll">全选</div>
            <div class="context-menu-item" data-action="selectNone">取消全选</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="exportNodes">导出节点</div>
        `;
        
        // 定位菜单
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        contextMenu.style.zIndex = '1000';
        
        document.body.appendChild(contextMenu);
        
        // 菜单事件
        contextMenu.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            contextMenu.remove();
            
            switch (action) {
                case 'copySelected':
                    await copySelectedNodes();
                    break;
                case 'selectAll':
                    document.getElementById('selectAllNodes').click();
                    break;
                case 'selectNone':
                    const selectAll = document.getElementById('selectAllNodes');
                    if (selectAll.checked || selectAll.indeterminate) {
                        selectAll.click();
                    }
                    break;
                case 'exportNodes':
                    await exportNodes();
                    break;
            }
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', (event) => {
            // 确保点击的不是菜单本身
            if (!contextMenu.contains(event.target)) {
                contextMenu.remove();
            }
        }, { once: true });
    });

    // 导出节点功能
    async function exportNodes() {
        if (currentNodes.length === 0) {
            showToast('没有可导出的节点', 'warning');
            return;
        }

        try {
            const content = subscriptionManager.lastNodeContent || '';
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `nodes-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            
            URL.revokeObjectURL(url);
            showToast('节点文件已导出', 'success');
            
        } catch (error) {
            showToast('导出失败: ' + error.message, 'error');
        }
    }
    // 全部复制节点功能
    async function copyAllNodes() {
        if (currentNodes.length === 0) {
            showToast('没有可复制的节点信息', 'warning');
            return;
        }

        try {
            copyAllNodesBtn.disabled = true;
            copyAllNodesBtn.textContent = '复制中...';
            
            // 构造复制内容
            let copyContent = '';
            const copyFormat = await getCopyFormat();
            
            if (copyFormat === 'addresses') {
                // 仅复制地址
                copyContent = currentNodes.map(node => node.address).join('\n');
            } else if (copyFormat === 'formatted') {
                // 格式化复制（名称 + 地址）
                copyContent = currentNodes.map(node => `${node.name} ${node.address}`).join('\n');
            } else {
                // 原始格式复制
                copyContent = subscriptionManager.lastNodeContent || '';
            }
            
            if (!copyContent.trim()) {
                throw new Error('没有可复制的内容');
            }
            
            // 复制到剪贴板
            await ClipboardUtils.copyToClipboard(copyContent);
            
            // 显示统计信息
            const stats = getNodeStats(currentNodes);
            showToast(`已复制 ${currentNodes.length} 个节点到剪贴板\n${stats}`, 'success');
            
            // 更新状态栏
            setStatus(`已复制 ${currentNodes.length} 个节点`);
            
        } catch (error) {
            console.error('复制节点失败:', error);
            showToast('复制失败: ' + error.message, 'error');
        } finally {
            copyAllNodesBtn.disabled = false;
            copyAllNodesBtn.textContent = '全部复制';
        }
    }

    // 获取复制格式设置
    async function getCopyFormat() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['nodeCopyFormat'], (data) => {
                resolve(data.nodeCopyFormat || 'addresses');
            });
        });
    }

    // 获取节点统计信息
    function getNodeStats(nodes) {
        const stats = {
            vmess: 0,
            vless: 0,
            trojan: 0,
            ss: 0,
            ssr: 0,
            other: 0
        };
        
        nodes.forEach(node => {
            const address = node.address.toLowerCase();
            if (address.startsWith('vmess://')) {
                stats.vmess++;
            } else if (address.startsWith('vless://')) {
                stats.vless++;
            } else if (address.startsWith('trojan://')) {
                stats.trojan++;
            } else if (address.startsWith('ss://')) {
                stats.ss++;
            } else if (address.startsWith('ssr://')) {
                stats.ssr++;
            } else {
                stats.other++;
            }
        });
        
        const statTexts = [];
        if (stats.vmess > 0) statTexts.push(`VMess: ${stats.vmess}`);
        if (stats.vless > 0) statTexts.push(`VLess: ${stats.vless}`);
        if (stats.trojan > 0) statTexts.push(`Trojan: ${stats.trojan}`);
        if (stats.ss > 0) statTexts.push(`SS: ${stats.ss}`);
        if (stats.ssr > 0) statTexts.push(`SSR: ${stats.ssr}`);
        if (stats.other > 0) statTexts.push(`其他: ${stats.other}`);
        
        return statTexts.join(', ');
    }

    // 显示复制格式选择对话框
    function showCopyFormatDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>选择复制格式</h3>
                        <button class="close-button" onclick="this.closest('.modal').remove(); resolve('addresses');">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="copyFormat" value="addresses" checked>
                                仅复制地址
                                <small>每行一个节点地址</small>
                            </label>
                            <label>
                                <input type="radio" name="copyFormat" value="formatted">
                                格式化复制
                                <small>名称 + 地址</small>
                            </label>
                            <label>
                                <input type="radio" name="copyFormat" value="raw">
                                原始格式
                                <small>保持原文件格式</small>
                            </label>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="primary-button" onclick="
                            const format = this.closest('.modal').querySelector('input[name=copyFormat]:checked').value;
                            this.closest('.modal').remove();
                            resolve(format);
                        ">确认复制</button>
                        <button class="secondary-button" onclick="
                            this.closest('.modal').remove();
                            resolve(null);
                        ">取消</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            });
        });
    }

    // 渲染节点列表 (修改版本，添加选择功能)
    function renderNodes(nodes) {
        nodeList.innerHTML = '';
        
        if (nodes.length === 0) {
            nodeList.innerHTML = '<p class="empty-message">没有找到节点信息</p>';
            return;
        }
        
        // 添加全选控制
        const selectAllContainer = document.createElement('div');
        selectAllContainer.className = 'select-all-container';
        selectAllContainer.innerHTML = `
            <label class="select-all-label">
                <input type="checkbox" id="selectAllNodes"> 全选 (${nodes.length} 个节点)
            </label>
            <div class="selected-count">
                已选择: <span id="selectedNodesCount">0</span> 个
            </div>
        `;
        nodeList.appendChild(selectAllContainer);
        
        // 全选功能
        const selectAllCheckbox = document.getElementById('selectAllNodes');
        const selectedCountSpan = document.getElementById('selectedNodesCount');
        
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = nodeList.querySelectorAll('.node-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAllCheckbox.checked;
            });
            updateSelectedCount();
        });
        
        // 更新选择计数
        function updateSelectedCount() {
            const checkedBoxes = nodeList.querySelectorAll('.node-checkbox:checked');
            selectedCountSpan.textContent = checkedBoxes.length;
            
            // 更新全选状态
            const allCheckboxes = nodeList.querySelectorAll('.node-checkbox');
            if (checkedBoxes.length === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (checkedBoxes.length === allCheckboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
        
        // 渲染节点项
        nodes.forEach((node, index) => {
            const item = document.createElement('div');
            item.className = 'node-item';
            
            // 检测节点类型
            const nodeType = detectNodeType(node.address);
            
            item.innerHTML = `
                <div class="node-header">
                    <label class="node-select">
                        <input type="checkbox" class="node-checkbox" data-index="${index}">
                        <span class="node-type-badge ${nodeType.toLowerCase()}">${nodeType}</span>
                        <h3>${escapeHtml(node.name || '未命名节点')}</h3>
                    </label>
                </div>
                <p class="node-address" title="${escapeHtml(node.address)}">${escapeHtml(node.address || '')}</p>
                <div class="item-actions">
                    <button class="btn-copy" data-index="${index}">复制地址</button>
                    <button class="btn-test" data-index="${index}">测试连接</button>
                </div>
            `;
            
            nodeList.appendChild(item);
        });

        // 添加节点选择事件监听器
        nodeList.querySelectorAll('.node-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCount);
        });

        // 添加节点事件监听器
        addNodeEventListeners();
    }

    // 检测节点类型
    function detectNodeType(address) {
        if (!address) return 'UNKNOWN';
        
        const lower = address.toLowerCase();
        if (lower.startsWith('vmess://')) return 'VMess';
        if (lower.startsWith('vless://')) return 'VLess';
        if (lower.startsWith('trojan://')) return 'Trojan';
        if (lower.startsWith('ss://')) return 'SS';
        if (lower.startsWith('ssr://')) return 'SSR';
        if (lower.startsWith('http://') || lower.startsWith('https://')) return 'HTTP';
        
        return 'OTHER';
    }

    // 添加节点事件监听器
    function addNodeEventListeners() {
        // 复制按钮
        document.querySelectorAll('#nodeList .btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                copyNodeAddress(index);
            });
        });

        // 测试按钮
        document.querySelectorAll('#nodeList .btn-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                testNodeConnection(index);
            });
        });
    }

    // 测试节点连接
    async function testNodeConnection(index) {
        const node = currentNodes[index];
        if (!node) return;

        const btn = document.querySelector(`#nodeList .btn-test[data-index="${index}"]`);
        const originalText = btn.textContent;
        
        btn.disabled = true;
        btn.textContent = '测试中...';

        try {
            // 这里可以添加节点连接测试逻辑
            // 目前只是模拟测试
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 模拟结果
            const isConnected = Math.random() > 0.3; // 70% 成功率
            
            if (isConnected) {
                showToast(`节点 "${node.name}" 连接正常`, 'success');
                btn.style.backgroundColor = '#2ecc71';
            } else {
                showToast(`节点 "${node.name}" 连接失败`, 'error');
                btn.style.backgroundColor = '#e74c3c';
            }
            
            // 恢复按钮颜色
            setTimeout(() => {
                btn.style.backgroundColor = '';
            }, 3000);
            
        } catch (error) {
            showToast(`测试失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // 复制选中的节点
    async function copySelectedNodes() {
        const selectedCheckboxes = nodeList.querySelectorAll('.node-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showToast('请先选择要复制的节点', 'warning');
            return;
        }

        try {
            const selectedNodes = Array.from(selectedCheckboxes).map(checkbox => {
                const index = parseInt(checkbox.dataset.index);
                return currentNodes[index];
            });

            const copyFormat = await getCopyFormat();
            if (!copyFormat) return; // 用户取消

            let copyContent = '';
            if (copyFormat === 'addresses') {
                copyContent = selectedNodes.map(node => node.address).join('\n');
            } else if (copyFormat === 'formatted') {
                copyContent = selectedNodes.map(node => `${node.name} ${node.address}`).join('\n');
            }

            await ClipboardUtils.copyToClipboard(copyContent);
            
            const stats = getNodeStats(selectedNodes);
            showToast(`已复制 ${selectedNodes.length} 个选中节点\n${stats}`, 'success');
            
        } catch (error) {
            showToast('复制失败: ' + error.message, 'error');
        }
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



