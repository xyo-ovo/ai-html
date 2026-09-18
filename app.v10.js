/* ============================================================
   AI HTML 工坊 · 核心逻辑 v10
   滚动完全放手 · 消息操作 · 暂停生成 · 流式卡片化 · MCP 工具
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;

const DEFAULT_SYS = '你是前端工程师。用户要网页时，直接输出完整可运行的单文件 HTML，用 html 代码块包裹，不要省略任何部分。';

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
  get sys() { return localStorage.getItem('aih.sys') || ''; },
  set sys(v) { localStorage.setItem('aih.sys', v); },
  get themeMode() { return localStorage.getItem('aih.themeMode') || localStorage.getItem('aih.theme') || 'light'; },
  set themeMode(v) { localStorage.setItem('aih.themeMode', v); },
  get themeColor() { return localStorage.getItem('aih.themeColor') || 'coral'; },
  set themeColor(v) { localStorage.setItem('aih.themeColor', v); },
  get tools() { try { return JSON.parse(localStorage.getItem('aih.tools') || '[]'); } catch { return []; } },
  set tools(v) { localStorage.setItem('aih.tools', JSON.stringify(v)); },
  get messages() { try { return JSON.parse(localStorage.getItem('aih.messages') || '[]'); } catch { return []; } },
  set messages(v) { localStorage.setItem('aih.messages', JSON.stringify(v)); },
};

let messages = LS.messages;
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

/* ---------- 主题 ---------- */
const THEME_COLORS = {
  coral:  ['#c96442', '#e08b6d'],
  blue:   ['#3b6db8', '#6b9bd8'],
  green:  ['#3f7d5c', '#5fa87c'],
  violet: ['#6d5ab8', '#9b8ad8'],
  rose:   ['#b85c7a', '#d88ba5'],
};

function prefersDark() {
  try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
}
function isDarkActive() {
  const m = LS.themeMode;
  return m === 'dark' || (m === 'auto' && prefersDark());
}
function applyTheme() {
  const dark = isDarkActive();
  document.documentElement.classList.toggle('dark', dark);
  const c = THEME_COLORS[LS.themeColor] || THEME_COLORS.coral;
  document.documentElement.style.setProperty('--acc', dark ? c[1] : c[0]);
  const btn = $('#btn-theme');
  if (btn) btn.innerHTML = icon(dark ? 'i-sun' : 'i-moon');
}
try {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (LS.themeMode === 'auto') applyTheme();
  });
} catch (e) {}

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
  try { LS.messages = messages; }
  catch { toast('历史记录太大存不下了，建议清空对话～', 3000); }
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
      clientInfo: { name: 'ai-html-workshop', version: '10.0' },
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

/* ---------- 内容解析 ---------- */
function isHtml(lang, code) {
  if (lang === 'html' || lang === 'svg') return true;
  const t = (code || '').trim().slice(0, 200).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<svg');
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

/* ---------- 消息渲染 ---------- */
const $msgs = $('#messages');
const $chat = $('#chat');

function scrollDown() {
  requestAnimationFrame(() => { $chat.scrollTop = $chat.scrollHeight; });
}
function nearBottom() {
  return $chat.scrollHeight - $chat.scrollTop - $chat.clientHeight < 48;
}

/* 滚动：用户一动就放手 */
$chat.addEventListener('scroll', () => {
  if (lockScroll) return;
  autoScroll = nearBottom();
}, { passive: true });

$chat.addEventListener('wheel', e => {
  if (e.deltaY < 0) autoScroll = false;
}, { passive: true });

$chat.addEventListener('touchstart', e => {
  touchY = e.touches[0].clientY;
}, { passive: true });

$chat.addEventListener('touchmove', e => {
  const y = e.touches[0].clientY;
  if (y > touchY + 3) autoScroll = false;
  touchY = y;
}, { passive: true });

function fmtTime(t) {
  if (!t) return '';
  const d = new Date(t), now = new Date();
  const p = n => String(n).padStart(2, '0');
  const hm = p(d.getHours()) + ':' + p(d.getMinutes());
  if (d.toDateString() === now.toDateString()) return hm;
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
}

function mdToHtml(s) {
  let h = esc(s);
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\n{2,}/g, '</p><p>');
  h = h.replace(/\n/g, '<br>');
  return '<p>' + h + '</p>';
}
function textEl(text) {
  const d = document.createElement('div');
  d.className = 'bubble';
  d.innerHTML = mdToHtml(text);
  return d;
}
function thinkEl(text, live, secs) {
  const w = document.createElement('div');
  w.className = 'think' + (live ? ' live open' : '');
  const label = live ? '正在思考' : ('思考过程' + (secs ? ' · ' + secs + 's' : ''));
  w.innerHTML = `<div class="think-head">${icon('bulb')}<span class="th-t">${label}</span><span class="chev">${icon('chev')}</span></div><div class="think-body"><div class="tb-in"></div></div>`;
  w.querySelector('.tb-in').textContent = text || '';
  w.querySelector('.think-head').onclick = () => w.classList.toggle('open');
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
function genCardEl() {
  const d = document.createElement('div');
  d.className = 'file-card generating';
  d.innerHTML = `<div class="fc-icon">${icon('code')}</div><div class="fc-meta"><div class="fc-name">正在生成 HTML 文件…</div><div class="fc-sub">完成后自动收进文件卡片</div></div><div class="spinner"></div>`;
  return d;
}
function fileEl(p) {
  const d = document.createElement('div');
  d.className = 'file-card';
  d.innerHTML = `<div class="fc-icon">${icon('globe')}</div><div class="fc-meta"><div class="fc-name">${esc(p.name)}</div><div class="fc-sub">HTML 页面 · 点开预览</div></div><span class="fc-open">${icon('eye')}打开</span>`;
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
    b.textContent = msg.content || '';
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
  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = `<span class="meta-info">${bits.join('<span class="dot">·</span>')}</span>
    <span class="msg-actions">
      <button data-act="copy" title="复制">${icon('copy')}</button>
      ${msg.role === 'assistant' ? `<button data-act="regen" title="重新生成">${icon('refresh')}</button>` : ''}
      <button data-act="del" title="删除">${icon('trash')}</button>
    </span>`;
  w.appendChild(meta);

  return w;
}
function welcomeEl() {
  const d = document.createElement('div');
  d.className = 'welcome';
  d.innerHTML = `<div class="w-icon">${icon('palette')}</div>
    <h3>AI HTML 工坊</h3>
    <p>先去右上角设置里添加 API（DeepSeek / OpenAI / Kimi / 智谱等都可以），然后直接说「帮我写个 xxx 网页」。<br>生成的 HTML 会直接变成文件卡片，点开全屏预览。</p>`;
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
    } else if (isHtml(s.lang, s.code)) {
      body.appendChild(genCardEl());
      has = true;
    } else {
      body.appendChild(codeEl(s.lang, s.code));
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
  body.innerHTML = '';

  if (reasoning) body.appendChild(thinkEl(reasoning, true));

  for (const s of segs) {
    if (s.type === 'text') { if ((s.text || '').trim()) body.appendChild(textEl(s.text)); }
    else if (s.type === 'tool') body.appendChild(toolRunEl(s));
  }

  let has = false;
  if (curText && curText.trim()) has = appendStreamText(body, curText);
  if (live && !has) {
    const d = document.createElement('div');
    d.className = 'bubble typing';
    body.appendChild(d);
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
  let tStart = 0, tEnd = 0;
  let errMsg = '', aborted = false;

  const url = p.base.replace(/\/+$/, '') + '/chat/completions';
  const sys = (LS.sys || '').trim() || DEFAULT_SYS;
  const extra = reasoningParams(p);
  const { tools, map } = buildToolsPayload();

  const hist = [];
  for (const m of messages.slice(0, -1)) {
    const c = (m.content || '').trim();
    if (!c) continue;
    if (m.role === 'assistant' && c.startsWith('⚠️')) continue;
    const prev = hist[hist.length - 1];
    if (prev && prev.role === m.role) prev.content += '\n\n' + c;
    else hist.push({ role: m.role, content: c });
  }
  const msgs = [{ role: 'system', content: sys }, ...hist];

  try {
    for (let round = 0; round < 6; round++) {
      let roundText = '';
      const toolCalls = [];

      const body = { model: p.model, stream: true, ...extra, messages: msgs };
      if (tools.length) body.tools = tools;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
        body: JSON.stringify(body),
        signal: abortCtrl.signal,
      });
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
        const serverName = target ? ((LS.tools.find(s => s.id === target.serverId) || {}).name || '') : '';
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
            const server = LS.tools.find(s => s.id === target.serverId);
            let args = {};
            try { args = JSON.parse(t.args || '{}'); } catch (e) { args = {}; }
            out = await mcpCallTool(server, target.toolName, args);
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

  await finalize(aMsg, idx, segs, accR, secs);
  if (aborted) toast('已停止生成');
  saveMessages();
  if (autoScroll) scrollDown();
}

async function finalize(msg, idx, segs, reasoning, thinkSecs) {
  const parts = [];
  for (const s of segs) {
    if (s.type === 'tool') {
      parts.push({ type: 'tool', name: s.name, server: s.server, status: s.status, result: s.result });
      continue;
    }
    if (s.type !== 'text') continue;
    for (const seg of parseSegments(s.text)) {
      if (seg.type === 'text') {
        if (seg.text.trim()) parts.push({ type: 'text', text: seg.text });
      } else if (isHtml(seg.lang, seg.code)) {
        let name = htmlTitle(seg.code) || '页面';
        if (!/\.html?$/i.test(name)) name += '.html';
        const id = uid();
        await dbPut({ id, name, code: seg.code, ts: Date.now() });
        parts.push({ type: 'file', fileId: id, name });
      } else {
        parts.push({ type: 'code', lang: seg.lang, code: seg.code });
      }
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
  if (!text) return;
  const p = activeProvider();
  if (!p) { toast('先去设置里添加 API'); openSheet('settings'); return; }
  $('#input').value = '';
  autoGrow();
  messages.push({ role: 'user', content: text, time: Date.now() });
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
    try { await navigator.clipboard.writeText(msg.content || ''); toast('已复制'); }
    catch { toast('复制失败，试试手动选中'); }
  } else if (act === 'del') {
    if (streaming) { toast('生成中，先停止再操作'); return; }
    if (!confirm('删除这条消息？')) return;
    messages.splice(idx, 1);
    saveMessages();
    renderMessages();
    toast('已删除');
  } else if (act === 'regen') {
    if (streaming) { toast('正在生成中…'); return; }
    if (idx !== messages.length - 1 && !confirm('重新生成会移除这条及之后的消息，继续？')) return;
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

/* ---------- 全屏预览 ---------- */
async function openPreview(id) {
  const f = await dbGet(id);
  if (!f) { toast('文件不见了…'); return; }
  curFile = f;
  $('#pv-name').textContent = f.name;
  $('#pv-frame').srcdoc = f.code;
  $('#preview').classList.remove('hidden');
}
$('#pv-back').onclick = () => $('#preview').classList.add('hidden');
$('#pv-copy').onclick = async () => {
  if (!curFile) return;
  try { await navigator.clipboard.writeText(curFile.code); toast('代码已复制'); }
  catch { toast('复制失败，试试手动选中'); }
};
$('#pv-download').onclick = () => {
  if (!curFile) return;
  const b = new Blob([curFile.code], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = curFile.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
};

/* ---------- 弹层 ---------- */
function openSheet(id) {
  $('#' + id).classList.remove('hidden');
  if (id === 'settings') { renderProviders(); renderAppearance(); }
  if (id === 'files') refreshFiles();
  if (id === 'tools') { renderTools(); syncToolBtn(); }
}
function closeSheet(id) { $('#' + id).classList.add('hidden'); }
$$('[data-close]').forEach(b => { b.onclick = () => closeSheet(b.dataset.close); });
$$('#settings, #files, #provider-edit, #tools, #tool-edit').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
});
$('#btn-settings').onclick = () => openSheet('settings');
$('#btn-files').onclick = () => openSheet('files');
$('#btn-tools').onclick = () => openSheet('tools');

/* ---------- 工具管理 ---------- */
function syncToolBtn() {
  const has = LS.tools.some(s => s.enabled && (s.tools || []).length);
  const b = $('#btn-tools');
  if (b) b.classList.toggle('has-tools', has);
}
function renderTools() {
  const box = $('#tool-list');
  const list = LS.tools;
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty" style="padding:16px">还没有 MCP 服务器</div>';
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
    b.title = key;
    b.onclick = () => { LS.themeColor = key; applyTheme(); renderAppearance(); };
    box.appendChild(b);
  });
}

/* ---------- 文件库 ---------- */
async function refreshFiles() {
  const list = await dbAll();
  const box = $('#file-list');
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty">还没有文件<br>在对话里让 AI 写个网页试试</div>';
    return;
  }
  for (const f of list) {
    const r = document.createElement('div');
    r.className = 'file-row';
    r.innerHTML = `<div class="fr-icon">${icon('globe')}</div>
      <div class="fr-meta"><div class="fr-name">${esc(f.name)}</div><div class="fr-sub">${new Date(f.ts).toLocaleString('zh-CN')}</div></div>
      <div class="fr-btns"><button class="op" title="预览">${icon('eye')}</button><button class="dl" title="下载">${icon('download')}</button><button class="rm" title="删除">${icon('trash')}</button></div>`;
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
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
});
$('#btn-send').onclick = send;

/* ---------- 顶部主题按钮 ---------- */
$('#btn-theme').onclick = () => {
  LS.themeMode = isDarkActive() ? 'light' : 'dark';
  applyTheme();
  renderAppearance();
};

/* ---------- 系统提示词 / 清空 ---------- */
$('#sys-prompt').value = LS.sys;
$('#sys-prompt').oninput = () => { LS.sys = $('#sys-prompt').value; };
$('#btn-clear-chat').onclick = () => {
  if (!confirm('清空当前对话？（文件库不受影响）')) return;
  messages = [];
  saveMessages();
  renderMessages();
  toast('已清空');
};

/* ---------- Esc ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#preview').classList.contains('hidden')) $('#preview').classList.add('hidden');
    else if (!$('#tool-edit').classList.contains('hidden')) closeSheet('tool-edit');
    else if (!$('#tools').classList.contains('hidden')) closeSheet('tools');
  }
});

/* ---------- 初始化 ---------- */
(function init() {
  applyTheme();

  const cleaned = messages.filter(m => !(m.role === 'assistant' && typeof m.content === 'string' && m.content.trim().startsWith('⚠️')));
  if (cleaned.length !== messages.length) { messages = cleaned; saveMessages(); }

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
  renderMessages();
})();
