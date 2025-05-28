# WebDAV 订阅管理器

一个功能强大的浏览器扩展，用于通过 WebDAV 管理 V2Ray Clash 订阅信息。支持多种代理协议，提供友好的用户界面和丰富的管理功能。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/chrome-支持-brightgreen.svg)
![Edge](https://img.shields.io/badge/edge-支持-brightgreen.svg)
![Firefox](https://img.shields.io/badge/firefox-支持-brightgreen.svg)

## ✨ 主要特性

### 🔐 WebDAV 集成
- 支持多种 WebDAV 服务（坚果云、NextCloud、ownCloud 等）
- 安全的凭据存储和自动登录
- 可自定义文件路径配置

### 📋 订阅管理
- **新增/编辑/删除** 订阅信息
- **类型支持**: Clash、XRay、XRay+Clash
- **批量检测** 订阅有效性（支持多线程并发）
- **一键导入** 到 Clash 客户端
- **智能验证** 订阅内容格式

### 🌐 代理检测
- **HTTP 代理支持** - 通过本地代理检测订阅
- **智能降级** - 代理失败时自动直连
- **并发控制** - 可配置最大并发检测数量
- **超时设置** - 自定义检测超时时间

### 🎯 用户体验
- **标签页界面** - 订阅信息和节点信息分离
- **独立窗口** - 支持创建独立的管理窗口
- **一键复制** - 快速复制订阅链接和节点信息
- **状态指示** - 实时显示检测状态和结果

## 🚀 快速开始

### 安装方法

#### Chrome/Edge
1. 下载扩展文件包
2. 打开浏览器扩展管理页面（`chrome://extensions/`）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择扩展文件夹

#### Firefox
1. 下载扩展文件包
2. 打开 `about:debugging`
3. 点击"此 Firefox"
4. 点击"临时载入附加组件"
5. 选择 `manifest.json` 文件

### 配置 WebDAV

1. **准备 WebDAV 服务**
   推荐使用坚果云：
   - 注册坚果云账号
   - 在账户设置中启用 WebDAV
   - 获取 WebDAV 地址和应用密码

2. **登录配置**
   - WebDAV 地址：`https://dav.jianguoyun.com/dav/`（坚果云默认）
   - 用户名：您的邮箱
   - 密码：WebDAV 应用密码

3. **文件结构**
   ```
   WebDAV 根目录/
   └── webdav-subscribe/
       ├── subscription.json  # 订阅配置文件
       └── node-info.txt      # 节点信息文件
   ```

## 📖 使用指南

### 订阅管理

#### 新增订阅
1. 点击"新增订阅"按钮
2. 填写订阅信息：
   - **名称**: 自定义订阅名称
   - **地址**: 订阅链接 URL
   - **类型**: 选择 clash/xray/xray+clash
   - **备注**: 可选的备注信息

#### 编辑订阅
- 点击订阅项目的"编辑"按钮
- 修改相关信息后保存

#### 检测订阅
- **单个检测**: 点击"检测"按钮
- **批量检测**: 点击"检测全部"按钮
- 支持代理和直连两种模式

#### Clash 导入
- 仅支持 `clash` 和 `xray+clash` 类型
- 点击"Clash导入"自动复制导入链接
- 自动尝试打开 Clash 客户端

### 代理配置

#### HTTP 代理设置
1. 在设置页面启用"HTTP代理检测"
2. 配置代理地址：
   - 格式: `http://host:port`
   - 认证: `http://user:pass@host:port`
   - 示例: `http://127.0.0.1:7890`

#### 检测参数调优
- **最大并发数**: 1-20（推荐 3-10）
- **检测超时**: 1000-60000ms（推荐 10000ms）

### 高级功能

#### 独立窗口
- 点击标题栏的"独立窗口"按钮
- 创建独立的管理窗口，支持多任务操作

#### 快捷键
- `Ctrl + R`: 刷新数据
- `Ctrl + P`: 创建独立窗口
- `ESC`: 关闭弹窗

## ⚙️ 配置说明

### 默认配置

```json
{
  "webdavUrl": "https://dav.jianguoyun.com/dav/",
  "subscriptionPath": "webdav-subscribe/subscription.json",
  "nodePath": "webdav-subscribe/node-info.txt",
  "enableProxyCheck": false,
  "proxyUrl": "http://127.0.0.1:7890",
  "maxConcurrent": 5,
  "checkTimeout": 10000
}
```

### 文件格式

#### subscription.json
```json
[
  {
    "name": "我的订阅",
    "url": "https://example.com/subscribe",
    "type": "clash",
    "remark": "备注信息"
  }
]
```

#### node-info.txt
```
节点1 vmess://eyJ2IjoiMiIsInBzIjoi...
节点2 trojan://password@server:port
节点3 ss://method:password@server:port
```

## 🔧 开发说明

### 项目结构
```
webdav-extension/
├── manifest.json              # 扩展清单文件
├── popup/
│   ├── popup.html            # 弹窗界面
│   ├── popup.js              # 主要逻辑
│   └── popup.css             # 样式文件
├── background/
│   └── background.js         # 后台脚本
├── lib/
│   ├── webdav.js            # WebDAV 客户端
│   ├── subscription.js       # 订阅管理
│   └── clipboard.js          # 剪贴板工具
└── assets/
    └── icons/               # 图标文件
```

### 技术栈
- JavaScript (ES6+): 主要开发语言
- Chrome Extension API: 浏览器扩展接口
- WebDAV Protocol: 文件同步协议
- CSS3: 界面样式
- HTML5: 界面结构

### 开发环境
1. 克隆项目到本地
2. 修改代码
3. 在浏览器中重新加载扩展
4. 测试功能

## 🛠️ 故障排除

### 常见问题

#### Q: WebDAV 连接失败
A: 检查以下项目：
- 网络连接是否正常
- WebDAV 地址是否正确
- 用户名密码是否正确
- 是否启用了 WebDAV 功能

#### Q: 订阅检测失败
A: 可能的原因：
- 订阅地址无效或过期
- 网络连接问题
- 代理配置错误
- 防火墙阻止访问

#### Q: Clash 导入不工作
A: 确认以下事项：
- 订阅类型为 clash 或 xray+clash
- 已安装 Clash 客户端
- Clash 客户端支持 clash:// 协议

#### Q: 代理检测不生效
A: 检查代理设置：
- 代理地址格式正确
- 代理服务正在运行
- 代理支持 HTTP 协议
- 防火墙允许代理连接

### 调试方法

#### 开启开发者工具
- 右键扩展图标 → "检查弹出内容"
- 查看控制台错误信息
- 查看后台脚本日志

#### 访问 chrome://extensions/
- 点击扩展的"背景页"链接
- 查看控制台输出

#### 网络请求调试
- 在 Network 标签查看请求详情
- 检查请求头和响应内容

## 🤝 贡献指南
欢迎提交 Issue 和 Pull Request！

### 提交 Issue
- 详细描述问题现象
- 提供错误日志
- 说明使用环境

### 提交 PR
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 创建 Pull Request

## 📄 许可证
本项目采用 MIT 许可证。详见 LICENSE 文件。

## 🙏 致谢
- ccxyChuzhong/v2ray-latest-node - 项目灵感来源
- 所有贡献者和用户的支持

⭐ 如果这个项目对您有帮助，请给它一个 Star！
