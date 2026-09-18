/* ============================================================
   patch4.js —— 机语工坊 增强包
   1) 公式渲染（KaTeX，$...$ 和 $$...$$）
   2) 图表渲染（Mermaid，```mermaid 代码块变成图）
   3) 引用回复（消息操作区多一个 💬，引用块自动拼进发送内容）
   4) 气泡自定义（宽度 / 圆角，设置页可调）
   5) 上下文进度条（顶栏底部一根细线，估算 token 占用）
   6) AI 自动起标题（第一条对话完成后调一次模型起名）

   本文件由 patch3.js 动态加载，加载时机在 app.v29.js 之后。
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     0. 样式注入
     ============================================================ */
  (function injectCss() {
    if (document.getElementById('p4-css')) return;
    var s = document.createElement('style');
    s.id = 'p4-css';
    s.textContent = [
      /* ---- 公式 ---- */
      '.katex{font-size:1.04em}',
      '.katex-display{margin:12px 0;overflow-x:auto;overflow-y:hidden;padding:3px 0}',

      /* ---- Mermaid ---- */
      '.mermaid-wrap{margin:12px 0;padding:14px;background:var(--bg2);border:1px solid var(--line2);border-radius:16px;overflow-x:auto}',
      '.mermaid-wrap svg{max-width:100%;height:auto;display:block;margin:0 auto}',
      '.mermaid-loading,.mermaid-err{font-size:12.5px;color:var(--fg3);text-align:center;padding:10px}',
      '.mermaid-err{color:#C05555}',
      '.mermaid-bar{display:flex;gap:6px;justify-content:flex-end;margin-top:10px}',
      '.mermaid-bar button{font-size:11.5px;padding:4px 11px;border-radius:9px;border:1px solid var(--line2);background:var(--bg2);color:var(--fg2);cursor:pointer;transition:border-color .15s ease,color .15s ease}',
      '.mermaid-bar button:hover{border-color:var(--acc);color:var(--acc)}',

      /* ---- 引用块（消息里显示） ---- */
      '.quote-box{border-left:3px solid var(--acc);padding:7px 11px;margin-bottom:9px;background:var(--bg3);border-radius:9px;font-size:12.5px;color:var(--fg2);max-height:96px;overflow:hidden}',
      '.quote-box .qb-who{font-size:11px;color:var(--acc);margin-bottom:3px;font-weight:600}',
      '.quote-box .qb-txt{white-space:pre-wrap;word-break:break-word;line-height:1.6}',
      '.msg.user .quote-box{background:rgba(255,255,255,.18)}',
      '.msg.user .quote-box .qb-who{color:rgba(255,255,255,.85)}',
      '.msg.user .quote-box .qb-txt{color:rgba(255,255,255,.92)}',

      /* ---- 输入框上方的"引用中"提示 ---- */
      '#quote-bar{display:flex;align-items:center;gap:8px;max-width:680px;margin:0 auto 9px;padding:9px 13px;border-radius:14px;background:var(--bg3);border:1px solid var(--line2);font-size:12.5px;color:var(--fg2);animation:msgIn .2s cubic-bezier(.16,1,.3,1) both}',
      '#quote-bar .qb-tag{font-size:11px;color:var(--acc);font-weight:600;flex:0 0 auto}',
      '#quote-bar .qb-pre{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.75}',
      '#quote-bar .qb-x{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:none;background:var(--fg);color:var(--bg);cursor:pointer;font-size:13px;line-height:1;display:grid;place-items:center;opacity:.7}',
      '#quote-bar .qb-x:hover{opacity:1}',

      /* ---- 上下文进度条 ---- */
      '#topbar{position:relative}',
      '#ctx-bar{position:absolute;left:0;right:0;bottom:0;height:2.5px;background:rgba(128,128,128,.12);z-index:6;pointer-events:auto}',
      '#ctx-bar .ctx-fill{height:100%;width:0;background:var(--acc);transition:width .35s cubic-bezier(.16,1,.3,1),background-color .35s ease;border-radius:0 2px 2px 0}',
      '#ctx-bar .ctx-fill.warn{background:#DBA23F}',
      '#ctx-bar .ctx-fill.danger{background:#CE5B5B}',

      /* ---- 气泡自定义 ---- */
      '.msg > .bubble{max-width:min(var(--bubble-max,680px),92%) !important;border-radius:var(--bubble-radius,20px) !important}',
      '.msg-body{max-width:min(var(--bubble-max,680px),92%) !important}',

      /* ---- 设置页里的滑杆 ---- */
      '#bubble-field .bs-row{display:flex;align-items:center;gap:12px;padding:9px 0}',
      '#bubble-field .bs-lb{flex:0 0 44px;font-size:12.5px;color:var(--fg2)}',
      '#bubble-field input[type=range]{flex:1 1 auto;accent-color:var(--acc);height:22px}',
      '#bubble-field .bs-v{flex:0 0 52px;text-align:right;font-size:11.5px;color:var(--fg3);font-variant-numeric:tabular-nums}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  })();

  function say(msg, ms) {
    try { if (typeof toast === 'function') toast(msg, ms || 3200); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ============================================================
     1. 懒加载外部库
     ============================================================ */
  var _loading = {};
  function loadJS(src) {
    if (_loading[src]) return _loading[src];
    _loading[src] = new Promise(function (res, rej) {
      var ex = document.querySelector('script[src="' + src + '"]');
      if (ex) {
        if (ex.dataset.p4ok === '1') return res();
        ex.addEventListener('load', function () { ex.dataset.p4ok = '1'; res(); });
        ex.addEventListener('error', function () { rej(new Error('load fail')); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { s.dataset.p4ok = '1'; res(); };
      s.onerror = function () { rej(new Error('load fail')); };
      document.head.appendChild(s);
    });
    return _loading[src];
  }
  function loadCSS(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  /* ============================================================
     2. 公式渲染（KaTeX）
     ============================================================ */
  var KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  var KATEX_JS = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
  var KATEX_AR = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
  var katexReady = false;

  loadCSS(KATEX_CSS);
  Promise.all([loadJS(KATEX_JS), loadJS(KATEX_AR)])
    .then(function () {
      katexReady = typeof window.renderMathInElement === 'function';
      if (katexReady) renderAllMath();
    })
    .catch(function () { /* CDN 挂了就算了，公式原样显示 */ });

  function renderMath(el) {
    if (!katexReady || typeof window.renderMathInElement !== 'function') return;
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
        throwOnError: false,
      });
    } catch (e) {}
  }

  function renderAllMath() {
    try {
      var nodes = document.querySelectorAll('#messages .bubble');
      Array.prototype.forEach.call(nodes, function (el) {
        if (el.dataset.mathDone === '1') return;
        renderMath(el);
        el.dataset.mathDone = '1';
      });
    } catch (e) {}
  }

  if (typeof textEl === 'function') {
    var _origTextEl = textEl;
    var _newTextEl = function (text) {
      var el = _origTextEl(text);
      if (katexReady) {
        try { renderMath(el); el.dataset.mathDone = '1'; } catch (e) {}
      }
      return el;
    };
    try { textEl = _newTextEl; } catch (e) {}
    try { window.textEl = _newTextEl; } catch (e) {}
  }

  /* ============================================================
     3. 图表渲染（Mermaid）
     ============================================================ */
  var MERMAID_JS = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
  var mermaidReady = false;

  function initMermaid() {
    if (mermaidReady) return true;
    if (typeof window.mermaid === 'undefined') return false;
    try {
      var dark = document.documentElement.classList.contains('dark');
      window.mermaid.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });
      mermaidReady = true;
      return true;
    } catch (e) { return false; }
  }

  function isMermaidFile(p) {
    if (!p) return false;
    var n = String(p.name || '').toLowerCase();
    if (n.slice(-8) === '.mermaid' || n.slice(-4) === '.mmd') return true;
    if (String(p.label || '').toUpperCase().indexOf('MERMAID') >= 0) return true;
    return false;
  }

  var mmdSeq = 0;
  function mermaidEl(p) {
    var d = document.createElement('div');
    d.className = 'mermaid-wrap';
    d.innerHTML = '<div class="mermaid-loading">正在画图…</div>';

    (async function () {
      var f = null;
      try { f = await dbGet(p.fileId); } catch (e) {}
      if (!f) {
        d.innerHTML = '<div class="mermaid-err">图表内容找不到了</div>';
        return;
      }

      if (!mermaidReady) {
        try { await loadJS(MERMAID_JS); initMermaid(); }
        catch (e) {}
      }
      if (!mermaidReady && !initMermaid()) {
        d.innerHTML = '<div class="mermaid-err">画图组件没加载出来（检查网络）</div>';
        return;
      }

      var id = 'mmd_' + (++mmdSeq) + '_' + Date.now().toString(36);
      try {
        var out = await window.mermaid.render(id, String(f.code || ''));
        d.innerHTML = (out && out.svg) || '';

        var bar = document.createElement('div');
        bar.className = 'mermaid-bar';

        var b1 = document.createElement('button');
        b1.type = 'button';
        b1.textContent = '看代码';
        b1.onclick = function (ev) {
          ev.stopPropagation();
          try { openPreview(p.fileId); } catch (e) {}
        };

        var b2 = document.createElement('button');
        b2.type = 'button';
        b2.textContent = '下载 SVG';
        b2.onclick = function (ev) {
          ev.stopPropagation();
          var svg = d.querySelector('svg');
          if (!svg) return;
          var blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = String(p.name || 'chart').replace(/\.[^.]+$/, '') + '.svg';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
        };

        bar.appendChild(b1);
        bar.appendChild(b2);
        d.appendChild(bar);
      } catch (e) {
        d.innerHTML = '<div class="mermaid-err">图没画出来：' +
          esc((e && e.message) || e).slice(0, 160) + '</div>';
      }
    })();

    return d;
  }

  if (typeof fileEl === 'function') {
    var _origFileEl = fileEl;
    var _newFileEl = function (p) {
      if (isMermaidFile(p)) {
        try { return mermaidEl(p); } catch (e) {}
      }
      return _origFileEl(p);
    };
    try { fileEl = _newFileEl; } catch (e) {}
    try { window.fileEl = _newFileEl; } catch (e) {}
  }

  /* ============================================================
     4. 气泡自定义
     ============================================================ */
  (function bubbleStyle() {
    function applyBubble() {
      try {
        var m = localStorage.getItem('aih.bubbleMax') || '680';
        var r = localStorage.getItem('aih.bubbleRadius') || '20';
        document.documentElement.style.setProperty('--bubble-max', m + 'px');
        document.documentElement.style.setProperty('--bubble-radius', r + 'px');
      } catch (e) {}
    }
    applyBubble();

    function buildBubbleUI() {
      var body = document.querySelector('#page-settings .page-body');
      if (!body) return false;
      if (document.getElementById('bubble-field')) return true;

      var sec = document.createElement('section');
      sec.className = 'field';
      sec.id = 'bubble-field';
      sec.innerHTML = [
        '<label>气泡样式</label>',
        '<div class="bs-row">',
        '  <span class="bs-lb">宽度</span>',
        '  <input type="range" id="bs-max" min="380" max="920" step="20" />',
        '  <span class="bs-v" id="bs-max-v">680px</span>',
        '</div>',
        '<div class="bs-row">',
        '  <span class="bs-lb">圆角</span>',
        '  <input type="range" id="bs-radius" min="0" max="28" step="1" />',
        '  <span class="bs-v" id="bs-radius-v">20px</span>',
        '</div>',
      ].join('\n');

      var anchor = body.lastElementChild;
      if (anchor && anchor.classList && anchor.classList.contains('row')) {
        body.insertBefore(sec, anchor);
      } else {
        body.appendChild(sec);
      }

      var rMax = sec.querySelector('#bs-max');
      var rRad = sec.querySelector('#bs-radius');
      var vMax = sec.querySelector('#bs-max-v');
      var vRad = sec.querySelector('#bs-radius-v');

      function sync() {
        var m = localStorage.getItem('aih.bubbleMax') || '680';
        var r = localStorage.getItem('aih.bubbleRadius') || '20';
        rMax.value = m;
        rRad.value = r;
        vMax.textContent = m + 'px';
        vRad.textContent = r + 'px';
      }
      sync();

      rMax.addEventListener('input', function () {
        localStorage.setItem('aih.bubbleMax', rMax.value);
        vMax.textContent = rMax.value + 'px';
        applyBubble();
      });
      rRad.addEventListener('input', function () {
        localStorage.setItem('aih.bubbleRadius', rRad.value);
        vRad.textContent = rRad.value + 'px';
        applyBubble();
      });

      return true;
    }

    buildBubbleUI();
    setTimeout(buildBubbleUI, 700);
    setTimeout(buildBubbleUI, 2000);

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('#tabbar button[data-page="settings"]')) {
        setTimeout(buildBubbleUI, 40);
      }
    }, true);
  })();

  /* ============================================================
     5. 引用回复
     ============================================================ */
  var pendingQuote = null;

  function renderQuoteBar() {
    var bar = document.getElementById('quote-bar');
    if (!pendingQuote) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'quote-bar';
      var composer = document.getElementById('composer');
      var editBar = document.getElementById('edit-bar');
      if (composer) {
        composer.insertBefore(bar, editBar ? editBar.nextSibling : composer.firstChild);
      }
    }
    bar.innerHTML = '';

    var tag = document.createElement('span');
    tag.className = 'qb-tag';
    tag.textContent = '引用 ' + (pendingQuote.role === 'user' ? '我' : 'AI');

    var pre = document.createElement('span');
    pre.className = 'qb-pre';
    pre.textContent = String(pendingQuote.text || '').replace(/\s+/g, ' ').slice(0, 80);

    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'qb-x';
    x.textContent = '×';
    x.onclick = function (e) {
      e.stopPropagation();
      pendingQuote = null;
      renderQuoteBar();
    };

    bar.appendChild(tag);
    bar.appendChild(pre);
    bar.appendChild(x);
  }

  function quoteFrom(idx) {
    var m = (typeof messages !== 'undefined' && messages) ? messages[idx] : null;
    if (!m) return;
    var text = typeof m.content === 'string' ? m.content : '';
    if (!text.trim()) {
      /* 没有正文就退而取第一个文本 part */
      var parts = m.parts || [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'text' && parts[i].text) { text = parts[i].text; break; }
      }
    }
    if (!text.trim()) { say('这条没有可引用的文字'); return; }

    pendingQuote = { role: m.role, text: text.slice(0, 240) };
    renderQuoteBar();
    try { document.getElementById('input').focus(); } catch (e) {}
  }
  window.__quoteFrom = quoteFrom;

  /* 点引用按钮 → 记录下来 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest('.msg-actions button[data-act="quote"]');
    if (!btn) return;
    e.stopPropagation();
    var el = btn.closest('.msg');
    if (!el || el.dataset.idx === undefined) return;
    quoteFrom(Number(el.dataset.idx));
  }, true);

  /* 包装 renderMsg：补按钮 + 渲染引用块 */
  if (typeof renderMsg === 'function') {
    var _prevRenderMsg = renderMsg;
    var _newRenderMsg2 = function (msg, idx) {
      var el = _prevRenderMsg(msg, idx);
      try {
        if (!el || !msg) return el;

        /* 引用按钮 */
        var acts = el.querySelector('.msg-actions');
        if (acts && !acts.querySelector('[data-act="quote"]')) {
          var b = document.createElement('button');
          b.dataset.act = 'quote';
          b.title = '引用这条';
          b.innerHTML = '<svg class="ic"><use href="#i-chat"/></svg>';
          acts.insertBefore(b, acts.firstChild);
        }

        /* 消息上挂着的引用块 */
        if (msg.quote && msg.quote.text) {
          var bub = el.querySelector('.bubble');
          if (bub && !bub.querySelector('.quote-box')) {
            var qb = document.createElement('div');
            qb.className = 'quote-box';
            var who = document.createElement('div');
            who.className = 'qb-who';
            who.textContent = '引用 ' + (msg.quote.role === 'user' ? '我' : 'AI');
            var tx = document.createElement('div');
            tx.className = 'qb-txt';
            tx.textContent = String(msg.quote.text).slice(0, 240);
            qb.appendChild(who);
            qb.appendChild(tx);
            bub.insertBefore(qb, bub.firstChild);
          }
        }
      } catch (e) {}
      return el;
    };
    try { renderMsg = _newRenderMsg2; } catch (e) {}
    try { window.renderMsg = _newRenderMsg2; } catch (e) {}
  }

  /* 包装 buildUserContent：把引用拼进去，让模型也看得到 */
  if (typeof buildUserContent === 'function') {
    var _prevBUC = buildUserContent;
    var _newBUC = function (m) {
      var r = _prevBUC(m);
      try {
        if (!m || !m.quote || !m.quote.text) return r;
        var who = m.quote.role === 'user' ? '我' : 'AI';
        var prefix = '【引用' + who + '】' + String(m.quote.text).replace(/\s+/g, ' ').slice(0, 240) + '\n\n';
        if (typeof r === 'string') return prefix + r;
        if (Array.isArray(r)) {
          var ti = -1;
          for (var i = 0; i < r.length; i++) { if (r[i] && r[i].type === 'text') { ti = i; break; } }
          if (ti >= 0) r[ti].text = prefix + (r[ti].text || '');
          else r.unshift({ type: 'text', text: prefix });
          return r;
        }
      } catch (e) {}
      return r;
    };
    try { buildUserContent = _newBUC; } catch (e) {}
    try { window.buildUserContent = _newBUC; } catch (e) {}
  }

  /* 包装 send：发之前先把引用挂到即将新建的那条消息上。
     做法：临时劫持 messages.push 一次，把 quote 塞进去。 */
  if (typeof send === 'function') {
    var _origSend = send;
    var _newSend = async function () {
      if (typeof streaming !== 'undefined' && streaming) return _origSend();
      if (!pendingQuote) return _origSend();

      var q = pendingQuote;
      var arr = (typeof messages !== 'undefined' && messages) ? messages : null;
      if (!arr) return _origSend();

      /* 一次性拦截：下一条被 push 的 user 消息带上 quote */
      var origPush = arr.push;
      var patched = function () {
        try {
          if (arguments.length && arguments[0] && arguments[0].role === 'user' && !arguments[0].quote) {
            arguments[0].quote = { role: q.role, text: q.text };
          }
        } catch (e) {}
        arr.push = origPush;
        return origPush.apply(arr, arguments);
      };
      arr.push = patched;

      pendingQuote = null;
      renderQuoteBar();

      try {
        var r = await _origSend();
        return r;
      } finally {
        if (arr.push === patched) arr.push = origPush;
      }
    };
    try { send = _newSend; } catch (e) {}
    try { window.send = _newSend; } catch (e) {}
  }

  /* ============================================================
     6. 上下文进度条
     ============================================================ */
  var CTX_LIMIT = 64000;

  function estimateTokens() {
    var n = 0;
    try {
      var arr = (typeof messages !== 'undefined' && messages) ? messages : [];
      for (var i = 0; i < arr.length; i++) {
        var m = arr[i];
        if (typeof m.content === 'string') n += m.content.length;
        if (m.reasoning) n += String(m.reasoning).length;
        var parts = m.parts || [];
        for (var j = 0; j < parts.length; j++) {
          if (parts[j] && parts[j].type === 'text') n += String(parts[j].text || '').length;
        }
      }
      if (typeof buildSystemPrompt === 'function') n += String(buildSystemPrompt() || '').length;
    } catch (e) {}
    return Math.round(n / 2.8);
  }

  function ensureCtxBar() {
    var tb = document.getElementById('topbar');
    if (!tb) return null;
    var bar = document.getElementById('ctx-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ctx-bar';
      bar.innerHTML = '<div class="ctx-fill"></div>';
      tb.appendChild(bar);
    }
    return bar;
  }

  function updateCtxBar() {
    try {
      var bar = ensureCtxBar();
      if (!bar) return;
      var fill = bar.querySelector('.ctx-fill');
      if (!fill) return;
      var t = estimateTokens();
      var pct = Math.min(100, (t / CTX_LIMIT) * 100);
      fill.style.width = pct + '%';
      fill.classList.toggle('warn', pct >= 55 && pct < 82);
      fill.classList.toggle('danger', pct >= 82);
      bar.title = '上下文约 ' + t.toLocaleString('en-US') + ' tokens（估算 · 上限按 ' + (CTX_LIMIT / 1000) + 'k 算）';
    } catch (e) {}
  }
  window.__ctxUpdate = updateCtxBar;

  if (typeof renderMessages === 'function') {
    var _prevRM = renderMessages;
    var _newRM = function (i) {
      _prevRM(i);
      setTimeout(updateCtxBar, 30);
    };
    try { renderMessages = _newRM; } catch (e) {}
    try { window.renderMessages = _newRM; } catch (e) {}
  }

  ensureCtxBar();
  updateCtxBar();
  setTimeout(updateCtxBar, 500);

  /* ============================================================
     7. AI 自动起标题
     ============================================================ */
  var titling = false;

  async function maybeAutoTitle() {
    if (titling) return;
    var s = null;
    try { s = (typeof currentSession === 'function') ? currentSession() : null; } catch (e) {}
    if (!s) return;
    if (s.titled) return;          /* 用户手动改过名，不动 */
    if (s.autoTitled) return;      /* 已经自动起过 */

    var arr = (typeof messages !== 'undefined' && messages) ? messages : [];
    if (arr.length < 2) return;

    var firstUser = null, firstAI = null;
    for (var i = 0; i < arr.length; i++) {
      if (!firstUser && arr[i].role === 'user' && arr[i].content) firstUser = arr[i];
      if (!firstAI && arr[i].role === 'assistant' && arr[i].content) firstAI = arr[i];
      if (firstUser && firstAI) break;
    }
    if (!firstUser || !firstAI) return;

    var p = null;
    try { p = (typeof activeProvider === 'function') ? activeProvider() : null; } catch (e) {}
    if (!p || !p.base || !p.key) return;

    titling = true;
    try {
      var q = '请给下面这段对话起一个简短标题：不超过 12 个字，只输出标题本身，不要引号、不要句号、不要任何解释。\n\n' +
        '用户：' + String(firstUser.content || '').replace(/\s+/g, ' ').slice(0, 220) + '\n' +
        'AI：' + String(firstAI.content || '').replace(/\s+/g, ' ').slice(0, 320);

      var url = p.base.replace(/\/+$/, '') + '/chat/completions';
      var res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
        body: JSON.stringify({
          model: p.model,
          stream: false,
          temperature: 0.3,
          max_tokens: 48,
          messages: [{ role: 'user', content: q }],
        }),
      });
      if (!res.ok) return;
      var j = await res.json();
      var t = '';
      try {
        t = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      } catch (e) {}
      t = String(t).trim().replace(/^["'「『]+|["'」』]+$/g, '').replace(/[。！？.!?]+$/g, '').trim().slice(0, 24);
      if (!t) return;

      if (s.title === t) { s.autoTitled = true; return; }
      s.title = t;
      s.autoTitled = true;
      try { LS.sessions = sessions; } catch (e) {}
      try {
        var search = document.getElementById('conv-search');
        if (typeof renderConvList === 'function') renderConvList(search ? search.value : '');
      } catch (e) {}
    } catch (e) {
      /* 静默失败，别打扰用户 */
    } finally {
      titling = false;
    }
  }
  window.__maybeAutoTitle = maybeAutoTitle;

  if (typeof runAssistant === 'function') {
    var _prevRA = runAssistant;
    var _newRA = async function () {
      var r = await _prevRA();
      try { updateCtxBar(); } catch (e) {}
      setTimeout(function () { maybeAutoTitle(); }, 350);
      return r;
    };
    try { runAssistant = _newRA; } catch (e) {}
    try { window.runAssistant = _newRA; } catch (e) {}
  }

  /* ============================================================
     8. 版本徽章
     ============================================================ */
  (function bumpVer() {
    try {
      var v = document.querySelector('.ver');
      if (v) v.textContent = 'v50';
    } catch (e) {}
  })();

})();
