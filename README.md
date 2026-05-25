# AI 聊天应用

一个基于 React + Vite + Vercel AI SDK 的 AI 聊天界面，已接入 DeepSeek API。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

创建 `.env.local` 文件（已被 gitignore 忽略，不会提交到仓库）：

```env
DEEPSEEK_API_KEY=your_api_key_here
```

### 3. 启动后端

```bash
npm run server
```

后端运行在 http://localhost:3001

### 4. 启动前端

```bash
npm run dev
```

访问 http://localhost:5173 即可使用。

## 功能特性

- ✅ 多会话管理（创建、切换、自动标题）
- ✅ 流式对话（Vercel AI SDK）
- ✅ Markdown 渲染（标题、列表、代码块、表格等）
- ✅ 加载状态提示
- ✅ 错误处理
- ✅ 支持键盘快捷键（Enter 发送，Shift+Enter 换行）
- ✅ 侧边栏折叠

## 技术栈

- React 19
- Vite 8
- Vercel AI SDK v6
- Express 5
- DeepSeek API

## 架构说明

```
浏览器 → Vite(:5173) → proxy → Express(:3001) → DeepSeek API
```

- 前端通过 `/api/chat` 发送请求，Vite 代理转发到 Express 后端
- Express 使用 Vercel AI SDK 的 `streamText` 调用 DeepSeek API
- API Key 仅存储在 `.env.local`，由后端读取，不暴露到前端

## 项目结构

```
server/
  └── index.js          # Express 后端（AI SDK streamText）
src/
  ├── pages/
  │   ├── ChatPage.jsx   # 多会话管理 + 侧边栏
  │   ├── ChatView.jsx   # 单会话视图（useChat hook）
  │   └── ChatPage.css   # 样式
  ├── App.jsx            # 根组件
  ├── main.jsx           # React 入口
  └── index.css          # 全局样式
```
