/* ============================================================
   AI HTML 工坊 · 核心逻辑
   纯前端 · 零依赖 · 数据全存本地
   ============================================================ */

/* ---------- 小工具 ---------- */
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(msg, ms = 1800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

/* ---------- IndexedDB：存 HTML 文件 ---------- */
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

/* ---------- 本地状态 ---------- */
const LS = {
  get providers() { try { return JSON.parse(localStorage.getItem('aih.providers') || '[]'); } catch { return []; } },
  set providers(v) { localStorage.setItem('aih.providers', JSON.stringify(v)); },
  get activeId() { return localStorage.getItem('aih.active') || ''; },
  set activeId(v) { localStorage.setItem('aih.active', v); },
  get sys() { return localStorage.getItem('aih.sys') || ''; },
  set sys(v) { localStorage.setItem('aih.sys', v); },
  get messages() { try { return JSON.parse(localStorage.getItem('aih.messages') || '[]'); } catch { return []; } },
  set messages(v) { localStorage.setItem('aih.messages', JSON.stringify(v)); },
};

let messages = LS.messages;
let streaming = false;
let curFile = null;

function activeProvider() {
  const ps = LS.providers;
  return ps.find(p => p.id === LS.activeId) || ps[0] || null;
}
function saveMessages() {
  try { LS.messages = messages; }
  catch { toast('历史记录太大存不下了，建议清空对话～', 3000); }
}

/* ---------- 消息渲染 ---------- */
const $msgs = $('#messages');

function scrollDown() {
  const c = $('#chat');
  requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
}
const addEl = el => $msgs.appendChild(el);

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
function codeEl(lang, code) {
  const w = document.createElement('div');
  w.className = 'code-block collapsed';
  w.innerHTML = `<div class="code-head"><span class="lang">${esc(lang || 'code')}</span><button class="cp">复制</button></div><pre><code>${esc(code)}</code></pre>`;
  w.querySelector('.cp').onclick = e => { e.stopPropagation(); navigator.clipboard.writeText(code); toast('已复制'); };
  w.querySelector('.code-head').onclick = () => w.classList.toggle('collapsed');
  return w;
}
function fileEl(p) {
  const d = document.createElement('div');
  d.className = 'file-card';
  d.innerHTML = `<div class="fc-icon">🌐</div><div class="fc-meta"><div class="fc-name">${esc(p.name)}</div><div class="fc-sub">HTML 页面 · 点开预览</div></div><span class="fc-open">打开 ↗</span>`;
  d.onclick = () => openPreview(p.fileId);
  return d;
}
function renderParts(w, msg) {
  w.innerHTML = '';
  for (const p of msg.parts || []) {
    if (p.type === 'text') { if ((p.text || '').trim()) w.appendChild(textEl(p.text)); }
    else if (p.type === 'code') w.appendChild(codeEl(p.lang, p.code));
    else if (p.type === 'file') w.appendChild(fileEl(p));
  }
}
function renderMsg(msg) {
  const w = document.createElement('div');
  w.className = 'msg ' + msg.role;
  if (msg.parts) renderParts(w, msg);
  else if (msg.content) w.appendChild(textEl(msg.content));
  return w;
}
function updateStreaming(el, text) {
  el.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'bubble';
  d.textContent = text;
  el.appendChild(d);
}

/* ---------- 代码块解析：HTML → 文件 ---------- */
function isHtml(lang, code) {
  if (lang === 'html' || lang === 'svg') return true;
  const t = code.trim().slice(0, 200).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<svg');
}
function htmlTitle(code) {
  const m = code.match(/<title[^>]*>([^<]{1,60})<\/title>/i);
  return m ? m[1].trim() : '';
}
function parseParts(content) {
  const parts = [];
  const re = /```([\w-]*)[ \t]*\n([\s\S]*?)(?:\n```|```|$)/g;
  let last = 0, m;
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push({ type: 'text', text: content.slice(last, m.index) });
    const lang = (m[1] || '').toLowerCase();
    const code = m[2];
    if (isHtml(lang, code)) parts.push({ type: 'html', code });
    else parts.push({ type: 'code', lang, code });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', text: content.slice(last) });
  if (!parts.length) parts.push({ type: 'text', text: content });
  return parts;
}
async function finalize(msg, el) {
  const parts = parseParts(msg.content);
  for (const p of parts) {
    if (p.type === 'html') {
      let name = htmlTitle(p.code) || '页面';
      if (!/\.html?$/i.test(name)) name += '.html';
      const id = uid();
      await dbPut({ id, name, code: p.code, ts: Date.now() });
      p.type = 'file'; p.fileId = id; p.name = name; delete p.code;
    }
  }
  msg.parts = parts;
  renderParts(el, msg);
}

/* ---------- 发送 & 流式接收 ---------- */
async function send() {
  if (streaming) return;
  const text = $('#input').value.trim();
  if (!text) return;
  const p = activeProvider();
  if (!p) { toast('先去 ⚙️ 设置里添加 API'); openSheet('settings'); return; }

  $('#input').value = '';
  autoGrow();

  const uMsg = { role: 'user', content: text };
  messages.push(uMsg);
  addEl(renderMsg(uMsg));
  saveMessages();
  scrollDown();

  const aMsg = { role: 'assistant', content: '' };
  messages.push(aMsg);
  const el = renderMsg(aMsg);
  el.classList.add('typing');
  addEl(el);
  scrollDown();

  streaming = true;
  $('#btn-send').disabled = true;

  let acc = '';
  try {
    const url = p.base.replace(/\/+$/, '') + '/chat/completions';
    const hist = messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
    const body = {
      model: p.model,
      stream: true,
      messages: LS.sys ? [{ role: 'system', content: LS.sys }, ...hist] : hist,
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error('HTTP ' + res.status + '：' + t.slice(0, 300));
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
        const delta = j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.text ?? '';
        if (delta) { acc += delta; updateStreaming(el, acc); scrollDown(); }
      }
    }
  } catch (e) {
    acc += (acc ? '\n\n' : '') + '⚠️ 出错了：' + e.message;
  }

  aMsg.content = acc;
  el.classList.remove('typing');
  streaming = false;
  $('#btn-send').disabled = false;

  await finalize(aMsg, el);
  saveMessages();
  scrollDown();
}

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
  try { await navigator.clipboard.writeText(curFile.code); toast('代码已复制 📋'); }
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
  if (id === 'settings') renderProviders();
  if (id === 'files') refreshFiles();
}
function closeSheet(id) { $('#' + id).classList.add('hidden'); }
document.querySelectorAll('[data-close]').forEach(b => { b.onclick = () => closeSheet(b.dataset.close); });
document.querySelectorAll('#settings, #files, #provider-edit').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
});
$('#btn-settings').onclick = () => openSheet('settings');
$('#btn-files').onclick = () => openSheet('files');

/* ---------- 文件库 ---------- */
async function refreshFiles() {
  const list = await dbAll();
  const box = $('#file-list');
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty">还没有文件～<br>在对话里让 AI 写个网页试试</div>';
    return;
  }
  for (const f of list) {
    const r = document.createElement('div');
    r.className = 'file-row';
    r.innerHTML = `<div style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--bg3);font-size:17px;flex:0 0 auto">🌐</div>
      <div class="fr-meta"><div class="fr-name">${esc(f.name)}</div><div class="fr-sub">${new Date(f.ts).toLocaleString('zh-CN')}</div></div>
      <div class="fr-btns"><button class="op" title="预览">👁️</button><button class="dl" title="下载">⬇️</button><button class="rm" title="删除">🗑️</button></div>`;
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

function renderProviders() {
  const box = $('#provider-list');
  const ps = LS.providers;
  box.innerHTML = '';
  if (!ps.length) {
    box.innerHTML = '<div class="empty" style="padding:10px">还没有供应商，点下面添加～</div>';
    return;
  }
  for (const p of ps) {
    const d = document.createElement('div');
    d.className = 'provider-item' + (p.id === LS.activeId ? ' active' : '');
    d.innerHTML = `<span class="pi-dot"></span><div class="pi-meta"><div class="pi-name">${esc(p.name)}</div><div class="pi-model">${esc(p.model || '未选模型')}</div></div><button class="edit" title="编辑">✎</button>`;
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
    toast('拉到 ' + ids.length + ' 个模型 🎉');
  } catch (e) {
    toast('拉取失败：' + e.message + '（也可以直接手输模型名）', 3400);
  }
}
function saveProvider() {
  const name = $('#pe-name').value.trim() || '未命名';
  const base = $('#pe-base').value.trim();
  const key = $('#pe-key').value.trim();
  const model = $('#pe-model').value.trim();
  if (!base) { toast('Base URL 不能空'); return; }
  const ps = LS.providers;
  if (editingId) {
    const p = ps.find(x => x.id === editingId);
    if (p) Object.assign(p, { name, base, key, model });
  } else {
    const p = { id: uid(), name, base, key, model };
    ps.push(p);
    if (!LS.activeId) LS.activeId = p.id;
  }
  LS.providers = ps;
  closeSheet('provider-edit');
  renderProviders();
  toast('已保存 ✅');
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

/* ---------- 系统提示词 / 清空 ---------- */
$('#sys-prompt').value = LS.sys;
$('#sys-prompt').oninput = () => { LS.sys = $('#sys-prompt').value; };
$('#btn-clear-chat').onclick = () => {
  if (!confirm('清空当前对话？（文件库不受影响）')) return;
  messages = [];
  saveMessages();
  $msgs.innerHTML = '';
  toast('已清空');
};

/* ---------- Esc 关预览 ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#preview').classList.contains('hidden')) {
    $('#preview').classList.add('hidden');
  }
});

/* ---------- 初始化 ---------- */
(function init() {
  // 模型选择：把 select 换成「可拉取 + 可手输」的 input + datalist
  const sel = $('#pe-model');
  const inp = document.createElement('input');
  inp.id = 'pe-model';
  inp.setAttribute('list', 'pe-models');
  inp.placeholder = '模型名，如 deepseek-chat';
  const dl = document.createElement('datalist');
  dl.id = 'pe-models';
  sel.replaceWith(inp, dl);

  // 渲染历史
  for (const m of messages) addEl(renderMsg(m));
  scrollDown();

  // 首次欢迎
  if (!messages.length) {
    addEl(renderMsg({
      role: 'assistant',
      content: '嗨～我是 AI HTML 工坊 🎨\n\n先去右上角 ⚙️ 设置里添加你的 API（DeepSeek / OpenAI / Kimi 等都可以，填 Key 后能一键拉取模型列表）。\n\n然后直接说「帮我写个 xxx 网页」——我吐出来的 HTML 会自动变成文件卡片，点开就能全屏预览，右上角有 复制 / 下载 / 返回 📋⬇️✕',
    }));
  }
})();
