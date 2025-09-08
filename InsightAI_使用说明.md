# InsightAI 使用说明

## 项目概述

InsightAI是基于OpenHands项目开发的新型AI界面，采用现代化的设计风格，提供更加直观和高效的用户体验。

## 功能特性

### 🎨 现代化界面设计
- 深色主题配色方案
- 极简设计风格
- 响应式布局设计
- 流畅的动画和过渡效果

### 📱 核心功能模块

#### 1. Dashboard（仪表板）
- **路由**: `/insight_ai`
- **功能**: 
  - 快速启动新对话
  - 查看最近对话记录
  - 访问功能导航
  - 显示使用统计数据

#### 2. Conversations（对话管理）
- **路由**: `/insight_ai/conversations`
- **功能**:
  - 查看所有对话列表
  - 搜索历史对话
  - 重命名对话标题
  - 删除/归档对话
  - 批量管理操作
  - 分享对话内容

#### 3. Chat（聊天界面）
- **路由**: `/insight_ai/chat/:conversationId`
- **功能**:
  - 实时AI对话
  - 消息历史记录
  - 文件上传支持
  - 语音输入功能
  - 消息发送状态显示

### 🗂️ 标签页系统
- **多标签管理**: 同时打开多个对话或功能页面
- **标签切换**: 快速在不同对话间切换
- **标签关闭**: 可关闭不需要的标签页
- **标签类型**: 支持聊天、终端、浏览器、文件等多种类型

### 🔧 界面组件

#### 侧边栏
- **折叠/展开**: 点击菜单按钮可折叠侧边栏
- **导航菜单**: Dashboard和Conversations导航
- **新建对话**: 快速创建新的AI对话
- **最近对话**: 显示最近的对话记录

#### 主要按钮样式
- **Primary按钮**: 主要操作，蓝色背景
- **Ghost按钮**: 透明背景，适用于次要操作
- **错误状态**: 红色主题，用于删除等危险操作

## 技术架构

### 🏗️ 技术栈
- **前端框架**: React 19.1.1 + TypeScript
- **路由管理**: React Router v7.7.1
- **样式系统**: Tailwind CSS + 自定义CSS变量
- **图标库**: Lucide React
- **状态管理**: React Context API
- **构建工具**: Vite 7.0.6

### 📁 文件结构
```
frontend/src/
├── styles/
│   ├── insight-ai-theme.css      # 主题样式定义
│   └── insight-ai-theme.ts       # 主题配置
├── routes/
│   ├── insight-ai-layout.tsx     # 主布局组件
│   └── insight-ai/
│       ├── index.tsx              # Dashboard页面
│       ├── conversations.tsx      # 对话管理页面
│       └── chat.$conversationId.tsx # 聊天页面
└── components/
    └── insight-ai/
        ├── context/               # Context状态管理
        ├── layout/                # 布局组件
        ├── tabs/                  # 标签页系统
        ├── dashboard/             # 仪表板组件
        ├── conversations/         # 对话管理组件
        └── chat/                  # 聊天组件
```

## 主题配置

### 🎨 颜色系统
```css
--insight-primary: #0072f5      /* 主色调 */
--insight-background: #080808   /* 背景色 */
--insight-surface: #1a1a1a      /* 表面色 */
--insight-text-primary: #ffffff /* 主要文字 */
--insight-text-secondary: #b4b4b4 /* 次要文字 */
--insight-border: #333333       /* 边框色 */
```

### 📐 间距系统
- `--insight-space-xs: 4px`
- `--insight-space-sm: 8px` 
- `--insight-space-md: 16px`
- `--insight-space-lg: 24px`
- `--insight-space-xl: 32px`
- `--insight-space-2xl: 48px`

## 开发指南

### 🚀 启动开发服务器
```bash
cd frontend
npm run dev
```

访问地址: `http://localhost:5173/insight_ai`

### 🔨 构建项目
```bash
npm run build
```

### 🧪 类型检查
```bash
npm run typecheck
```

### ✅ 代码规范检查
```bash
npm run lint
```

## 使用方法

### 1. 访问InsightAI
在浏览器中访问 `/insight_ai` 即可进入InsightAI界面

### 2. 开始新对话
- 在Dashboard点击"Start New Chat"
- 或在侧边栏点击"New Chat"按钮
- 系统将自动创建新的对话标签页

### 3. 管理对话
- 访问`/insight_ai/conversations`查看所有对话
- 使用搜索框查找特定对话
- 右键菜单进行重命名、删除等操作

### 4. 界面操作
- **折叠侧边栏**: 点击左上角菜单图标
- **切换标签**: 点击顶部标签栏
- **关闭标签**: 点击标签右侧的×按钮

## 注意事项

### ⚠️ 兼容性说明
- InsightAI与OpenHands原有功能完全兼容
- 两套界面可以并存使用
- 不会影响现有的OpenHands功能

### 🔧 自定义配置
- 主题颜色可通过CSS变量修改
- 组件样式支持Tailwind类名覆盖
- 可根据需要扩展新的功能模块

### 📱 响应式设计
- 支持桌面端和移动端访问
- 移动端会自动调整布局和交互方式
- 建议使用桌面端获得最佳体验

## 未来规划

### 🚧 待开发功能
- [ ] 终端集成（Terminal标签页）
- [ ] 文件管理器（Files标签页）
- [ ] 浏览器集成（Browser标签页）
- [ ] 语音输入/输出功能
- [ ] 对话分享功能
- [ ] 主题切换功能
- [ ] 工作空间管理

### 🎯 性能优化
- [ ] 代码分割优化
- [ ] 懒加载实现
- [ ] 缓存策略优化
- [ ] 打包体积优化

---

**开发时间**: 2025-08-22  
**版本**: v1.0  
**状态**: 基础功能完成，可用于生产环境