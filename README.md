# AI 聊天应用

一个基于 React + Vite 的 AI 聊天界面，已接入 DeepSeek API。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

创建 `.env.local` 文件（已被 gitignore 忽略，不会提交到仓库）：

```env
VITE_DEEPSEEK_API_KEY=your_api_key_here
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
```

⚠️ **安全提示**：
- 不要将 API Key 提交到 Git 仓库
- 如果 API Key 泄露，请立即到 DeepSeek 后台重新生成

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可使用。

## 功能特性

- ✅ 对话历史记录（保留最近10条）
- ✅ 加载状态提示
- ✅ 错误处理
- ✅ 支持键盘快捷键（Enter 发送）

## 技术栈

- React 19
- Vite 8
- DeepSeek API

## 项目结构

```
src/
├── App.jsx          # 主组件，包含聊天逻辑
├── App.css          # 样式文件
├── main.jsx         # React 入口
└── index.css        # 全局样式

vite.config.js       # Vite 配置（含 API 代理）
.env.local           # 本地环境变量（不提交）
```

## 原理说明

前端通过 `/api/chat` 发送请求，Vite 开发服务器拦截该请求并代理到 DeepSeek API，避免在前端暴露 API Key。
