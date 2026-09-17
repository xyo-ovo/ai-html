# 🎨 AI HTML 工坊

一个**纯前端**的 AI 聊天工作台：接上你自己的 API，和 AI 聊天写代码，吐出来的 HTML 自动变成文件卡片，点开全屏预览，右上角悬浮「复制 / 下载 / 返回」——不用再被一长串代码刷屏了。

## ✨ 功能

- 🔌 **自定义供应商**：DeepSeek / OpenAI / Kimi / 智谱 / 通义 / OpenRouter / Ollama…填 Key 后**一键拉取模型列表**，也可手动输入
- 💬 **流式对话**：原生 fetch 流式接收，打字机效果
- 🌐 **HTML → 文件卡片**：AI 输出的 html 代码块自动存成文件，点开即预览
- 📋⬇️✕ **全屏预览**：右上角悬浮工具栏（复制代码 / 下载文件 / 返回）
- 🗂️ **文件库**：所有生成的页面随时预览、下载、删除
- 💾 **数据全本地**：对话存 localStorage、文件存 IndexedDB、Key 存浏览器，**不上传任何服务器**
- 📦 **零依赖零构建**：纯 HTML + CSS + 原生 JS，扔哪儿都能跑

## 🚀 使用

1. 打开网站（GitHub Pages 地址）
2. 点右上角 ⚙️ → 「＋ 添加供应商」→ 选个预设或填 Base URL + Key
3. 点「拉取模型」选模型，保存
4. 聊天框里说：「帮我写个 xxx 网页」
5. AI 吐出的 HTML 会变成 🌐 卡片 → 点开全屏预览 → 右上角复制 / 下载 / 返回

## 🔐 关于安全

- API Key 只存在你自己浏览器的 localStorage 里，直接从浏览器请求你填的 API 地址
- 预览用 iframe `sandbox` 隔离渲染

## 🛠️ 本地跑

```bash
git clone https://github.com/xyo-ovo/ai-html.git
cd ai-html
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 📁 结构

```
index.html   页面骨架
style.css    暗色主题样式
app.js       全部逻辑（对话 / 解析 / 预览 / 存储）
```

---

Made with 💜 by 小机 & xyo-ovo
