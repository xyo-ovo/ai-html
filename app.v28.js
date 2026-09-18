/* ============================================================
   AI HTML 工坊 · 核心逻辑 v28
   · 思维链：手动上滑后不再自动拉到底
   · HTML 预览：按内容高度自适应，不再全屏铺满
   · 输入区：＋ 菜单（上传文件 / 上传图片）
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const isTouch = (() => {
  try { return matchMedia('(hover: none)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
  catch (e) { return false; }
})();

const DEFAULT_SYS = '你是前端工程师。用户要网页时，直接输出完整可运行的单文件 HTML，用 html 代码块包裹，不要省略任何部分。';
const DEFAULT_NAME = 'AI HTML 工坊';
const DEFAULT_AVATAR = '🎨';
const DEFAULT_GREETING = '先去设置页添加 API（DeepSeek / OpenAI / Kimi / 智谱等都可以），然后直接说「帮我写个 xxx 网页」。<br>代码块会自动变成文件卡片；也可以粘贴或拖入图片、文本文件。<br>左上角 ☰ 可以看历史对话。';

let toastTimer;
function toast(msg, ms = 1800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

/* ---------- 本地状态 ---------- */
const LS = {
  get providers() { try { return JSON.parse(localStorage.getItem('aih.providers') || '[]'); } catch { return []; } },
  set providers(v) { localStorage.setItem('aih.providers', JSON.stringify(v)); },
  get activeId() { return localStorage.getItem('aih.active') || ''; },
  set activeId(v) { localStorage.setItem('aih.active', v); },
  get themeMode() { return localStorage.getItem('aih.themeMode') || localStorage.getItem('aih.theme') || 'light'; },
  set themeMode(v) { localStorage.setItem('aih.themeMode', v); },
  get themeColor() { return localStorage.getItem('aih.themeColor') || 'coral'; },
  set themeColor(v) { localStorage.setItem('aih.themeColor', v); },
  get tools() { try { return JSON.parse(localStorage.getItem('aih.tools') || '[]'); } catch { return []; } },
  set tools(v) { localStorage.setItem('aih.tools', JSON.stringify(v)); },
  get lore() { try { return JSON.parse(localStorage.getItem('aih.lore') || '[]'); } catch { return []; } },
  set lore(v) { localStorage.setItem('aih.lore', JSON.stringify(v)); },
  get sessions() { try { return JSON.parse(localStorage.getItem('aih.sessions') || '[]'); } catch { return []; } },
  set sessions(v) { localStorage.setItem('aih.sessions', JSON.stringify(v)); },
  get persona() { try { return JSON.parse(localStorage.getItem('aih.persona') || '{}'); } catch { return {}; } },
  set persona(v) { localStorage.setItem('aih.persona', JSON.stringify(v)); },
};

/* ---------- 会话管理 ---------- */
let sessions = [];
let currentId = '';

(function initSessions() {
  sessions = LS.sessions;
  currentId = localStorage.getItem('aih.current') || '';
  if (!sessions.length) {
    let old = [];
    try { old = JSON.parse(localStorage.getItem('aih.messages') || '[]'); } catch (e) {}
    const s = { id: uid(), title: '新对话', messages: old, ts: Date.now() };
    sessions = [s];
    currentId = s.id;
    LS.sessions = sessions;
    localStorage.setItem('aih.current', currentId);
  }
  if (!sessions.find(s => s.id === currentId)) currentId = sessions[0].id;
})();

function currentSession() {
  return sessions.find(s => s.id === currentId) || sessions[0];
}
let messages = currentSession().messages || [];

let streaming = false;
let abortCtrl = null;
let curFile = null;
let autoScroll = true;
let lockScroll = false;
let touchY = 0;
let firstRender = true;
let teToolsCache = [];
let teHeaders = [];
let editingToolId = null;
let editingLoreId = null;
let editingIndex = null;
let streamOptionsOK = true;
let curPage = 'chat';
let pendingAtts = [];

/* ---------- 主题（整套配色） ---------- */
const THEME_COLORS = {
  coral:  ['#CBAC8C', '#A9835F'],
  blue:   ['#6B9BD8', '#3B6DB8'],
  green:  ['#6FAE87', '#3F7D5C'],
  violet: ['#9B8AD8', '#6D5AB8'],
  rose:   ['#D88BA5', '#B85C7A'],
};
const THEME_NAMES = { coral: '珊瑚', blue: '雾蓝', green: '苔绿', violet: '雾紫', rose: '玫瑰' };

function prefersDark() {
  try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
}
function isDarkActive() {
  const m = LS.themeMode;
  return m === 'dark' || (m === 'auto' && prefersDark());
}
function applyTheme() {
  const root = document.documentElement;
  root.classList.toggle('dark', isDarkActive());
  root.dataset.theme = LS.themeColor || 'coral';
}
try {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (LS.themeMode === 'auto') applyTheme();
  });
} catch (e) {}

/* ---------- 人设（每个对话独立） ---------- */
function sessionPersona() {
  const s = currentSession();
  const p = (s && s.persona) || LS.persona || {};
  return {
    avatar: p.avatar || DEFAULT_AVATAR,
    name: p.name || DEFAULT_NAME,
    greeting: p.greeting || '',
    bio: p.bio || '',
    allowTime: !!p.allowTime,
    allowHistory: !!p.allowHistory,
  };
}
function setPersonaFlag(key, val) {
  const s = currentSession();
  if (!s) return;
  if (!s.persona) {
    const p = sessionPersona();
    s.persona = { avatar: p.avatar, name: p.name, bio: p.bio, greeting: p.greeting };
  }
  s.persona[key] = val;
  LS.sessions = sessions;
}
function renderBrand() {
  const p = sessionPersona();
  const av = $('#brand-avatar');
  const nm = $('#brand-name');
  if (av) av.textContent = p.avatar;
  if (nm) nm.textContent = p.name;
  try { document.title = p.name; } catch (e) {}
}
function openPersona() {
  const p = sessionPersona();
  const s = currentSession();
  $('#pa-avatar').value = p.avatar;
  $('#pa-name').value = p.name;
  $('#pa-bio').value = p.bio;
  $('#pa-greeting').value = p.greeting;
  const tBtn = $('#pa-time');
  const hBtn = $('#pa-history');
  if (tBtn) tBtn.classList.toggle('on', p.allowTime);
  if (hBtn) hBtn.classList.toggle('on', p.allowHistory);
  const tip = $('#pa-scope');
  if (tip) {
    tip.textContent = (s && s.persona)
      ? '这套人设只属于「' + (s.title || '当前对话') + '」'
      : '当前对话还没单独设过人设，显示的是默认值';
  }
  openSheet('persona');
}
function savePersona() {
  const cur = sessionPersona();
  const p = {
    avatar: ($('#pa-avatar').value || '').trim().slice(0, 4) || DEFAULT_AVATAR,
    name: ($('#pa-name').value || '').trim().slice(0, 24) || DEFAULT_NAME,
    bio: ($('#pa-bio').value || '').trim(),
    greeting: ($('#pa-greeting').value || '').trim(),
    allowTime: cur.allowTime,
    allowHistory: cur.allowHistory,
  };
  const s = currentSession();
  if (s) {
    s.persona = p;
    LS.sessions = sessions;
  }
  renderBrand();
  renderMessages();
  closeSheet('persona');
  toast('已保存到当前对话');
}
function resetPersona() {
  if (!confirm('恢复默认人设？（当前对话的自定义人设和权限会被清掉）')) return;
  const s = currentSession();
  if (s) {
    delete s.persona;
    LS.sessions = sessions;
  }
  renderBrand();
  renderMessages();
  openPersona();
  toast('已恢复默认');
}

/* ---------- 当前时间注入 ---------- */
function nowContext() {
  const p = sessionPersona();
  if (!p.allowTime) return '';
  const d = new Date();
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const pad = n => String(n).padStart(2, '0');
  return '\n\n【当前日期时间】' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
    wd + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* ---------- 历史对话检索 ---------- */
function searchHistory(kw) {
  const q = String(kw || '').trim().toLowerCase();
  if (!q) return '（没有提供关键词）';
  const hits = [];
  const list = sessions.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  for (const s of list) {
    for (const m of (s.messages || [])) {
      const c = typeof m.content === 'string' ? m.content : '';
      if (!c) continue;
      const low = c.toLowerCase();
      const i = low.indexOf(q);
      if (i < 0) continue;
      const from = Math.max(0, i - 100);
      const to = Math.min(c.length, i + 220);
      hits.push(
        '【' + (s.title || '新对话') + ' · ' + (m.role === 'user' ? '用户' : 'AI') + ' · ' + fmtTime(m.time) + '】\n' +
        (from > 0 ? '…' : '') + c.slice(from, to).replace(/\s+/g, ' ').trim() + (to < c.length ? '…' : '')
      );
      if (hits.length >= 10) break;
    }
    if (hits.length >= 10) break;
  }
  if (!hits.length) return '没有找到包含「' + kw + '」的历史对话内容。';
  return '找到 ' + hits.length + ' 条相关记录：\n\n' + hits.join('\n\n');
}

/* ---------- 世界书 ---------- */
function loreKeywordList(e) {
  return String(e.keywords || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
}
function buildSystemPrompt() {
  let base = sessionPersona().bio || DEFAULT_SYS;
  const entries = LS.lore.filter(e => e.enabled !== false && (e.content || '').trim());
  if (entries.length) {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const text = (lastUser && typeof lastUser.content === 'string' ? lastUser.content : '') || '';
    const hits = entries.filter(e => {
      const kws = loreKeywordList(e);
      if (!kws.length) return true;
      return kws.some(k => text.includes(k));
    });
    if (hits.length) {
      base += '\n\n【世界书设定】\n' + hits.map(e =>
        '· ' + (e.name ? e.name + '：' : '') + String(e.content).trim()
      ).join('\n');
    }
  }
  base += nowContext();
  return base;
}
function renderLore() {
  const box = $('#lore-list');
  if (!box) return;
  const list = LS.lore;
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty" style="padding:18px">还没有条目<br>点下面添加，给 AI 加点长期设定</div>';
    return;
  }
  for (const e of list) {
    const d = document.createElement('div');
    d.className = 'tool-item';
    const kws = loreKeywordList(e);
    const sub = kws.length ? ('关键词：' + kws.join('、')) : '常驻（每次都注入）';
    d.innerHTML = `<div class="ti-icon">${icon('spark')}</div>
      <div class="ti-meta">
        <div class="ti-name">${esc(e.name || '未命名条目')}</div>
        <div class="ti-sub">${esc(sub)}</div>
      </div>
      <button class="ti-toggle${e.enabled !== false ? ' on' : ''}" title="启用 / 停用"></button>
      <button class="ti-edit" title="编辑">${icon('edit')}</button>`;
    d.querySelector('.ti-toggle').onclick = ev => {
      ev.stopPropagation();
      const arr = LS.lore;
      const t = arr.find(x => x.id === e.id);
      if (t) { t.enabled = t.enabled === false; LS.lore = arr; }
      renderLore();
    };
    d.querySelector('.ti-edit').onclick = ev => { ev.stopPropagation(); openLoreEdit(e.id); };
    box.appendChild(d);
  }
}
function openLoreEdit(id) {
  editingLoreId = id || null;
  const e = id ? LS.lore.find(x => x.id === id) : null;
  $('#le-title').textContent = e ? '编辑条目' : '添加条目';
  $('#le-name').value = e ? (e.name || '') : '';
  $('#le-keywords').value = e ? (e.keywords || '') : '';
  $('#le-content').value = e ? (e.content || '') : '';
  $('#le-delete').hidden = !e;
  openSheet('lore-edit');
}
function saveLore() {
  const name = ($('#le-name').value || '').trim() || '未命名条目';
  const keywords = ($('#le-keywords').value || '').trim();
  const content = ($('#le-content').value || '').trim();
  if (!content) { toast('内容不能为空'); return; }
  const arr = LS.lore;
  if (editingLoreId) {
    const e = arr.find(x => x.id === editingLoreId);
    if (e) Object.assign(e, { name, keywords, content });
  } else {
    arr.push({ id: uid(), name, keywords, content, enabled: true });
  }
  LS.lore = arr;
  closeSheet('lore-edit');
  renderLore();
  toast('已保存');
}
function deleteLore() {
  if (!editingLoreId) return;
  if (!confirm('删除这个条目？')) return;
  LS.lore = LS.lore.filter(x => x.id !== editingLoreId);
  closeSheet('lore-edit');
  renderLore();
  toast('已删除');
}

/* ---------- 推理模式 → 请求参数 ---------- */
const THINK_BUDGET = { low: 1024, medium: 4096, high: 16384 };
function reasoningParams(p) {
  const mode = p.reasoning || 'default';
  if (mode === 'default') return {};
  const base = (p.base || '').toLowerCase();
  const on = mode !== 'off';
  if (base.includes('api.deepseek.com')) return {};
  if (base.includes('openrouter.ai')) {
    return on ? { reasoning: { effort: mode } } : { reasoning: { enabled: false } };
  }
  if (base.includes('bigmodel.cn')) {
    return { thinking: { type: on ? 'enabled' : 'disabled' } };
  }
  if (base.includes('dashscope.aliyuncs.com')) {
    return on
      ? { enable_thinking: true, thinking_budget: THINK_BUDGET[mode] || 4096 }
      : { enable_thinking: false };
  }
  if (base.includes('api.openai.com')) {
    return { reasoning_effort: on ? mode : 'minimal' };
  }
  return on ? { enable_thinking: true } : { enable_thinking: false };
}

/* ---------- IndexedDB ---------- */
let _db = null;
function db() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const r = indexedDB.open('ai-html', 1);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' });
    };
    r.onsuccess = () => { _db = r.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}
const dbPut = async f => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').put(f); t.oncomplete = res; t.onerror = () => rej(t.error); }); };
const dbGet = async id => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', 'readonly'); const q = t.objectStore('files').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
const dbAll = async () => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', 'readonly'); const q = t.objectStore('files').getAll(); q.onsuccess = () => res(q.result.sort((a, b) => b.ts - a.ts)); q.onerror = () => rej(q.error); }); };
const dbDel = async id => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', 'readwrite'); t.objectStore('files').delete(id); t.oncomplete = res; t.onerror = () => rej(t.error); }); };

function activeProvider() {
  const ps = LS.providers;
  return ps.find(p => p.id === LS.activeId) || ps[0] || null;
}
function saveMessages() {
  const s = currentSession();
  if (!s) return;
  s.messages = messages;
  s.ts = Date.now();
  if (!s.titled && (!s.title || s.title === '新对话')) {
    const firstUser = messages.find(m => m.role === 'user');
    if (firstUser) {
      const src = typeof firstUser.content === 'string' ? firstUser.content : '';
      const t = src.replace(/\s+/g, ' ').trim().slice(0, 22);
      if (t) s.title = t;
      else if (firstUser.attachments && firstUser.attachments.length) s.title = '图片 / 文件';
    }
  }
  try { LS.sessions = sessions; }
  catch (e) { toast('历史太多存不下了，建议删掉一些旧对话～', 3000); }
}

/* ---------- 附件（图片 / 文件） ---------- */
const TEXT_EXT = ['txt','md','markdown','json','jsonc','csv','tsv','xml','yaml','yml','toml','ini','conf','env','log','js','mjs','cjs','ts','jsx','tsx','css','scss','less','sass','html','htm','svg','py','rb','php','java','c','h','cpp','cxx','cc','hpp','cs','go','rs','swift','kt','kts','sh','bash','zsh','fish','ps1','bat','cmd','sql','graphql','gql','vue','svelte','astro','r','lua','pl','pm','dart','scala','groovy','diff','patch','gitignore','dockerfile','makefile','cmake','tex','rst','org','properties','gradle','srt','vtt'];

function extOf(name) {
  const m = String(name || '').match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}
function fmtSize(n) {
  n = Number(n || 0);
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
function readAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}
function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
async function addFiles(files) {
  const list = [...(files || [])];
  if (!list.length) return;
  if (curPage !== 'chat') switchPage('chat');
  for (const f of list) {
    if (pendingAtts.length >= 6) { toast('最多同时带 6 个附件'); break; }
    const isImg = /^image\//.test(f.type || '') || /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(f.name || '');
    if (f.size > 8 * 1024 * 1024) { toast((f.name || '文件') + ' 太大（超过 8MB）'); continue; }
    try {
      if (isImg) {
        const dataUrl = await readAsDataURL(f);
        pendingAtts.push({ id: uid(), kind: 'image', name: f.name || '图片', size: f.size, dataUrl });
      } else {
        const ext = extOf(f.name);
        const okText = /^text\//.test(f.type || '') || TEXT_EXT.includes(ext);
        if (!okText) { toast('暂不支持 ' + (ext ? '.' + ext : '这种') + ' 文件（目前支持图片和文本类）', 2600); continue; }
        const text = await readAsText(f);
        if (text.length > 300000) { toast((f.name || '文件') + ' 内容太长（超过 30 万字符）'); continue; }
        pendingAtts.push({ id: uid(), kind: 'text', name: f.name || '文件', size: f.size, ext, text });
      }
    } catch (e) { toast('读取失败：' + (f.name || '')); }
  }
  renderAttachBar();
}
function renderAttachBar() {
  const bar = $('#attach-bar');
  const box = $('#attach-list');
  if (!bar || !box) return;
  if (!pendingAtts.length) {
    bar.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.innerHTML = '';
  for (const a of pendingAtts) {
    const d = document.createElement('div');
    d.className = 'att-item';
    if (a.kind === 'image') {
      d.innerHTML = `<img src="${a.dataUrl}" alt="" /><button class="att-x" title="移除">×</button>`;
    } else {
      d.innerHTML = `<div class="att-ico">${icon('file')}</div>
        <div class="att-meta"><div class="att-n">${esc(a.name)}</div><div class="att-s">${fmtSize(a.size)}</div></div>
        <button class="att-x" title="移除">×</button>`;
    }
    d.querySelector('.att-x').onclick = e => {
      e.stopPropagation();
      pendingAtts = pendingAtts.filter(x => x.id !== a.id);
      renderAttachBar();
    };
    box.appendChild(d);
  }
  bar.classList.remove('hidden');
}
function buildUserContent(m) {
  const atts = m.attachments || [];
  let text = typeof m.content === 'string' ? m.content : '';
  const texts = atts.filter(a => a.kind === 'text');
  const imgs = atts.filter(a => a.kind === 'image');
  if (texts.length) {
    text += (text ? '\n\n' : '') + texts.map(a =>
      '【文件：' + a.name + '】\n```' + (a.ext || '') + '\n' + a.text + '\n```'
    ).join('\n\n');
  }
  if (!imgs.length) return text;
  const parts = [];
  if (text.trim()) parts.push({ type: 'text', text });
  for (const im of imgs) parts.push({ type: 'image_url', image_url: { url: im.dataUrl } });
  return parts;
}

/* ---------- MCP 工具 ---------- */
function normalizeHeaders(h) {
  if (Array.isArray(h)) {
    return h.filter(x => x && x.n).map(x => ({ n: String(x.n), v: String(x.v == null ? '' : x.v) }));
  }
  if (typeof h === 'string') {
    const s = h.trim();
    if (!s) return [];
    try { return normalizeHeaders(JSON.parse(s)); } catch (e) { return []; }
  }
  if (h && typeof h === 'object') {
    return Object.keys(h).map(k => ({ n: k, v: String(h[k]) }));
  }
  return [];
}

function mcpHeaders(server) {
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  for (const it of normalizeHeaders(server.headers)) {
    if (it.n) h[it.n] = it.v;
  }
  return h;
}

function parseMcpResponse(text) {
  const t = (text || '').trim();
  if (!t) return null;
  if (t.startsWith('{') || t.startsWith('[')) {
    const j = JSON.parse(t);
    if (j.error) throw new Error((j.error && j.error.message) || 'MCP 返回错误');
    return j.result !== undefined ? j.result : j;
  }
  let last = null;
  for (const line of t.split('\n')) {
    const l = line.trim();
    if (!l.startsWith('data:')) continue;
    const d = l.slice(5).trim();
    if (!d || d === '[DONE]') continue;
    try {
      const j = JSON.parse(d);
      if (j.error) throw new Error((j.error && j.error.message) || 'MCP 返回错误');
      if (j.result !== undefined) last = j.result;
    } catch (e) {
      if (e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return last;
}

async function mcpRequest(server, method, params, id) {
  const body = { jsonrpc: '2.0', id: id || Date.now(), method, params: params || {} };
  const res = await fetch(server.url, {
    method: 'POST',
    headers: mcpHeaders(server),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return parseMcpResponse(await res.text());
}

async function mcpListTools(server) {
  try {
    await mcpRequest(server, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ai-html-workshop', version: '28.0' },
    }, 0);
  } catch (e) {}
  const r = await mcpRequest(server, 'tools/list', {}, 1);
  return (r && r.tools) || [];
}

async function mcpCallTool(server, name, args) {
  const r = await mcpRequest(server, 'tools/call', { name, arguments: args || {} });
  if (r && Array.isArray(r.content)) {
    return r.content.map(c => {
      if (!c) return '';
      if (typeof c.text === 'string') return c.text;
      if (c.type === 'image') return '[图片内容]';
      if (c.type === 'resource') return (c.resource && (c.resource.text || c.resource.uri)) || '[资源]';
      return JSON.stringify(c);
    }).filter(Boolean).join('\n');
  }
  if (typeof r === 'string') return r;
  if (r && r.isError) return '工具返回错误：' + JSON.stringify(r);
  return r ? JSON.stringify(r) : '(空)';
}

function buildToolsPayload() {
  const tools = [];
  const map = {};
  const used = new Set();

  if (sessionPersona().allowHistory) {
    used.add('search_history');
    map['search_history'] = { builtin: 'history' };
    tools.push({
      type: 'function',
      function: {
        name: 'search_history',
        description: '搜索用户过往的历史对话记录。当用户提到「之前」「上次」「我们聊过」「那个项目」之类，或你需要回忆早前讨论过的内容、代码、决定时使用。',
        parameters: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: '要检索的关键词，例如「登录页」「配色」「动画」' },
          },
          required: ['keyword'],
        },
      },
    });
  }

  for (const s of LS.tools) {
    if (!s.enabled) continue;
    for (const t of (s.tools || [])) {
      let base = String(t.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 56);
      if (!base) continue;
      let n = base, i = 2;
      while (used.has(n)) { n = base + '_' + i; i++; }
      used.add(n);
      map[n] = { serverId: s.id, toolName: t.name };
      tools.push({
        type: 'function',
        function: {
          name: n,
          description: String(t.description || '').slice(0, 900),
          parameters: (t.inputSchema && typeof t.inputSchema === 'object')
            ? t.inputSchema
            : { type: 'object', properties: {} },
        },
      });
    }
  }
  return { tools, map };
}

/* ---------- 代码块 → 文件类型 ---------- */
const EXT_MAP = {
  html: 'html', htm: 'html', svg: 'svg', xml: 'xml',
  css: 'css', scss: 'scss', less: 'less', sass: 'sass',
  js: 'js', javascript: 'js', mjs: 'mjs', cjs: 'cjs',
  jsx: 'jsx', ts: 'ts', typescript: 'ts', tsx: 'tsx',
  json: 'json', jsonc: 'json', json5: 'json5',
  yaml: 'yml', yml: 'yml', toml: 'toml', ini: 'ini', conf: 'conf', env: 'env',
  md: 'md', markdown: 'md', mdx: 'mdx',
  txt: 'txt', text: 'txt', plain: 'txt', log: 'log',
  doc: 'doc', docx: 'docx', rtf: 'rtf', pdf: 'pdf',
  csv: 'csv', tsv: 'tsv', xls: 'xls', xlsx: 'xlsx',
  py: 'py', python: 'py', rb: 'rb', ruby: 'rb', php: 'php',
  java: 'java', kt: 'kt', kotlin: 'kt', scala: 'scala', groovy: 'groovy',
  c: 'c', h: 'h', cpp: 'cpp', cxx: 'cpp', cc: 'cpp', hpp: 'hpp', cs: 'cs',
  go: 'go', golang: 'go', rs: 'rs', rust: 'rs', swift: 'swift', dart: 'dart',
  lua: 'lua', pl: 'pl', perl: 'pl', r: 'r', m: 'm', mm: 'mm',
  sh: 'sh', shell: 'sh', bash: 'sh', zsh: 'sh', fish: 'fish',
  ps1: 'ps1', powershell: 'ps1', bat: 'bat', cmd: 'bat',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  vue: 'vue', svelte: 'svelte', astro: 'astro',
  dockerfile: 'dockerfile', makefile: 'makefile', cmake: 'cmake',
  diff: 'diff', patch: 'patch', gitignore: 'gitignore',
};

const LABEL_MAP = {
  html: 'HTML 页面', htm: 'HTML 页面', svg: 'SVG 图形', xml: 'XML 数据',
  css: 'CSS 样式', scss: 'SCSS 样式', less: 'LESS 样式',
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'React 组件',
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'React 组件',
  json: 'JSON 数据', yaml: 'YAML 配置', yml: 'YAML 配置', toml: 'TOML 配置',
  ini: 'INI 配置', conf: '配置文件', env: '环境变量',
  md: 'Markdown 文档', markdown: 'Markdown 文档',
  txt: '纯文本', text: '纯文本', plain: '纯文本', log: '日志',
  doc: 'Word 文档', docx: 'Word 文档', pdf: 'PDF 文档',
  csv: 'CSV 表格', tsv: 'TSV 表格', xls: 'Excel 表格', xlsx: 'Excel 表格',
  py: 'Python 代码', python: 'Python 代码', rb: 'Ruby 代码', ruby: 'Ruby 代码',
  php: 'PHP 代码', java: 'Java 代码', kt: 'Kotlin 代码', kotlin: 'Kotlin 代码',
  c: 'C 代码', h: 'C 头文件', cpp: 'C++ 代码', cxx: 'C++ 代码', hpp: 'C++ 头文件',
  cs: 'C# 代码', go: 'Go 代码', golang: 'Go 代码', rs: 'Rust 代码', rust: 'Rust 代码',
  swift: 'Swift 代码', dart: 'Dart 代码', lua: 'Lua 脚本', r: 'R 代码',
  sh: 'Shell 脚本', shell: 'Shell 脚本', bash: 'Shell 脚本', zsh: 'Shell 脚本',
  ps1: 'PowerShell', powershell: 'PowerShell', bat: '批处理', cmd: '批处理',
  sql: 'SQL 查询', graphql: 'GraphQL', gql: 'GraphQL',
  vue: 'Vue 组件', svelte: 'Svelte 组件', astro: 'Astro 组件',
  dockerfile: 'Dockerfile', makefile: 'Makefile',
  diff: 'Diff 补丁', patch: 'Diff 补丁',
};

const NAME_MAP = {
  html: '页面', htm: '页面', svg: '图形', xml: '数据',
  css: '样式', scss: '样式', less: '样式',
  js: '脚本', javascript: '脚本', mjs: '模块', cjs: '模块',
  jsx: '组件', ts: '脚本', typescript: '脚本', tsx: '组件',
  json: '数据', jsonc: '数据', json5: '数据',
  yaml: '配置', yml: '配置', toml: '配置', ini: '配置', conf: '配置', env: '环境变量',
  md: '文档', markdown: '文档', mdx: '文档',
  txt: '文本', text: '文本', plain: '文本', log: '日志',
  doc: '文档', docx: '文档', rtf: '文档', pdf: '文档',
  csv: '表格', tsv: '表格', xls: '表格', xlsx: '表格',
  py: '脚本', python: '脚本', rb: '脚本', ruby: '脚本', php: '脚本',
  java: '源码', kt: '源码', kotlin: '源码', scala: '源码',
  c: '源码', h: '头文件', cpp: '源码', cxx: '源码', hpp: '头文件', cs: '源码',
  go: '源码', golang: '源码', rs: '源码', rust: '源码', swift: '源码', dart: '源码',
  sh: '脚本', shell: '脚本', bash: '脚本', zsh: '脚本',
  ps1: '脚本', powershell: '脚本', bat: '脚本', cmd: '脚本',
  sql: '查询', graphql: '查询', gql: '查询',
  vue: '组件', svelte: '组件', astro: '组件',
  dockerfile: 'Dockerfile', makefile: 'Makefile',
  diff: '补丁', patch: '补丁',
};

function looksLikeHtml(code) {
  const t = (code || '').trim().slice(0, 240).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<svg');
}

function fileKind(lang, code) {
  const l = String(lang || '').toLowerCase().trim();
  if (!l) {
    const t = (code || '').trim();
    if (looksLikeHtml(t)) {
      const isSvg = t.slice(0, 200).toLowerCase().startsWith('<svg');
      return isSvg
        ? { ext: 'svg', preview: 'html', label: 'SVG 图形' }
        : { ext: 'html', preview: 'html', label: 'HTML 页面' };
    }
    return { ext: 'txt', preview: 'text', label: '纯文本' };
  }
  const ext = EXT_MAP[l] || l.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'txt';
  const preview = (l === 'html' || l === 'htm' || l === 'svg') ? 'html' : 'text';
  const label = LABEL_MAP[l] || (l.toUpperCase() + ' 文件');
  return { ext, preview, label };
}

function fileBaseName(lang, code) {
  const l = String(lang || '').toLowerCase().trim();
  if (!l && looksLikeHtml(code)) {
    const t = htmlTitle(code);
    if (t) return t;
  }
  return NAME_MAP[l] || (l ? l.toUpperCase() : '文件');
}

/* ---------- 内容解析 ---------- */
function isHtml(lang, code) {
  const l = String(lang || '').toLowerCase();
  if (l === 'html' || l === 'htm' || l === 'svg') return true;
  if (l) return false;
  return looksLikeHtml(code);
}
function htmlTitle(code) {
  const m = code.match(/<title[^>]*>([^<]{1,60})<\/title>/i);
  return m ? m[1].trim() : '';
}
function parseSegments(content) {
  const segs = [];
  const re = /```([\w+-]*)[ \t]*\n?([\s\S]*?)(```|$)/g;
  let last = 0, m;
  while ((m = re.exec(content))) {
    if (m.index > last) segs.push({ type: 'text', text: content.slice(last, m.index) });
    const lang = (m[1] || '').toLowerCase();
    const code = m[2] || '';
    const closed = m[3] === '```';
    segs.push({ type: 'code', lang, code, closed });
    last = re.lastIndex;
    if (!closed) break;
  }
  if (last < content.length) segs.push({ type: 'text', text: content.slice(last) });
  return segs;
}

/* ---------- Markdown 渲染 ---------- */
function inlineMd(s) {
  let h = s;
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  h = h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return h;
}
function mdToHtml(src) {
  const lines = esc(src).split('\n');
  const out = [];
  let para = [];
  let listType = null;
  let inQuote = false;

  const flushPara = () => { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } };
  const flushList = () => { if (listType) { out.push('</' + listType + '>'); listType = null; } };
  const flushQuote = () => { if (inQuote) { out.push('</blockquote>'); inQuote = false; } };
  const splitCells = l => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(x => x.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('-') &&
        /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
      flushPara(); flushList(); flushQuote();
      const head = splitCells(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitCells(lines[i].trim()));
        i++;
      }
      i--;
      out.push('<div class="md-table-wrap"><table><thead><tr>' +
        head.map(c => '<th>' + inlineMd(c) + '</th>').join('') +
        '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushPara(); flushList(); flushQuote(); out.push('<hr>'); continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(); flushList(); flushQuote();
      const lv = Math.min(h[1].length, 4);
      out.push('<h' + lv + '>' + inlineMd(h[2]) + '</h' + lv + '>');
      continue;
    }

    if (/^&gt;\s?/.test(line)) {
      flushPara(); flushList();
      if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
      out.push('<p>' + inlineMd(line.replace(/^&gt;\s?/, '')) + '</p>');
      continue;
    } else if (inQuote) { flushQuote(); }

    const ul = line.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      flushPara(); flushQuote();
      if (listType !== 'ul') { flushList(); out.push('<ul>'); listType = 'ul'; }
      out.push('<li>' + inlineMd(ul[1]) + '</li>');
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara(); flushQuote();
      if (listType !== 'ol') { flushList(); out.push('<ol>'); listType = 'ol'; }
      out.push('<li>' + inlineMd(ol[1]) + '</li>');
      continue;
    }
    if (listType) flushList();

    if (!line) { flushPara(); flushQuote(); continue; }
    para.push(inlineMd(line));
  }
  flushPara(); flushList(); flushQuote();
  return out.join('');
}

/* ---------- 消息渲染 ---------- */
const $msgs = $('#messages');
const $chat = $('#chat');

function scrollDown() {
  requestAnimationFrame(() => { $chat.scrollTop = $chat.scrollHeight; });
}
function nearBottom() {
  return $chat.scrollHeight - $chat.scrollTop - $chat.clientHeight < 48;
}

$chat.addEventListener('scroll', () => {
  if (lockScroll) return;
  autoScroll = nearBottom();
}, { passive: true });

$chat.addEventListener('wheel', e => {
  if (e.deltaY < 0) autoScroll = false;
}, { passive: true });

let swipeX = 0, swipeY = 0, swiping = false;

$chat.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  touchY = e.touches[0].clientY;
  swipeX = e.touches[0].clientX;
  swipeY = e.touches[0].clientY;
  swiping = false;
}, { passive: true });

$chat.addEventListener('touchmove', e => {
  if (e.touches.length !== 1) return;
  const y = e.touches[0].clientY;
  if (y > touchY + 3) autoScroll = false;
  touchY = y;

  const dx = e.touches[0].clientX - swipeX;
  const dy = e.touches[0].clientY - swipeY;
  if (!swiping && dx > 36 && Math.abs(dx) > Math.abs(dy) * 1.4 && swipeX < 70) {
    swiping = true;
    openDrawer();
  }
}, { passive: true });

function fmtTime(t) {
  if (!t) return '';
  const d = new Date(t);
  const p = n => String(n).padStart(2, '0');
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function num(n) { return Number(n || 0).toLocaleString('en-US'); }
function usageTotal(u) {
  if (!u) return 0;
  return u.total_tokens || ((u.prompt_tokens || 0) + (u.completion_tokens || 0));
}
function cumulativeUsage(idx) {
  let t = 0;
  for (let i = 0; i <= idx; i++) {
    const u = messages[i] && messages[i].usage;
    if (u) t += usageTotal(u);
  }
  return t;
}

function textEl(text) {
  const d = document.createElement('div');
  d.className = 'bubble';
  d.innerHTML = mdToHtml(text);
  return d;
}
/* 思维链：用户手动上滑后不再自动拉到底 */
function thinkEl(text, live, secs) {
  const w = document.createElement('div');
  w.className = 'think' + (live ? ' live open' : '');
  const label = live ? '正在思考' : ('思考过程' + (secs ? ' · ' + secs + 's' : ''));
  w.innerHTML = `<div class="think-head">${icon('bulb')}<span class="th-t">${label}</span><span class="chev">${icon('chev')}</span></div><div class="think-body"><div class="tb-in"></div></div>`;
  w.querySelector('.tb-in').textContent = text || '';
  w.querySelector('.think-head').onclick = () => w.classList.toggle('open');
  const body = w.querySelector('.think-body');
  body.addEventListener('scroll', () => {
    const near = body.scrollHeight - body.scrollTop - body.clientHeight < 28;
    if (near) delete w.dataset.stuck;
    else w.dataset.stuck = '1';
  }, { passive: true });
  body.addEventListener('wheel', e => {
    if (e.deltaY < 0) w.dataset.stuck = '1';
  }, { passive: true });
  body.addEventListener('touchmove', () => {
    const near = body.scrollHeight - body.scrollTop - body.clientHeight < 28;
    if (!near) w.dataset.stuck = '1';
  }, { passive: true });
  return w;
}
function codeEl(lang, code) {
  const w = document.createElement('div');
  w.className = 'code-block collapsed';
  w.innerHTML = `<div class="code-head"><span class="lang">${icon('code')}${esc(lang || 'code')}</span><button class="cp">${icon('copy')}复制</button></div><pre><code>${esc(code)}</code></pre>`;
  w.querySelector('.cp').onclick = e => { e.stopPropagation(); navigator.clipboard.writeText(code); toast('已复制'); };
  w.querySelector('.code-head').onclick = () => w.classList.toggle('collapsed');
  return w;
}
function genCardEl(lang, code) {
  const k = fileKind(lang, code);
  const d = document.createElement('div');
  d.className = 'file-card generating';
  d.innerHTML = `<div class="fc-icon">${icon(k.preview === 'html' ? 'globe' : 'code')}</div>
    <div class="fc-meta">
      <div class="fc-name">正在生成 ${esc(k.label)}…</div>
      <div class="fc-sub">完成后自动收进文件卡片</div>
    </div>
    <div class="spinner"></div>`;
  return d;
}
function fileEl(p) {
  const d = document.createElement('div');
  d.className = 'file-card';
  const ic = p.preview === 'html' ? 'globe' : 'code';
  d.innerHTML = `<div class="fc-icon">${icon(ic)}</div>
    <div class="fc-meta">
      <div class="fc-name">${esc(p.name)}</div>
      <div class="fc-sub">${esc(p.label || '文件')} · 点开${p.preview === 'html' ? '预览' : '查看'}</div>
    </div>
    <span class="fc-open">${icon('eye')}打开</span>`;
  d.onclick = () => openPreview(p.fileId);
  return d;
}
function toolRunEl(s) {
  const w = document.createElement('div');
  w.className = 'tool-run';
  const statusText = s.status === 'running' ? '调用中…' : (s.status === 'ok' ? '完成' : '失败');
  w.innerHTML = `<div class="tr-head">${icon('wrench')}<span class="tr-name">${esc(s.name)}</span><span class="tr-status ${s.status}">${statusText}</span><span class="chev">${icon('chev')}</span></div><div class="tr-body"></div>`;
  w.querySelector('.tr-body').textContent = s.result || (s.status === 'running' ? '正在执行…' : '(无返回)');
  w.querySelector('.tr-head').onclick = () => w.classList.toggle('open');
  return w;
}
function renderParts(w, msg) {
  w.innerHTML = '';
  if (msg.reasoning) w.appendChild(thinkEl(msg.reasoning, false, msg.thinkSecs));
  for (const p of msg.parts || []) {
    if (p.type === 'text') { if ((p.text || '').trim()) w.appendChild(textEl(p.text)); }
    else if (p.type === 'code') w.appendChild(codeEl(p.lang, p.code));
    else if (p.type === 'file') w.appendChild(fileEl(p));
    else if (p.type === 'tool') w.appendChild(toolRunEl(p));
  }
}
function renderMsg(msg, idx) {
  const w = document.createElement('div');
  w.className = 'msg ' + msg.role;
  w.dataset.idx = idx;

  if (msg.role === 'user') {
    const b = document.createElement('div');
    b.className = 'bubble';
    const atts = msg.attachments || [];
    if (atts.length) {
      const wrap = document.createElement('div');
      wrap.className = 'att-view';
      for (const a of atts) {
        if (a.kind === 'image') {
          const im = document.createElement('img');
          im.className = 'att-img';
          im.src = a.dataUrl;
          im.alt = a.name || '';
          im.onclick = () => {
            try { window.open(a.dataUrl, '_blank'); } catch (e) {}
          };
          wrap.appendChild(im);
        } else {
          const chip = document.createElement('div');
          chip.className = 'att-chip';
          chip.innerHTML = icon('file') + '<span>' + esc(a.name) + '</span>';
          chip.title = fmtSize(a.size) + ' · 点开查看';
          chip.onclick = () => openTextAtt(a.name, a.text);
          wrap.appendChild(chip);
        }
      }
      b.appendChild(wrap);
    }
    if (msg.content) {
      const t = document.createElement('div');
      t.className = 'att-text';
      t.textContent = msg.content;
      b.appendChild(t);
    }
    if (!msg.content && atts.length) b.classList.add('bare');
    w.appendChild(b);
  } else {
    const body = document.createElement('div');
    body.className = 'msg-body';
    if (msg.parts || msg.reasoning) renderParts(body, msg);
    else if (msg.content) body.appendChild(textEl(msg.content));
    w.appendChild(body);
  }

  const bits = [];
  if (msg.role === 'assistant' && msg.model) bits.push(`<span class="meta-model">${esc(msg.model)}</span>`);
  if (msg.time) bits.push(`<span class="meta-time">${fmtTime(msg.time)}</span>`);

  const own = usageTotal(msg.usage);
  if (own) {
    const cum = cumulativeUsage(idx);
    let txt = num(own) + ' tokens';
    if (cum > own) txt += ' · 累计 ' + num(cum);
    bits.push(`<span class="meta-usage">${txt}</span>`);
  }

  const actions = [`<button data-act="copy" title="复制">${icon('copy')}</button>`];
  if (msg.role === 'user') actions.push(`<button data-act="edit" title="编辑">${icon('edit')}</button>`);
  if (msg.role === 'assistant') actions.push(`<button data-act="regen" title="重新回复">${icon('refresh')}</button>`);
  actions.push(`<button data-act="del" title="删除">${icon('trash')}</button>`);

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = `<span class="meta-info">${bits.join('<span class="dot">·</span>')}</span>
    <span class="msg-actions">${actions.join('')}</span>`;
  w.appendChild(meta);

  return w;
}
function openTextAtt(name, text) {
  curFile = { name: name || '文本', code: text || '', preview: 'text' };
  $('#pv-name').textContent = curFile.name;
  const frame = $('#pv-frame');
  const codeBox = $('#pv-code');
  frame.classList.add('hidden');
  frame.removeAttribute('srcdoc');
  frame.style.height = '';
  if (codeBox) {
    codeBox.textContent = curFile.code;
    codeBox.classList.remove('hidden');
    codeBox.scrollTop = 0;
  }
  $('#preview').classList.remove('hidden');
}
function welcomeEl() {
  const p = sessionPersona();
  const d = document.createElement('div');
  d.className = 'welcome';
  const g = (p.greeting || '').trim();
  const html = g ? esc(g).replace(/\n/g, '<br>') : DEFAULT_GREETING;
  d.innerHTML = `<div class="w-icon">${esc(p.avatar)}</div>
    <h3>${esc(p.name)}</h3>
    <p>${html}</p>`;
  return d;
}
function renderMessages(newIdx) {
  $msgs.innerHTML = '';
  if (!messages.length) {
    $msgs.appendChild(welcomeEl());
    firstRender = false;
    return;
  }
  messages.forEach((m, i) => {
    const el = renderMsg(m, i);
    if (i === newIdx) el.classList.add('msg-new');
    else if (firstRender && i < 14) {
      el.classList.add('msg-in');
      el.style.animationDelay = (i * 26) + 'ms';
    }
    $msgs.appendChild(el);
  });
  firstRender = false;
  if (autoScroll) scrollDown();
}
function appendStreamText(body, text) {
  let has = false;
  for (const s of parseSegments(text)) {
    if (s.type === 'text') {
      if (s.text.trim()) { body.appendChild(textEl(s.text)); has = true; }
    } else {
      body.appendChild(genCardEl(s.lang, s.code));
      has = true;
    }
  }
  return has;
}

function renderStream(el, reasoning, segs, curText, live) {
  let body = el.querySelector('.msg-body');
  if (!body) {
    body = document.createElement('div');
    body.className = 'msg-body';
    el.insertBefore(body, el.firstChild);
  }
  const keepTop = autoScroll ? null : $chat.scrollTop;

  let think = body.querySelector(':scope > .think');
  if (reasoning) {
    if (!think) {
      think = thinkEl('', true);
      body.insertBefore(think, body.firstChild);
    }
    const tb = think.querySelector('.tb-in');
    if (tb.textContent !== reasoning) {
      tb.textContent = reasoning;
      const tbody = think.querySelector('.think-body');
      if (think.classList.contains('open') && !think.dataset.stuck) {
        tbody.scrollTop = tbody.scrollHeight;
      }
    }
  } else if (think) {
    think.remove();
    think = null;
  }

  let segWrap = body.querySelector(':scope > .stream-segs');
  if (!segWrap) {
    segWrap = document.createElement('div');
    segWrap.className = 'stream-segs';
    body.appendChild(segWrap);
  }
  const segKey = segs.map(s => s.type === 'text'
    ? ('t' + (s.text || '').length)
    : ('o' + s.name + '|' + s.status)
  ).join('~');
  if (segWrap.dataset.key !== segKey) {
    segWrap.innerHTML = '';
    for (const s of segs) {
      if (s.type === 'text') { if ((s.text || '').trim()) segWrap.appendChild(textEl(s.text)); }
      else if (s.type === 'tool') segWrap.appendChild(toolRunEl(s));
    }
    segWrap.dataset.key = segKey;
  }

  let cur = body.querySelector(':scope > .stream-cur');
  if (!cur) {
    cur = document.createElement('div');
    cur.className = 'stream-cur';
    body.appendChild(cur);
  }
  cur.innerHTML = '';
  let has = false;
  if (curText && curText.trim()) has = appendStreamText(cur, curText);
  if (live && !has) {
    const d = document.createElement('div');
    d.className = 'bubble typing';
    cur.appendChild(d);
  }

  if (autoScroll) {
    scrollDown();
  } else if (keepTop !== null) {
    lockScroll = true;
    $chat.scrollTop = keepTop;
    requestAnimationFrame(() => { lockScroll = false; });
  }
}
let streamRaf = 0, streamPending = null;
function scheduleStream(el, reasoning, segs, curText, live) {
  streamPending = { el, reasoning, segs, curText, live };
  if (streamRaf) return;
  streamRaf = requestAnimationFrame(() => {
    streamRaf = 0;
    const p = streamPending;
    streamPending = null;
    if (p) renderStream(p.el, p.reasoning, p.segs, p.curText, p.live);
  });
}

/* ---------- 抽屉（历史对话） ---------- */
function openDrawer() {
  renderConvList($('#conv-search').value);
  $('#drawer').classList.remove('hidden');
}
function closeDrawer() {
  $('#drawer').classList.add('hidden');
}
function renderConvList(kw) {
  const box = $('#conv-list');
  const q = (kw || '').trim().toLowerCase();
  const list = sessions
    .slice()
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .filter(s => {
      if (!q) return true;
      if ((s.title || '').toLowerCase().includes(q)) return true;
      return (s.messages || []).some(m => typeof m.content === 'string' && (m.content || '').toLowerCase().includes(q));
    });
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty" style="padding:24px 10px">没有匹配的对话</div>';
    return;
  }
  for (const s of list) {
    const d = document.createElement('div');
    d.className = 'conv-item' + (s.id === currentId ? ' on' : '');
    const n = (s.messages || []).length;
    const own = s.persona && s.persona.avatar ? s.persona.avatar : '';
    d.innerHTML = `<div class="ci-meta">
        <div class="ci-title">${own ? esc(own) + ' ' : ''}${esc(s.title || '新对话')}</div>
        <div class="ci-sub">${n} 条 · ${fmtTime(s.ts)}</div>
      </div>
      <button class="ci-edit" title="重命名">${icon('edit')}</button>
      <button class="ci-del" title="删除">${icon('trash')}</button>`;
    d.onclick = () => switchSession(s.id);
    d.querySelector('.ci-edit').onclick = e => {
      e.stopPropagation();
      const t = prompt('对话名称', s.title || '新对话');
      if (t === null) return;
      s.title = (t || '').trim().slice(0, 30) || '新对话';
      s.titled = true;
      LS.sessions = sessions;
      renderConvList($('#conv-search').value);
      renderBrand();
      toast('已重命名');
    };
    d.querySelector('.ci-del').onclick = e => {
      e.stopPropagation();
      if (!confirm('删除对话「' + (s.title || '新对话') + '」？')) return;
      deleteSession(s.id);
    };
    box.appendChild(d);
  }
}
function switchSession(id) {
  const s = sessions.find(x => x.id === id);
  if (!s || id === currentId) { closeDrawer(); return; }
  saveMessages();
  currentId = id;
  localStorage.setItem('aih.current', id);
  messages = s.messages || (s.messages = []);
  cancelEdit();
  pendingAtts = [];
  renderAttachBar();
  firstRender = true;
  autoScroll = true;
  renderBrand();
  renderMessages();
  closeDrawer();
  scrollDown();
}
function newSession() {
  saveMessages();
  const cur = sessionPersona();
  const s = { id: uid(), title: '新对话', messages: [], ts: Date.now() };
  s.persona = {
    avatar: cur.avatar, name: cur.name, bio: cur.bio, greeting: cur.greeting,
    allowTime: cur.allowTime, allowHistory: cur.allowHistory,
  };
  sessions.unshift(s);
  LS.sessions = sessions;
  currentId = s.id;
  localStorage.setItem('aih.current', currentId);
  messages = s.messages;
  cancelEdit();
  pendingAtts = [];
  renderAttachBar();
  firstRender = true;
  autoScroll = true;
  renderBrand();
  renderMessages();
  closeDrawer();
  if (curPage !== 'chat') switchPage('chat');
}
function deleteSession(id) {
  sessions = sessions.filter(s => s.id !== id);
  if (!sessions.length) {
    sessions = [{ id: uid(), title: '新对话', messages: [], ts: Date.now() }];
  }
  LS.sessions = sessions;
  if (currentId === id) {
    currentId = sessions[0].id;
    localStorage.setItem('aih.current', currentId);
    messages = sessions[0].messages || (sessions[0].messages = []);
    firstRender = true;
    renderBrand();
    renderMessages();
  }
  renderConvList($('#conv-search').value);
  toast('已删除');
}

/* ---------- 编辑 ---------- */
function startEdit(idx) {
  if (streaming) { toast('生成中，先停止再操作'); return; }
  const msg = messages[idx];
  if (!msg || msg.role !== 'user') return;
  editingIndex = idx;
  switchPage('chat');
  const input = $('#input');
  input.value = typeof msg.content === 'string' ? msg.content : '';
  autoGrow();
  const bar = $('#edit-bar');
  if (bar) bar.classList.remove('hidden');
  input.focus();
  try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
}
function cancelEdit() {
  editingIndex = null;
  const bar = $('#edit-bar');
  if (bar) bar.classList.add('hidden');
  const input = $('#input');
  input.value = '';
  autoGrow();
}

/* ---------- 页面切换 ---------- */
function switchPage(name) {
  curPage = name;
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.page === name));
  if (name === 'files') refreshFiles();
  if (name === 'lore') renderLore();
  if (name === 'settings') { renderProviders(); renderAppearance(); renderTools(); syncToolBtn(); }
  if (name === 'chat') { if (autoScroll) scrollDown(); }
}

/* ---------- 发送 & 流式接收 ---------- */
function setStreaming(on) {
  streaming = on;
  $('#btn-send').classList.toggle('hidden', on);
  $('#btn-stop').classList.toggle('hidden', !on);
}

async function runAssistant() {
  const p = activeProvider();
  if (!p) return;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') { toast('前面需要有一条用户消息'); return; }

  const aMsg = { role: 'assistant', content: '', time: Date.now(), model: p.model };
  messages.push(aMsg);
  const idx = messages.length - 1;
  const el = renderMsg(aMsg, idx);
  el.classList.add('msg-new');
  $msgs.appendChild(el);
  renderStream(el, '', [], '', true);
  autoScroll = true;
  scrollDown();

  setStreaming(true);
  abortCtrl = new AbortController();

  const segs = [];
  let accR = '';
  let usage = null;
  let tStart = 0, tEnd = 0;
  let errMsg = '', aborted = false;

  const url = p.base.replace(/\/+$/, '') + '/chat/completions';
  const sys = buildSystemPrompt();
  const extra = reasoningParams(p);
  const { tools, map } = buildToolsPayload();

  const hist = [];
  for (const m of messages.slice(0, -1)) {
    if (m.role === 'user') {
      const built = buildUserContent(m);
      const prev = hist[hist.length - 1];
      const canMerge = prev && prev.role === 'user'
        && typeof prev.content === 'string' && typeof built === 'string';
      if (canMerge) prev.content += '\n\n' + built;
      else hist.push({ role: 'user', content: built });
      continue;
    }
    const c = typeof m.content === 'string' ? m.content.trim() : '';
    if (!c) continue;
    if (c.startsWith('⚠️')) continue;
    const prev = hist[hist.length - 1];
    if (prev && prev.role === 'assistant' && typeof prev.content === 'string') prev.content += '\n\n' + c;
    else hist.push({ role: 'assistant', content: c });
  }
  const msgs = [{ role: 'system', content: sys }, ...hist];

  try {
    for (let round = 0; round < 6; round++) {
      let roundText = '';
      const toolCalls = [];

      const body = { model: p.model, stream: true, ...extra, messages: msgs };
      if (streamOptionsOK) body.stream_options = { include_usage: true };
      if (tools.length) body.tools = tools;

      const doFetch = () => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
        body: JSON.stringify(body),
        signal: abortCtrl.signal,
      });

      let res = await doFetch();
      if (!res.ok && res.status === 400 && body.stream_options) {
        streamOptionsOK = false;
        delete body.stream_options;
        res = await doFetch();
      }
      if (!res.ok) {
        const t = await res.text();
        const err = new Error('HTTP ' + res.status + '：' + t.slice(0, 300));
        err.status = res.status;
        throw err;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          let j;
          try { j = JSON.parse(data); } catch { continue; }
          if (j.usage) usage = j.usage;

          const d = j.choices?.[0]?.delta || {};

          let rc = '';
          if (typeof d.reasoning_content === 'string') rc = d.reasoning_content;
          else if (typeof d.reasoning === 'string') rc = d.reasoning;
          else if (typeof d.thinking === 'string') rc = d.thinking;
          if (Array.isArray(d.reasoning_details)) {
            rc += d.reasoning_details.map(x => (x && (x.text || x.content)) || '').join('');
          }
          if (rc) {
            if (!tStart) tStart = Date.now();
            tEnd = Date.now();
            accR += rc;
          }

          if (Array.isArray(d.tool_calls)) {
            for (const tc of d.tool_calls) {
              const ti = tc.index ?? 0;
              if (!toolCalls[ti]) toolCalls[ti] = { id: '', name: '', args: '' };
              if (tc.id) toolCalls[ti].id = tc.id;
              if (tc.function && tc.function.name) toolCalls[ti].name += tc.function.name;
              if (tc.function && tc.function.arguments) toolCalls[ti].args += tc.function.arguments;
            }
          }

          const dc = d.content ?? j.choices?.[0]?.text ?? '';
          if (dc) roundText += dc;
          if (rc || dc) scheduleStream(el, accR, segs, roundText, true);
        }
      }

      const calls = toolCalls.filter(t => t && t.name);

      if (!calls.length) {
        if (roundText.trim()) segs.push({ type: 'text', text: roundText });
        break;
      }

      msgs.push({
        role: 'assistant',
        content: roundText || null,
        tool_calls: calls.map(t => ({ id: t.id || ('call_' + uid()), type: 'function', function: { name: t.name, arguments: t.args || '{}' } })),
      });
      if (roundText.trim()) segs.push({ type: 'text', text: roundText });

      for (const t of calls) {
        const target = map[t.name];
        const serverName = target
          ? (target.builtin ? '内置' : ((LS.tools.find(s => s.id === target.serverId) || {}).name || ''))
          : '';
        const seg = { type: 'tool', name: t.name, server: serverName, status: 'running', result: '' };
        segs.push(seg);
        renderStream(el, accR, segs, '', false);
        if (autoScroll) scrollDown();

        let out = '';
        if (!target) {
          seg.status = 'error';
          out = '未知工具：' + t.name + '（可能已停用）';
        } else {
          try {
            let args = {};
            try { args = JSON.parse(t.args || '{}'); } catch (e) { args = {}; }
            if (target.builtin === 'history') {
              out = searchHistory(args.keyword || args.query || args.q);
            } else {
              const server = LS.tools.find(s => s.id === target.serverId);
              out = await mcpCallTool(server, target.toolName, args);
            }
            seg.status = 'ok';
          } catch (e) {
            seg.status = 'error';
            out = (e && (e.message || String(e))) || '调用失败';
          }
        }
        seg.result = out;
        renderStream(el, accR, segs, '', false);
        if (autoScroll) scrollDown();
        msgs.push({ role: 'tool', tool_call_id: t.id || ('call_' + uid()), content: out || '(空)' });
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') aborted = true;
    else errMsg = e.message || String(e);
  }

  if (streamRaf) { cancelAnimationFrame(streamRaf); streamRaf = 0; streamPending = null; }

  const secs = tStart && tEnd ? Math.max(1, Math.round((tEnd - tStart) / 1000)) : 0;
  setStreaming(false);
  abortCtrl = null;

  if (errMsg) {
    messages.pop();
    const errEl = document.createElement('div');
    errEl.className = 'msg assistant';
    const d = document.createElement('div');
    d.className = 'bubble error-bubble';
    d.textContent = '⚠️ 出错了：' + errMsg;
    errEl.appendChild(d);
    el.replaceWith(errEl);
    saveMessages();
    if (autoScroll) scrollDown();
    return;
  }

  const hasAny = segs.some(s => (s.type === 'text' && s.text.trim()) || s.type === 'tool') || accR.trim();
  if (aborted && !hasAny) {
    messages.pop();
    el.remove();
    saveMessages();
    toast('已停止生成');
    return;
  }

  aMsg.usage = usage || null;
  await finalize(aMsg, idx, segs, accR, secs);
  if (aborted) toast('已停止生成');
  saveMessages();
  if (autoScroll) scrollDown();
}

async function finalize(msg, idx, segs, reasoning, thinkSecs) {
  const parts = [];
  const usedNames = new Set();
  for (const s of segs) {
    if (s.type === 'tool') {
      parts.push({ type: 'tool', name: s.name, server: s.server, status: s.status, result: s.result });
      continue;
    }
    if (s.type !== 'text') continue;
    for (const seg of parseSegments(s.text)) {
      if (seg.type === 'text') {
        if (seg.text.trim()) parts.push({ type: 'text', text: seg.text });
        continue;
      }
      const k = fileKind(seg.lang, seg.code);
      let base = fileBaseName(seg.lang, seg.code) || '文件';
      base = base.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40) || '文件';
      let name = base + '.' + k.ext;
      let n = 2;
      while (usedNames.has(name)) {
        name = base + ' ' + n + '.' + k.ext;
        n++;
      }
      usedNames.add(name);
      const id = uid();
      await dbPut({ id, name, code: seg.code, ts: Date.now(), preview: k.preview, label: k.label });
      parts.push({ type: 'file', fileId: id, name, preview: k.preview, label: k.label });
    }
  }
  msg.parts = parts;
  msg.content = segs.filter(s => s.type === 'text').map(s => s.text).join('\n\n');
  if (reasoning) { msg.reasoning = reasoning; msg.thinkSecs = thinkSecs; }
  const old = $msgs.querySelector('.msg[data-idx="' + idx + '"]');
  if (old) old.replaceWith(renderMsg(msg, idx));
  else renderMessages();
}

async function send() {
  if (streaming) return;
  const text = $('#input').value.trim();
  const atts = pendingAtts.slice();
  if (!text && !atts.length) return;
  const p = activeProvider();
  if (!p) { toast('先去设置页添加 API'); switchPage('settings'); return; }

  $('#input').value = '';
  autoGrow();
  closeAttachMenu();

  if (editingIndex !== null) {
    const idx = editingIndex;
    editingIndex = null;
    const bar = $('#edit-bar');
    if (bar) bar.classList.add('hidden');
    messages[idx].content = text;
    messages[idx].time = Date.now();
    if (atts.length) messages[idx].attachments = atts;
    messages.splice(idx + 1);
    pendingAtts = [];
    renderAttachBar();
    saveMessages();
    autoScroll = true;
    renderMessages();
    scrollDown();
    await runAssistant();
    return;
  }

  messages.push({ role: 'user', content: text, attachments: atts, time: Date.now() });
  pendingAtts = [];
  renderAttachBar();
  saveMessages();
  autoScroll = true;
  renderMessages(messages.length - 1);
  scrollDown();
  await runAssistant();
}

/* ---------- 消息操作 ---------- */
$msgs.addEventListener('click', async e => {
  const btn = e.target.closest('.msg-actions button');
  if (!btn) return;
  const msgEl = btn.closest('.msg');
  if (!msgEl || msgEl.dataset.idx === undefined) return;
  const idx = Number(msgEl.dataset.idx);
  const msg = messages[idx];
  if (!msg) return;
  const act = btn.dataset.act;
  if (act === 'copy') {
    try {
      await navigator.clipboard.writeText(typeof msg.content === 'string' ? msg.content : '');
      toast('已复制');
    } catch { toast('复制失败，试试手动选中'); }
  } else if (act === 'edit') {
    startEdit(idx);
  } else if (act === 'del') {
    if (streaming) { toast('生成中，先停止再操作'); return; }
    if (!confirm('删除这条消息？')) return;
    if (editingIndex !== null && (idx === editingIndex || idx < editingIndex)) cancelEdit();
    messages.splice(idx, 1);
    saveMessages();
    renderMessages();
    toast('已删除');
  } else if (act === 'regen') {
    if (streaming) { toast('正在生成中…'); return; }
    if (idx !== messages.length - 1 && !confirm('重新回复会移除这条及之后的消息，继续？')) return;
    messages.splice(idx);
    saveMessages();
    renderMessages();
    await runAssistant();
  }
});

/* ---------- 停止 ---------- */
$('#btn-stop').onclick = () => {
  if (abortCtrl) abortCtrl.abort();
};

/* ---------- 全屏预览 / 查看（HTML 按内容高度自适应） ---------- */
async function openPreview(id) {
  const f = await dbGet(id);
  if (!f) { toast('文件不见了…'); return; }
  curFile = f;
  $('#pv-name').textContent = f.name;
  const asHtml = f.preview === 'html' || /\.(html?|svg)$/i.test(f.name);
  const frame = $('#pv-frame');
  const codeBox = $('#pv-code');
  if (asHtml) {
    frame.style.height = '340px';
    frame.onload = () => {
      try {
        const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        if (!doc) return;
        const de = doc.documentElement;
        const bd = doc.body;
        const h = Math.max(
          de ? de.scrollHeight : 0,
          de ? de.offsetHeight : 0,
          bd ? bd.scrollHeight : 0,
          bd ? bd.offsetHeight : 0,
          340
        );
        frame.style.height = h + 'px';
      } catch (e) {
        frame.style.height = '70vh';
      }
    };
    frame.srcdoc = f.code;
    frame.classList.remove('hidden');
    if (codeBox) codeBox.classList.add('hidden');
  } else {
    frame.classList.add('hidden');
    frame.removeAttribute('srcdoc');
    frame.style.height = '';
    if (codeBox) {
      codeBox.textContent = f.code || '';
      codeBox.classList.remove('hidden');
      codeBox.scrollTop = 0;
    }
  }
  $('#preview').classList.remove('hidden');
  $('#preview').scrollTop = 0;
}
$('#pv-back').onclick = () => $('#preview').classList.add('hidden');
$('#pv-copy').onclick = async () => {
  if (!curFile) return;
  try { await navigator.clipboard.writeText(curFile.code || ''); toast('内容已复制'); }
  catch { toast('复制失败，试试手动选中'); }
};
$('#pv-download').onclick = () => {
  if (!curFile) return;
  const name = curFile.name || 'file.txt';
  if (/^data:/i.test(curFile.code || '')) {
    const a = document.createElement('a');
    a.href = curFile.code;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  const low = name.toLowerCase();
  let mime = 'text/plain';
  if (low.endsWith('.html') || low.endsWith('.htm')) mime = 'text/html';
  else if (low.endsWith('.svg')) mime = 'image/svg+xml';
  else if (low.endsWith('.json')) mime = 'application/json';
  else if (low.endsWith('.css')) mime = 'text/css';
  else if (low.endsWith('.js')) mime = 'text/javascript';
  else if (low.endsWith('.md')) mime = 'text/markdown';
  else if (low.endsWith('.csv')) mime = 'text/csv';
  else if (low.endsWith('.xml')) mime = 'application/xml';
  const b = new Blob([curFile.code], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
};

/* ---------- 二级弹层 ---------- */
function openSheet(id) { $('#' + id).classList.remove('hidden'); }
function closeSheet(id) { $('#' + id).classList.add('hidden'); }
$$('[data-close]').forEach(b => { b.onclick = () => closeSheet(b.dataset.close); });
$$('#preview, #provider-edit, #tool-edit, #persona, #lore-edit').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
});

/* ---------- 工具管理 ---------- */
function syncToolBtn() {
  const has = LS.tools.some(s => s.enabled && (s.tools || []).length);
  const b = $('#btn-tools');
  if (b) b.classList.toggle('has-tools', has);
}
function renderTools() {
  const box = $('#tool-list');
  if (!box) return;
  const list = LS.tools;
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty" style="padding:14px">还没有 MCP 服务器</div>';
    return;
  }
  for (const s of list) {
    const d = document.createElement('div');
    d.className = 'tool-item';
    const count = (s.tools || []).length;
    d.innerHTML = `<div class="ti-icon">${icon('server')}</div>
      <div class="ti-meta">
        <div class="ti-name">${esc(s.name || '未命名')}</div>
        <div class="ti-sub">${count ? count + ' 个工具' : '未拉取工具'}${s.enabled ? '' : ' · 已停用'}</div>
      </div>
      <button class="ti-toggle${s.enabled ? ' on' : ''}" title="启用 / 停用"></button>
      <button class="ti-edit" title="编辑">${icon('edit')}</button>`;
    d.querySelector('.ti-toggle').onclick = e => {
      e.stopPropagation();
      const arr = LS.tools;
      const t = arr.find(x => x.id === s.id);
      if (t) { t.enabled = !t.enabled; LS.tools = arr; }
      renderTools();
      syncToolBtn();
    };
    d.querySelector('.ti-edit').onclick = e => { e.stopPropagation(); openToolEdit(s.id); };
    box.appendChild(d);
  }
}
function renderTeTools(tools) {
  const box = $('#te-tools');
  box.innerHTML = '';
  if (!tools.length) {
    box.innerHTML = '<span class="hint">还没有工具，点「测试并拉取」获取</span>';
    return;
  }
  for (const t of tools) {
    const c = document.createElement('span');
    c.className = 'tool-chip';
    c.textContent = t.name;
    c.title = t.description || '';
    box.appendChild(c);
  }
}
function renderHeaders() {
  const box = $('#te-headers-list');
  if (!box) return;
  box.innerHTML = '';
  if (!teHeaders.length) {
    box.innerHTML = '<span class="hint">还没有请求头，点下面添加</span>';
    return;
  }
  teHeaders.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'hdr-row';
    row.innerHTML = `<div class="hdr-fields">
        <label class="hdr-label">请求头名称</label>
        <input class="hdr-n" placeholder="如 Authorization" />
        <label class="hdr-label">请求头值</label>
        <input class="hdr-v" placeholder="如 Bearer xxx" />
      </div>
      <button class="hdr-del" title="删除">${icon('x')}</button>`;
    const nEl = row.querySelector('.hdr-n');
    const vEl = row.querySelector('.hdr-v');
    nEl.value = it.n || '';
    vEl.value = it.v || '';
    nEl.oninput = e => { it.n = e.target.value; };
    vEl.oninput = e => { it.v = e.target.value; };
    row.querySelector('.hdr-del').onclick = () => { teHeaders.splice(i, 1); renderHeaders(); };
    box.appendChild(row);
  });
}
function openToolEdit(id) {
  editingToolId = id || null;
  const s = id ? LS.tools.find(x => x.id === id) : null;
  $('#te-title').textContent = s ? '编辑 MCP 服务器' : '添加 MCP 服务器';
  $('#te-name').value = s ? (s.name || '') : '';
  $('#te-url').value = s ? (s.url || '') : '';
  $('#te-delete').hidden = !s;
  teToolsCache = s ? (s.tools || []) : [];
  teHeaders = normalizeHeaders(s ? s.headers : '');
  if (!teHeaders.length) teHeaders = [{ n: '', v: '' }];
  renderTeTools(teToolsCache);
  renderHeaders();
  openSheet('tool-edit');
}
async function testTool() {
  const url = $('#te-url').value.trim();
  if (!url) { toast('先填服务器地址'); return; }
  toast('正在连接…');
  try {
    const tools = await mcpListTools({ url, headers: teHeaders });
    teToolsCache = tools;
    renderTeTools(tools);
    toast(tools.length ? ('拉到 ' + tools.length + ' 个工具') : '连接成功，但没有工具');
  } catch (e) {
    toast('连接失败：' + (e && (e.message || e)), 3600);
  }
}
function saveTool() {
  const name = $('#te-name').value.trim() || '未命名服务器';
  const url = $('#te-url').value.trim();
  if (!url) { toast('服务器地址不能空'); return; }
  const headers = teHeaders
    .map(x => ({ n: (x.n || '').trim(), v: String(x.v == null ? '' : x.v) }))
    .filter(x => x.n);
  const arr = LS.tools;
  if (editingToolId) {
    const s = arr.find(x => x.id === editingToolId);
    if (s) Object.assign(s, { name, url, headers, tools: teToolsCache });
  } else {
    arr.push({ id: uid(), name, url, headers, tools: teToolsCache, enabled: true });
  }
  LS.tools = arr;
  closeSheet('tool-edit');
  renderTools();
  syncToolBtn();
  toast('已保存');
}
$('#btn-add-tool').onclick = () => openToolEdit(null);
$('#btn-add-header').onclick = () => { teHeaders.push({ n: '', v: '' }); renderHeaders(); };
$('#te-test').onclick = testTool;
$('#te-save').onclick = saveTool;
$('#te-delete').onclick = () => {
  if (!editingToolId) return;
  if (!confirm('删除这个 MCP 服务器？')) return;
  LS.tools = LS.tools.filter(s => s.id !== editingToolId);
  closeSheet('tool-edit');
  renderTools();
  syncToolBtn();
  toast('已删除');
};

/* ---------- 外观 ---------- */
function renderAppearance() {
  $$('#theme-mode button').forEach(b => b.classList.toggle('on', b.dataset.mode === LS.themeMode));
  const box = $('#theme-colors');
  box.innerHTML = '';
  Object.entries(THEME_COLORS).forEach(([key, colors]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (key === LS.themeColor ? ' on' : '');
    b.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    b.title = THEME_NAMES[key] || key;
    b.onclick = () => {
      LS.themeColor = key;
      applyTheme();
      renderAppearance();
      toast('已切换到「' + (THEME_NAMES[key] || key) + '」主题');
    };
    box.appendChild(b);
  });
}

/* ---------- 文件库 ---------- */
async function refreshFiles() {
  const list = await dbAll();
  const box = $('#file-list');
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty">还没有文件<br>在对话里让 AI 写点东西试试</div>';
    return;
  }
  for (const f of list) {
    const r = document.createElement('div');
    r.className = 'file-row';
    const isHtmlFile = f.preview === 'html' || /\.(html?|svg)$/i.test(f.name);
    r.innerHTML = `<div class="fr-icon">${icon(isHtmlFile ? 'globe' : 'code')}</div>
      <div class="fr-meta">
        <div class="fr-name">${esc(f.name)}</div>
        <div class="fr-sub">${esc(f.label || (isHtmlFile ? 'HTML 页面' : '文件'))} · ${fmtTime(f.ts)}</div>
      </div>
      <div class="fr-btns"><button class="op" title="打开">${icon('eye')}</button><button class="dl" title="下载">${icon('download')}</button><button class="rm" title="删除">${icon('trash')}</button></div>`;
    r.querySelector('.op').onclick = () => openPreview(f.id);
    r.querySelector('.dl').onclick = () => { curFile = f; $('#pv-download').click(); };
    r.querySelector('.rm').onclick = async () => {
      if (!confirm('删除「' + f.name + '」？')) return;
      await dbDel(f.id);
      refreshFiles();
    };
    box.appendChild(r);
  }
}

/* ---------- 供应商 ---------- */
const PRESETS = [
  { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'Kimi', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { name: 'Ollama 本地', base: 'http://localhost:11434/v1', model: 'llama3.1' },
];

const REASONING_LABEL = { default: '', off: '思考关', low: '思考低', medium: '思考中', high: '思考高' };

function renderProviders() {
  const box = $('#provider-list');
  const ps = LS.providers;
  box.innerHTML = '';
  if (!ps.length) {
    box.innerHTML = '<div class="empty" style="padding:10px">还没有供应商，点下面添加</div>';
    return;
  }
  for (const p of ps) {
    const d = document.createElement('div');
    d.className = 'provider-item' + (p.id === LS.activeId ? ' active' : '');
    const rTag = REASONING_LABEL[p.reasoning || 'default'] ? ' · ' + REASONING_LABEL[p.reasoning || 'default'] : '';
    d.innerHTML = `<span class="pi-dot"></span><div class="pi-meta"><div class="pi-name">${esc(p.name)}</div><div class="pi-model">${esc(p.model || '未选模型')}${rTag}</div></div><button class="edit" title="编辑">${icon('edit')}</button>`;
    d.onclick = () => { LS.activeId = p.id; renderProviders(); };
    d.querySelector('.edit').onclick = e => { e.stopPropagation(); openProviderEdit(p.id); };
    box.appendChild(d);
  }
}

let editingId = null;
function fillModels(list, sel) {
  const dl = $('#pe-models');
  dl.innerHTML = '';
  [...new Set(list)].forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    dl.appendChild(o);
  });
  if (sel) $('#pe-model').value = sel;
}
function renderPresets() {
  const box = $('#presets');
  box.innerHTML = '';
  PRESETS.forEach(pr => {
    const b = document.createElement('button');
    b.textContent = pr.name;
    b.onclick = () => {
      $('#pe-name').value = pr.name;
      $('#pe-base').value = pr.base;
      fillModels([pr.model], pr.model);
    };
    box.appendChild(b);
  });
}
function openProviderEdit(id) {
  editingId = id || null;
  const p = id ? LS.providers.find(x => x.id === id) : null;
  $('#pe-title').textContent = p ? '编辑供应商' : '添加供应商';
  $('#pe-name').value = p ? p.name : '';
  $('#pe-base').value = p ? p.base : '';
  $('#pe-key').value = p ? p.key : '';
  $('#pe-reasoning').value = p ? (p.reasoning || 'default') : 'default';
  $('#pe-delete').hidden = !p;
  fillModels(p && p.model ? [p.model] : [], p ? p.model : '');
  renderPresets();
  openSheet('provider-edit');
}
async function fetchModels() {
  const base = $('#pe-base').value.trim().replace(/\/+$/, '');
  const key = $('#pe-key').value.trim();
  if (!base) { toast('先填 Base URL'); return; }
  toast('正在拉取模型…');
  try {
    const res = await fetch(base + '/models', { headers: key ? { Authorization: 'Bearer ' + key } : {} });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const ids = (j.data || j.models || []).map(m => m.id || m.name || m.model).filter(Boolean).sort();
    if (!ids.length) throw new Error('返回里没有模型');
    fillModels(ids, $('#pe-model').value.trim() || ids[0]);
    toast('拉到 ' + ids.length + ' 个模型');
  } catch (e) {
    toast('拉取失败：' + e.message + '（也可以直接手输模型名）', 3400);
  }
}
function saveProvider() {
  const name = $('#pe-name').value.trim() || '未命名';
  const base = $('#pe-base').value.trim();
  const key = $('#pe-key').value.trim();
  const model = $('#pe-model').value.trim();
  const reasoning = $('#pe-reasoning').value || 'default';
  if (!base) { toast('Base URL 不能空'); return; }
  const ps = LS.providers;
  if (editingId) {
    const p = ps.find(x => x.id === editingId);
    if (p) Object.assign(p, { name, base, key, model, reasoning });
  } else {
    const p = { id: uid(), name, base, key, model, reasoning };
    ps.push(p);
    if (!LS.activeId) LS.activeId = p.id;
  }
  LS.providers = ps;
  closeSheet('provider-edit');
  renderProviders();
  toast('已保存');
}
$('#btn-add-provider').onclick = () => openProviderEdit(null);
$('#pe-save').onclick = saveProvider;
$('#btn-fetch-models').onclick = fetchModels;
$('#pe-delete').onclick = () => {
  if (!editingId) return;
  if (!confirm('删除这个供应商？')) return;
  LS.providers = LS.providers.filter(p => p.id !== editingId);
  if (LS.activeId === editingId) LS.activeId = (LS.providers[0] || {}).id || '';
  closeSheet('provider-edit');
  renderProviders();
};

/* ---------- 输入框 ---------- */
const input = $('#input');
function autoGrow() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
}
input.addEventListener('input', autoGrow);
input.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.isComposing) return;
  if (e.shiftKey) return;
  if (isTouch) return;
  e.preventDefault();
  send();
});
input.addEventListener('paste', e => {
  const cd = e.clipboardData;
  if (!cd) return;
  const files = cd.files && cd.files.length ? cd.files : null;
  if (files) {
    e.preventDefault();
    addFiles(files);
  }
});
$('#btn-send').onclick = send;
$('#edit-cancel').onclick = cancelEdit;

/* ---------- ＋ 菜单 / 附件 / 拖拽 / 全局粘贴 ---------- */
function closeAttachMenu() {
  const m = $('#attach-menu');
  if (m) m.classList.add('hidden');
}
(function bindAttach() {
  const btn = $('#btn-attach');
  const menu = $('#attach-menu');
  const pickFile = $('#pick-file');
  const pickImg = $('#pick-image');

  if (btn && menu) {
    btn.onclick = e => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    };
    document.addEventListener('click', e => {
      if (menu.classList.contains('hidden')) return;
      if (menu.contains(e.target) || e.target === btn) return;
      menu.classList.add('hidden');
    });
  }
  if (menu) {
    menu.querySelectorAll('button').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        menu.classList.add('hidden');
        const kind = b.dataset.kind;
        if (kind === 'image' && pickImg) pickImg.click();
        else if (pickFile) pickFile.click();
      };
    });
  }
  if (pickFile) {
    pickFile.onchange = () => {
      if (pickFile.files && pickFile.files.length) addFiles(pickFile.files);
      pickFile.value = '';
    };
  }
  if (pickImg) {
    pickImg.onchange = () => {
      if (pickImg.files && pickImg.files.length) addFiles(pickImg.files);
      pickImg.value = '';
    };
  }

  let depth = 0;
  document.addEventListener('dragenter', e => {
    if (!e.dataTransfer) return;
    const types = e.dataTransfer.types ? [...e.dataTransfer.types] : [];
    if (!types.includes('Files')) return;
    depth++;
    document.body.classList.add('dragging');
  });
  document.addEventListener('dragover', e => {
    if (e.dataTransfer && e.dataTransfer.types && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
  });
  document.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) document.body.classList.remove('dragging');
  });
  document.addEventListener('drop', e => {
    e.preventDefault();
    depth = 0;
    document.body.classList.remove('dragging');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  document.addEventListener('paste', e => {
    if (e.target === input) return;
    const cd = e.clipboardData;
    if (!cd || !cd.files || !cd.files.length) return;
    e.preventDefault();
    addFiles(cd.files);
  });
})();

/* ---------- 顶栏按钮 ---------- */
$('#btn-history').onclick = openDrawer;
$('#btn-persona').onclick = openPersona;
$('#conv-new').onclick = newSession;
$('#drawer-mask').onclick = closeDrawer;
$('#conv-search').oninput = e => renderConvList(e.target.value);
$('#pa-save').onclick = savePersona;
$('#pa-reset').onclick = resetPersona;

/* ---------- 人设里的能力开关 ---------- */
(function bindPersonaFlags() {
  const tBtn = $('#pa-time');
  const hBtn = $('#pa-history');
  if (tBtn) {
    tBtn.onclick = () => {
      const cur = !sessionPersona().allowTime;
      setPersonaFlag('allowTime', cur);
      tBtn.classList.toggle('on', cur);
      toast(cur ? '已允许获取日期时间' : '已关闭日期时间');
    };
  }
  if (hBtn) {
    hBtn.onclick = () => {
      const cur = !sessionPersona().allowHistory;
      setPersonaFlag('allowHistory', cur);
      hBtn.classList.toggle('on', cur);
      toast(cur ? '已允许搜索历史对话' : '已关闭历史搜索');
    };
  }
})();

/* ---------- 世界书按钮 ---------- */
$('#btn-add-lore').onclick = () => openLoreEdit(null);
$('#le-save').onclick = saveLore;
$('#le-delete').onclick = deleteLore;

/* ---------- 底部导航 ---------- */
$$('#tabbar button').forEach(b => {
  b.onclick = () => switchPage(b.dataset.page);
});

/* ---------- 清空当前对话 ---------- */
$('#btn-clear-chat').onclick = () => {
  if (!confirm('清空当前对话的消息？（其他对话不受影响）')) return;
  messages = [];
  const s = currentSession();
  if (s) { s.messages = messages; s.title = '新对话'; s.titled = false; LS.sessions = sessions; }
  cancelEdit();
  pendingAtts = [];
  renderAttachBar();
  renderMessages();
  renderBrand();
  toast('已清空');
};

/* ---------- Esc ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAttachMenu();
    if (!$('#drawer').classList.contains('hidden')) closeDrawer();
    else if (!$('#preview').classList.contains('hidden')) $('#preview').classList.add('hidden');
    else if (!$('#persona').classList.contains('hidden')) closeSheet('persona');
    else if (!$('#lore-edit').classList.contains('hidden')) closeSheet('lore-edit');
    else if (!$('#tool-edit').classList.contains('hidden')) closeSheet('tool-edit');
    else if (!$('#provider-edit').classList.contains('hidden')) closeSheet('provider-edit');
  }
});

/* ---------- 初始化 ---------- */
(function init() {
  applyTheme();
  renderBrand();
  renderAttachBar();

  const cleaned = messages.filter(m => !(m.role === 'assistant' && typeof m.content === 'string' && m.content.trim().startsWith('⚠️')));
  if (cleaned.length !== messages.length) {
    messages = cleaned;
    const s = currentSession();
    if (s) s.messages = messages;
    LS.sessions = sessions;
  }

  const sel = $('#pe-model');
  const inp = document.createElement('input');
  inp.id = 'pe-model';
  inp.setAttribute('list', 'pe-models');
  inp.placeholder = '模型名，如 deepseek-chat';
  const dl = document.createElement('datalist');
  dl.id = 'pe-models';
  sel.replaceWith(inp, dl);

  $$('#theme-mode button').forEach(b => {
    b.onclick = () => { LS.themeMode = b.dataset.mode; applyTheme(); renderAppearance(); };
  });

  syncToolBtn();
  renderTools();
  renderLore();
  renderMessages();
  switchPage('chat');
})();
