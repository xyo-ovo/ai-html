/* ============================================================
   patch.js —— 所有补丁合并版
   v75：AI 消息可直接编辑（只替换内容，不重新生成、不动用户消息）
   ============================================================ */

/* ============================================================
   1. 样式总注入
   ============================================================ */
(function injectAllCss() {
  var old = document.getElementById('patch-css');
  if (old) old.remove();

  var s = document.createElement('style');
  s.id = 'patch-css';
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
    '.mermaid-bar button{font-size:11.5px;padding:4px 11px;border-radius:9px;border:1px solid var(--line2);background:var(--bg2);color:var(--fg2);cursor:pointer}',
    '.mermaid-bar button:hover{border-color:var(--acc);color:var(--acc)}',

    /* ---- 引用 ---- */
    '.quote-box{border-left:3px solid var(--acc);padding:7px 11px;margin-bottom:9px;background:var(--bg3);border-radius:9px;font-size:12.5px;color:var(--fg2);max-height:96px;overflow:hidden}',
    '.quote-box .qb-who{font-size:11px;color:var(--acc);margin-bottom:3px;font-weight:600}',
    '.quote-box .qb-txt{white-space:pre-wrap;word-break:break-word;line-height:1.6}',
    '.msg.user .quote-box{background:rgba(255,255,255,.18)}',
    '#quote-bar{display:flex;align-items:center;gap:8px;max-width:680px;margin:0 auto 9px;padding:9px 13px;border-radius:14px;background:var(--bg3);border:1px solid var(--line2);font-size:12.5px;color:var(--fg2)}',
    '#quote-bar .qb-tag{font-size:11px;color:var(--acc);font-weight:600;flex:0 0 auto}',
    '#quote-bar .qb-pre{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.75}',
    '#quote-bar .qb-x{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:none;background:var(--fg);color:var(--bg);cursor:pointer;font-size:13px;line-height:1;display:grid;place-items:center;opacity:.7}',

    /* ---- 上下文环 ---- */
    '#ctx-bar{display:none !important}',
    '#btn-attach{position:relative !important;overflow:visible !important}',
    '#ctx-ring{position:absolute;inset:-3px;border-radius:15px;padding:2.5px;pointer-events:none;opacity:0;transition:opacity .25s ease;background:transparent;',
    '  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;',
    '  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude}',
    '#ctx-ring.on{opacity:1}',

    /* ---- 气泡 ---- */
    '.msg > .bubble{max-width:min(var(--bubble-max,680px),92%) !important;border-radius:var(--bubble-radius,20px) !important}',
    '.msg-body{max-width:min(var(--bubble-max,680px),92%) !important}',

    /* ---- 设置页滑杆 ---- */
    '#bubble-field .bs-row{display:flex;align-items:center;gap:12px;padding:9px 0}',
    '#bubble-field .bs-lb{flex:0 0 44px;font-size:12.5px;color:var(--fg2)}',
    '#bubble-field input[type=range]{flex:1 1 auto;accent-color:var(--acc);height:22px}',
    '#bubble-field .bs-v{flex:0 0 52px;text-align:right;font-size:11.5px;color:var(--fg3);font-variant-numeric:tabular-nums}',
    '#font-field .font-name{font-size:12.5px;color:var(--fg2);margin:6px 0 10px;word-break:break-all}',
    '#font-field .font-name b{color:var(--acc)}',
    '#font-field .font-btns{display:flex;gap:8px;flex-wrap:wrap}',

    /* ---- 搜索配置块 ---- */
    '#websearch-field .ws-inputs{display:flex;flex-direction:column;gap:9px}',
    '#websearch-field .ws-inputs input{font-size:13.5px;padding:12px 14px}',
    '#websearch-field .ws-row{display:flex;gap:8px;flex-wrap:wrap}',
    '#websearch-field .ws-row button{flex:1 1 auto;min-width:120px}',
    '#websearch-field .ws-tip{font-size:11.5px;color:var(--fg3);line-height:1.7;margin-top:2px}',
    '#websearch-field .ws-badge{display:inline-block;font-size:10.5px;font-weight:600;padding:1px 7px;border-radius:999px;background:var(--acc-soft);color:var(--acc);margin-left:6px;vertical-align:middle}',
    '#websearch-field .ws-status{font-size:12px;line-height:1.7;padding:10px 13px;border-radius:12px;background:var(--bg3);border:1px solid var(--line2);color:var(--fg2)}',
    '#websearch-field .ws-status b{color:var(--fg)}',
    '#websearch-field .ws-status .ok{color:var(--ok)}',
    '#websearch-field .ws-status .warn{color:var(--danger)}',
    '#websearch-field .ws-toggle-row{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;background:var(--bg3);border:1px solid var(--line2)}',
    '#websearch-field .ws-toggle-row .ws-tg-meta{flex:1 1 auto;min-width:0}',
    '#websearch-field .ws-toggle-row .ws-tg-name{font-size:13.5px;font-weight:600}',
    '#websearch-field .ws-toggle-row .ws-tg-sub{font-size:11.5px;color:var(--fg3);margin-top:3px;line-height:1.6}',

    /* ---- 搜索 ---- */
    '.find-bar{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--line);background:var(--bg2);z-index:30}',
    '.find-bar input{flex:1 1 auto;padding:9px 13px;border-radius:12px;font-size:14px;background:var(--bg3);border-color:transparent}',
    '.find-count{font-size:12px;color:var(--fg3);flex:0 0 auto;min-width:3.2em;text-align:right}',
    '.find-bar > button{width:32px;height:32px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;color:var(--fg2);font-size:14px;background:none;border:none;cursor:pointer}',
    '.find-bar > button:hover{background:var(--bg3);color:var(--fg)}',
    '.find-list{position:absolute;left:12px;right:12px;top:calc(100% + 6px);max-height:52vh;overflow-y:auto;background:var(--bg2);border:1px solid var(--line2);border-radius:16px;box-shadow:var(--sh-3);padding:6px;display:flex;flex-direction:column;gap:2px;z-index:60}',
    '.find-list .find-row{display:flex;align-items:flex-start;gap:9px;width:100%;box-sizing:border-box;padding:9px 11px;border-radius:11px;text-align:left;font-size:12.5px;line-height:1.6;background:none;border:none;cursor:pointer}',
    '.find-list .find-row:hover{background:var(--bg3)}',
    '.find-list .find-row .fr-n{flex:0 0 1.8em;text-align:right;color:var(--fg3);font-size:11.5px}',
    '.find-list .find-row .fr-role{flex:0 0 auto;font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--bg4);color:var(--fg2);white-space:nowrap}',
    '.find-list .find-row .fr-role.u{background:var(--acc-soft);color:var(--acc)}',
    '.find-list .find-row .fr-txt{flex:1 1 auto;min-width:0;color:var(--fg2);word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '.find-empty{padding:16px;text-align:center;color:var(--fg3);font-size:12.5px}',

    /* ---- 分支 ---- */
    '.msg-branch{display:flex;align-items:center;gap:6px;margin:2px 0 8px 2px;font-size:11.5px;color:var(--fg3)}',
    '.msg-branch button{width:23px;height:23px;border-radius:8px;border:1px solid var(--line2);background:var(--bg2);color:var(--fg2);display:grid;place-items:center;cursor:pointer;font-size:14px;line-height:1;padding:0}',
    '.msg-branch button:hover:not(:disabled){border-color:var(--acc);color:var(--acc)}',
    '.msg-branch button:disabled{opacity:.3;cursor:default}',
    '.msg-branch .br-n{font-variant-numeric:tabular-nums;padding:0 2px}',
    '.msg-branch .br-tag{font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--bg4);color:var(--fg3);margin-left:2px}',

    /* ---- 输入区对齐 ---- */
    '.composer-inner{display:flex;align-items:center !important}',
    '.composer-inner > button,.composer-inner > .tool-btn{align-self:center !important;flex:0 0 auto;margin-top:0 !important;margin-bottom:0 !important}',
    '.composer-inner > textarea{align-self:center !important}',

    /* ---- 角色卡详情：顶部分类标签 ---- */
    '#cv-body .cv-tabs{display:flex;gap:4px;padding:4px;background:var(--bg3);border-radius:15px;margin-bottom:18px}',
    '#cv-body .cv-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 6px;border-radius:12px;font-size:13.5px;font-weight:500;color:var(--fg2);background:none;border:none;cursor:pointer;transition:background-color .2s ease,color .2s ease,box-shadow .2s ease,transform .12s ease}',
    '#cv-body .cv-tab:hover{color:var(--fg)}',
    '#cv-body .cv-tab:active{transform:scale(.97)}',
    '#cv-body .cv-tab.on{background:var(--bg2);color:var(--fg);font-weight:600;box-shadow:0 2px 6px -2px rgba(58,52,46,.18)}',
    '#cv-body .cv-tab .cv-tab-n{font-size:10.5px;font-weight:600;padding:1px 6px;border-radius:999px;background:var(--bg4);color:var(--fg3);line-height:1.5}',
    '#cv-body .cv-tab.on .cv-tab-n{background:var(--acc-soft);color:var(--acc)}',
    '#cv-body .cv-tab.is-empty{opacity:.38;cursor:default}',
    '#cv-body .cv-tab.is-empty:hover{color:var(--fg2)}',

    /* ---- 列表视觉 ---- */
    '#card-list .card-item{position:relative;border-radius:20px !important;padding:16px 40px 16px 18px !important;background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 7%,var(--bg2)) 0%,var(--bg2) 58%) !important;border:1px solid color-mix(in srgb,var(--acc) 20%,var(--line2)) !important;transition:transform .22s cubic-bezier(.16,1,.3,1),box-shadow .24s ease,border-color .2s ease !important}',
    '#card-list .card-item:hover{transform:translateY(-2px) !important;border-color:color-mix(in srgb,var(--acc) 48%,var(--line2)) !important;box-shadow:0 14px 30px -16px color-mix(in srgb,var(--acc) 55%,transparent) !important}',
    '#card-list .card-item::after{content:"›";position:absolute;right:15px;top:50%;transform:translateY(-50%) translateX(-4px);font-size:22px;line-height:1;color:var(--acc);opacity:0;transition:opacity .2s ease,transform .22s cubic-bezier(.16,1,.3,1);pointer-events:none}',
    '#card-list .card-item:hover::after{opacity:.75;transform:translateY(-50%) translateX(0)}',
    '#card-list .card-item .ci-ico{width:46px !important;height:46px !important;border-radius:15px !important;background:linear-gradient(140deg,var(--acc),color-mix(in srgb,var(--acc) 62%,#3A2A1E)) !important;box-shadow:0 7px 18px -7px color-mix(in srgb,var(--acc) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.28) !important}',

    '#provider-list .provider-item{position:relative;border-radius:16px !important;padding:13px 16px !important;overflow:hidden;background:var(--bg2) !important;border:1px solid var(--line2) !important;transition:background-color .2s ease,border-color .2s ease !important}',
    '#provider-list .provider-item::before{content:"";position:absolute;left:0;top:10%;bottom:10%;width:3px;border-radius:0 3px 3px 0;background:var(--acc);transform:scaleY(0);transform-origin:center;transition:transform .28s cubic-bezier(.16,1,.3,1)}',
    '#provider-list .provider-item.active::before{transform:scaleY(1)}',
    '#provider-list .provider-item.active{background:color-mix(in srgb,var(--acc) 6%,var(--bg2)) !important;border-color:color-mix(in srgb,var(--acc) 38%,var(--line2)) !important}',
    '#provider-list .provider-item .pi-dot{width:10px !important;height:10px !important;border-radius:50% !important;background:transparent !important;border:2px solid var(--fg3) !important;opacity:.55;transition:all .22s ease !important}',
    '#provider-list .provider-item.active .pi-dot{border-color:var(--acc) !important;background:var(--acc) !important;opacity:1;box-shadow:0 0 0 3.5px color-mix(in srgb,var(--acc) 20%,transparent)}',
    '#provider-list .provider-item .pi-model{font-family:var(--font-mono) !important;font-size:11px !important;opacity:.82}',

    '#tool-list .tool-item{border-radius:14px !important;padding:12px 14px !important;background:var(--bg2) !important;border:1px solid var(--line2) !important;transition:border-color .2s ease,background-color .2s ease !important}',
    '#tool-list .tool-item:hover{border-color:color-mix(in srgb,var(--acc) 42%,var(--line2)) !important;background:color-mix(in srgb,var(--acc) 3%,var(--bg2)) !important}',
    '#tool-list .tool-item .ti-icon{width:34px !important;height:34px !important;border-radius:10px !important;background:color-mix(in srgb,var(--acc) 13%,transparent) !important;color:var(--acc) !important;box-shadow:none !important}',

    '#lore-list .tool-item{border-radius:4px 14px 14px 4px !important;padding:12px 14px 12px 16px !important;background:var(--bg2) !important;border:1px solid var(--line2) !important;border-left:3px solid color-mix(in srgb,var(--acc) 55%,transparent) !important;transition:border-color .2s ease,background-color .2s ease !important}',
    '#lore-list .tool-item:hover{border-color:color-mix(in srgb,var(--acc) 35%,var(--line2)) !important;border-left-color:var(--acc) !important;background:color-mix(in srgb,var(--acc) 3.5%,var(--bg2)) !important}',
    '#lore-list .tool-item .ti-icon{background:transparent !important;color:color-mix(in srgb,var(--acc) 80%,transparent) !important;width:24px !important;height:24px !important;box-shadow:none !important}',
    '#lore-list .tool-item .ti-sub{font-family:var(--font-mono) !important;font-size:11px !important;opacity:.8}',

    '#file-list .file-row{border-radius:16px !important;padding:13px 15px !important;background:var(--bg2) !important;border:1px solid var(--line2) !important;transition:border-color .2s ease,background-color .2s ease,transform .2s cubic-bezier(.16,1,.3,1) !important}',
    '#file-list .file-row:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--acc) 40%,var(--line2)) !important;background:color-mix(in srgb,var(--acc) 4%,var(--bg2)) !important}',
    '#file-list .file-row .fr-icon{width:38px !important;height:38px !important;border-radius:12px !important;background:color-mix(in srgb,var(--acc) 13%,transparent) !important;color:var(--acc) !important}',
    '#file-list .file-row .fr-btns{opacity:.45;transition:opacity .2s ease}',
    '#file-list .file-row:hover .fr-btns{opacity:1}',

    '#card-list .empty,#tool-list .empty,#lore-list .empty,#provider-list .empty,#file-list .empty{padding:22px 14px !important;border:1px dashed var(--line2);border-radius:16px;font-size:12.5px;line-height:1.8;opacity:.72}',

    /* ============================================================
       导航栏磨砂（v74）
       ============================================================ */
    '#topbar{position:fixed !important;top:0;left:0;right:0;z-index:40;',
    '  background:color-mix(in srgb,var(--bg) 62%,transparent) !important;',
    '  -webkit-backdrop-filter:blur(30px) saturate(1.8) !important;',
    '  backdrop-filter:blur(30px) saturate(1.8) !important;',
    '  border-bottom:1px solid color-mix(in srgb,var(--line) 55%,transparent) !important;',
    '  box-shadow:0 1px 2px color-mix(in srgb,var(--fg) 5%,transparent) !important}',

    '#tabbar{position:fixed !important;left:0;right:0;bottom:0;z-index:40;',
    '  background:color-mix(in srgb,var(--bg) 62%,transparent) !important;',
    '  -webkit-backdrop-filter:blur(30px) saturate(1.8) !important;',
    '  backdrop-filter:blur(30px) saturate(1.8) !important;',
    '  border-top:1px solid color-mix(in srgb,var(--line) 55%,transparent) !important}',

    '#tabbar button.on::after{box-shadow:0 0 8px color-mix(in srgb,var(--acc) 70%,transparent)}',

    '#messages{padding-top:calc(26px + var(--nav-top,60px)) !important;',
    '  padding-bottom:calc(16px + var(--nav-bot,60px)) !important}',

    '.page-head{padding-top:calc(24px + var(--nav-top,60px)) !important}',

    '.page-body{padding-bottom:calc(34px + var(--nav-bot,60px)) !important}',

    '#page-chat #composer{margin-bottom:var(--nav-bot,60px) !important}',

    '#page-chat #find-bar{margin-top:var(--nav-top,60px)}',
  ].join('\n');
  (document.head || document.documentElement).appendChild(s);
})();

/* ============================================================
   2. 角色卡本地存储补丁（LS.cards）
   ============================================================ */
(function ensureCardsStorage() {
  if (typeof LS === 'undefined' || !LS) return;
  var d = null;
  try { d = Object.getOwnPropertyDescriptor(LS, 'cards'); } catch (e) {}
  if (d && (d.get || d.set)) return;
  try {
    Object.defineProperty(LS, 'cards', {
      get: function () {
        try {
          var arr = JSON.parse(localStorage.getItem('aih.cards') || '[]');
          return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
      },
      set: function (v) {
        try { localStorage.setItem('aih.cards', JSON.stringify(Array.isArray(v) ? v : [])); }
        catch (e) {}
      },
      configurable: true,
      enumerable: true,
    });
  } catch (e) {}
})();

/* ============================================================
   3. 角色卡导入修复
   ============================================================ */
(function cardImportFix() {
  'use strict';
  var BTN_ID = 'btn-import-card-v2';

  function say(msg, ms) {
    try { if (typeof toast === 'function') toast(msg, ms || 3600); } catch (e) {}
  }
  window.__cardFixSay = say;

  function sanitize(json) {
    try {
      var d = (json && (json.data || json)) || {};
      var book = d.character_book || d.world_info || d.worldInfo;
      if (book) {
        if (Array.isArray(book)) {
          var a = book.filter(function (e) { return e && typeof e === 'object'; });
          if (d.character_book === book) d.character_book = a;
          else if (d.world_info === book) d.world_info = a;
          else if (d.worldInfo === book) d.worldInfo = a;
        } else if (typeof book === 'object' && Array.isArray(book.entries)) {
          book.entries = book.entries.filter(function (e) { return e && typeof e === 'object'; });
        }
      }
      var ex = d.extensions;
      if (ex && typeof ex === 'object') {
        var rx = ex.regex_scripts || ex.Regex;
        if (Array.isArray(rx)) {
          var r = rx.filter(function (x) { return x && typeof x === 'object'; });
          if (ex.regex_scripts) ex.regex_scripts = r; else ex.Regex = r;
        }
      }
      if (Array.isArray(d.regex_scripts)) {
        d.regex_scripts = d.regex_scripts.filter(function (x) { return x && typeof x === 'object'; });
      }
      if (Array.isArray(d.alternate_greetings)) {
        d.alternate_greetings = d.alternate_greetings.filter(function (g) {
          return g != null && String(g).trim();
        });
      }
    } catch (e) {}
    return json;
  }

  if (typeof parseCardJson === 'function' && !parseCardJson.__cfPatched) {
    var _origParse = parseCardJson;
    var _newParse = function (json) { return _origParse(sanitize(json)); };
    _newParse.__cfPatched = true;
    try { parseCardJson = _newParse; } catch (e) {}
    try { window.parseCardJson = _newParse; } catch (e) {}
  }

  function doImport(files) {
    if (!files || !files.length) { say('没有拿到文件（选择器可能被取消了）'); return; }
    var fn = window.importCardFile || (typeof importCardFile === 'function' ? importCardFile : null);
    if (!fn) { say('解析函数未就绪，请强制刷新页面'); return; }

    var i = 0, ok = 0, errs = [];
    (function next() {
      if (i >= files.length) {
        if (errs.length) say('导入失败：' + errs[0], 5200);
        else if (ok === 0) say('没有文件被导入（可能是格式不支持）', 4200);
        return;
      }
      var f = files[i++];
      var fname = (f && f.name) || ('第 ' + i + ' 个文件');
      Promise.resolve()
        .then(function () { return fn(f); })
        .then(function () { ok++; })
        .catch(function (e) {
          var m = (e && e.message) || String(e);
          errs.push(fname + '：' + m);
          say('「' + fname + '」导入出错：' + m, 5200);
        })
        .then(function () { setTimeout(next, 0); });
    })();
  }
  window.__cardFixImport = doImport;

  function bind() {
    var btn = document.getElementById(BTN_ID);
    var p = document.getElementById('pick-card');
    if (!btn || !p) return false;
    if (btn.dataset.cfBound === '1') return true;
    btn.dataset.cfBound = '1';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      try { p.click(); }
      catch (err) { say('打不开文件选择器：' + ((err && err.message) || err), 4200); }
    });
    return true;
  }
  bind();
  setTimeout(bind, 80);
  setTimeout(bind, 400);
  setTimeout(bind, 1500);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="card"]')) setTimeout(bind, 40);
  }, true);

  window.__cardFixImportText = function (text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) { say('先粘贴内容'); return; }
    var json = null;
    if (t.charAt(0) === '{' || t.charAt(0) === '[') {
      try { json = JSON.parse(t); } catch (e) {}
    }
    if (!json && typeof b64ToUtf8 === 'function') {
      try { json = JSON.parse(b64ToUtf8(t)); } catch (e) {}
    }
    if (!json) { try { json = JSON.parse(atob(t)); } catch (e) {} }
    if (!json || typeof json !== 'object') { say('不是合法的角色卡 JSON', 4200); return; }
    if (typeof parseCardJson !== 'function' || typeof LS === 'undefined') {
      say('解析器未就绪，请强制刷新'); return;
    }
    var parsed;
    try { parsed = parseCardJson(json); }
    catch (e) { say('解析失败：' + ((e && e.message) || e), 5200); return; }
    if (!parsed || !parsed.fields) { say('解析结果为空，可能不是角色卡格式', 4200); return; }

    var card = {
      id: (typeof uid === 'function' ? uid() : String(Date.now())),
      name: parsed.fields.name || '未命名角色',
      ts: Date.now(),
      active: true,
      fields: parsed.fields,
      book: parsed.book || { name: '', entries: [] },
      regex: parsed.regex || [],
    };
    var arr;
    try { arr = (LS.cards || []).slice(); } catch (e) { arr = []; }
    arr.unshift(card);
    try { LS.cards = arr; }
    catch (e) { say('角色卡太大，localStorage 存不下了', 4600); return; }

    if (typeof renderCardList === 'function') renderCardList();
    var nB = (card.book.entries || []).length;
    var nR = (card.regex || []).length;
    say('已导入「' + card.name + '」' +
      (nB ? ' · ' + nB + ' 条世界书' : '') +
      (nR ? ' · ' + nR + ' 条正则' : ''), 4200);
    var ta = document.getElementById('paste-card');
    if (ta) ta.value = '';
  };
})();

/* ============================================================
   4. 改名 → 机语工坊
   ============================================================ */
(function renameApp() {
  var OLD = 'AI HTML 工坊';
  var NEW = '机语工坊';

  if (typeof sessionPersona === 'function') {
    var _orig = sessionPersona;
    var _new = function () {
      var p = _orig();
      try { if (p && (!p.name || p.name === OLD)) p.name = NEW; } catch (e) {}
      return p;
    };
    try { sessionPersona = _new; } catch (e) {}
    try { window.sessionPersona = _new; } catch (e) {}
  }

  function refresh() {
    try { if (typeof renderBrand === 'function') renderBrand(); } catch (e) {}
    try { if (!document.title || document.title === OLD) document.title = NEW; } catch (e) {}
    var nm = document.getElementById('brand-name');
    if (nm && nm.textContent.trim() === OLD) nm.textContent = NEW;
    var ph = document.getElementById('pa-name');
    if (ph && ph.placeholder === OLD) ph.placeholder = NEW;
  }
  refresh();
  setTimeout(refresh, 120);
  setTimeout(refresh, 800);
})();

/* ============================================================
   5. 正文字体上传
   ============================================================ */
(function fontFeature() {
  'use strict';
  var DB_NAME = 'aih-font', STORE = 'fonts', KEY = 'current';
  var FAMILY = 'aih-user-font', STYLE_ID = 'aih-font-style';

  function say(msg, ms) {
    try { if (typeof toast === 'function') toast(msg, ms || 3600); } catch (e) {}
  }
  function openDB() {
    return new Promise(function (res, rej) {
      var r;
      try { r = indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = function () { try { r.result.createObjectStore(STORE); } catch (e) {} };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbPut(k, v) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(v, k);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbGet(k) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readonly');
        var rq = tx.objectStore(STORE).get(k);
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
      });
    });
  }

  function mountStyle() {
    var s = document.getElementById(STYLE_ID);
    if (s) return s;
    s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.msg .bubble,.msg .bubble p,.msg .bubble li,.msg .bubble h1,.msg .bubble h2,',
      '.msg .bubble h3,.msg .bubble h4,.msg .bubble blockquote,',
      '.msg .bubble td,.msg .bubble th,.msg .bubble a,.msg .bubble strong,',
      '.msg .bubble em,.msg .bubble span:not(.ic){font-family:"' + FAMILY + '",var(--font-sans) !important}',
      '.msg .bubble pre,.msg .bubble pre *,.msg .bubble code,.msg .bubble kbd,.msg .bubble samp{font-family:var(--font-mono) !important}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
    return s;
  }
  function unmountStyle() {
    var s = document.getElementById(STYLE_ID);
    if (s) s.remove();
    try {
      document.fonts.forEach(function (f) { if (f.family === FAMILY) document.fonts.delete(f); });
    } catch (e) {}
  }
  function applyFont(rec) {
    if (!rec || !rec.data) return Promise.resolve(false);
    var ff;
    try { ff = new FontFace(FAMILY, rec.data); } catch (e) { return Promise.reject(e); }
    return ff.load().then(function (loaded) {
      try {
        document.fonts.forEach(function (f) { if (f.family === FAMILY) document.fonts.delete(f); });
      } catch (e) {}
      document.fonts.add(loaded);
      mountStyle();
      return true;
    });
  }

  function buildUI() {
    var body = document.querySelector('#page-settings .page-body');
    if (!body || document.getElementById('font-field')) return !!body;

    var sec = document.createElement('section');
    sec.className = 'field';
    sec.id = 'font-field';
    sec.innerHTML = [
      '<label>正文字体</label>',
      '<div class="font-name" id="font-name">当前：系统默认</div>',
      '<div class="font-btns">',
      '  <button type="button" class="ghost" id="btn-font-pick">选择字体文件</button>',
      '  <button type="button" class="ghost danger" id="btn-font-reset">恢复默认</button>',
      '</div>',
      '<input type="file" id="pick-font" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" hidden />',
      '<p class="hint">支持 ttf / otf / woff / woff2。只改聊天气泡里的正文，代码块保持等宽。</p>',
    ].join('\n');

    var anchor = body.lastElementChild;
    if (anchor && anchor.classList && anchor.classList.contains('row')) body.insertBefore(sec, anchor);
    else body.appendChild(sec);

    var pick = sec.querySelector('#pick-font');
    var btnPick = sec.querySelector('#btn-font-pick');
    var btnReset = sec.querySelector('#btn-font-reset');
    var nameEl = sec.querySelector('#font-name');

    function setName(n) {
      if (!nameEl) return;
      if (n) nameEl.innerHTML = '当前：<b>' + String(n).replace(/[<>&]/g, '') + '</b>';
      else nameEl.textContent = '当前：系统默认';
    }

    btnPick.addEventListener('click', function (e) {
      e.stopPropagation();
      try { pick.click(); }
      catch (err) { say('打不开文件选择器：' + ((err && err.message) || err), 4200); }
    });

    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) { say('字体文件超过 20MB'); return; }
      say('正在加载字体…', 2200);
      var reader = new FileReader();
      reader.onload = function () {
        var rec = { name: f.name, data: reader.result, ts: Date.now() };
        idbPut(KEY, rec)
          .then(function () { return applyFont(rec); })
          .then(function () { setName(f.name); say('字体已应用：' + f.name, 3600); })
          .catch(function (e2) { say('字体加载失败：' + ((e2 && e2.message) || e2), 4600); });
      };
      reader.onerror = function () { say('读文件失败'); };
      try { reader.readAsArrayBuffer(f); } catch (e3) { say('格式读不了'); }
      try { pick.value = ''; } catch (e4) {}
    });

    btnReset.addEventListener('click', function (e) {
      e.stopPropagation();
      idbPut(KEY, null).then(function () {
        unmountStyle(); setName(null); say('已恢复默认字体', 3000);
      }).catch(function () { unmountStyle(); setName(null); });
    });
    return true;
  }

  function boot() {
    buildUI();
    idbGet(KEY).then(function (rec) {
      if (!rec || !rec.data) return;
      return applyFont(rec).then(function () {
        var el = document.getElementById('font-name');
        if (el) el.innerHTML = '当前：<b>' + String(rec.name || '自定义字体').replace(/[<>&]/g, '') + '</b>';
      }).catch(function () {});
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(buildUI, 600);
  setTimeout(buildUI, 1800);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="settings"]')) setTimeout(buildUI, 40);
  }, true);
})();

/* ============================================================
   6. 搜索
   ============================================================ */
(function findFeature() {
  'use strict';
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function plain(text) {
    return String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s*/gm, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function snippet(text, q) {
    var s = plain(text);
    if (!s) return '';
    var p = s.toLowerCase().indexOf(q);
    if (p < 0) return '';
    var from = Math.max(0, p - 22), to = Math.min(s.length, p + 62);
    return (from > 0 ? '…' : '') + s.slice(from, to) + (to < s.length ? '…' : '');
  }
  function jumpToMsg(i) {
    var box = document.getElementById('messages');
    if (!box) return;
    var el = box.querySelector('.msg[data-idx="' + i + '"]');
    if (!el) return;
    qa('.msg').forEach(function (x) { x.classList.remove('find-cur'); });
    el.classList.add('find-cur');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    catch (e) { el.scrollIntoView(); }
  }

  function build() {
    var inp = document.getElementById('find-input');
    var box = document.getElementById('find-list');
    var cnt = document.getElementById('find-count');
    if (!inp || !box) return;
    var q = String(inp.value || '').trim().toLowerCase();
    box.innerHTML = '';
    qa('.msg').forEach(function (x) { x.classList.remove('find-hit', 'find-cur'); });
    if (!q) { box.classList.add('hidden'); if (cnt) cnt.textContent = '0 条'; return; }

    var arr = (typeof messages !== 'undefined' && messages) ? messages : [];
    var hits = [];
    arr.forEach(function (m, i) {
      var c = (typeof m.content === 'string') ? m.content : '';
      if (!c || c.toLowerCase().indexOf(q) < 0) return;
      var sn = snippet(c, q);
      if (sn) hits.push({ i: i, role: m.role, sn: sn });
    });
    if (cnt) cnt.textContent = hits.length + ' 条';
    if (!hits.length) {
      box.innerHTML = '<div class="find-empty">没有匹配的消息</div>';
      box.classList.remove('hidden');
      return;
    }
    hits.slice(0, 150).forEach(function (h, n) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'find-row';
      row.innerHTML =
        '<span class="fr-n">' + (n + 1) + '</span>' +
        '<span class="fr-role' + (h.role === 'user' ? ' u' : '') + '">' + (h.role === 'user' ? '我' : 'AI') + '</span>' +
        '<span class="fr-txt">' + esc(h.sn) + '</span>';
      row.addEventListener('click', function () { jumpToMsg(h.i); });
      box.appendChild(row);
    });
    box.classList.remove('hidden');
  }

  function rebind() {
    var old = document.getElementById('find-input');
    var box = document.getElementById('find-list');
    if (!old || !box || old.dataset.f3 === '1') return false;
    var fresh = old.cloneNode(true);
    fresh.dataset.f3 = '1';
    try { fresh.removeAttribute('id'); } catch (e) {}
    fresh.id = 'find-input';
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('input', build);
    fresh.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        var b = document.getElementById('find-list');
        if (b) b.classList.add('hidden');
      }
    });
    return true;
  }

  rebind();
  setTimeout(rebind, 80);
  setTimeout(rebind, 500);
  setTimeout(rebind, 1500);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#btn-find')) {
      setTimeout(function () {
        rebind();
        var inp = document.getElementById('find-input');
        if (inp) { try { inp.focus(); inp.select(); } catch (e2) {} }
        build();
      }, 30);
    }
  }, true);
})();

/* ============================================================
   7. 分支对话
   ============================================================ */
(function branchFeature() {
  'use strict';
  if (typeof renderMsg !== 'function' || typeof runAssistant !== 'function') return;

  function say(msg, ms) {
    try { if (typeof toast === 'function') toast(msg, ms || 3200); } catch (e) {}
  }
  function snap(m) {
    var o = {
      content: m.content, reasoning: m.reasoning, thinkSecs: m.thinkSecs,
      usage: m.usage, model: m.model, time: m.time,
    };
    try { o.parts = m.parts ? JSON.parse(JSON.stringify(m.parts)) : undefined; }
    catch (e) { o.parts = m.parts; }
    return o;
  }
  function ensureVariants(m) {
    if (!m.variants || !m.variants.length) { m.variants = [snap(m)]; m.vIdx = 0; }
    if (typeof m.vIdx !== 'number' || m.vIdx < 0 || m.vIdx >= m.variants.length) {
      m.vIdx = m.variants.length - 1;
    }
    return m.variants;
  }
  function switchVariant(idx, vi) {
    var m = (typeof messages !== 'undefined' && messages) ? messages[idx] : null;
    if (!m || !m.variants || vi < 0 || vi >= m.variants.length || vi === m.vIdx) return;
    m.vIdx = vi;
    var v = m.variants[vi];
    m.content = v.content; m.parts = v.parts; m.reasoning = v.reasoning;
    m.thinkSecs = v.thinkSecs; m.usage = v.usage; m.model = v.model; m.time = v.time;
    try { if (typeof saveMessages === 'function') saveMessages(); } catch (e) {}
    var el = document.querySelector('#messages .msg[data-idx="' + idx + '"]');
    if (el) { try { el.replaceWith(renderMsg(m, idx)); } catch (e) {} }
    else if (typeof renderMessages === 'function') { try { renderMessages(); } catch (e) {} }
  }
  window.__branchSwitch = switchVariant;

  function injectBranchUI(el, msg, idx) {
    if (!el || !msg || msg.role !== 'assistant') return el;
    var vs = msg.variants;
    if (!vs || vs.length < 2 || el.querySelector('.msg-branch')) return el;
    var meta = el.querySelector('.msg-meta');
    if (!meta || !meta.parentNode) return el;
    var i = (typeof msg.vIdx === 'number') ? msg.vIdx : (vs.length - 1);
    var bar = document.createElement('div');
    bar.className = 'msg-branch';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.textContent = '‹'; prev.title = '上一版';
    prev.disabled = i <= 0;
    prev.onclick = function (e) { e.stopPropagation(); switchVariant(idx, i - 1); };
    var num = document.createElement('span');
    num.className = 'br-n'; num.textContent = (i + 1) + ' / ' + vs.length;
    var next = document.createElement('button');
    next.type = 'button'; next.textContent = '›'; next.title = '下一版';
    next.disabled = i >= vs.length - 1;
    next.onclick = function (e) { e.stopPropagation(); switchVariant(idx, i + 1); };
    var tag = document.createElement('span');
    tag.className = 'br-tag'; tag.textContent = '分支';
    bar.appendChild(prev); bar.appendChild(num); bar.appendChild(next); bar.appendChild(tag);
    meta.parentNode.insertBefore(bar, meta);
    return el;
  }

  var _origRenderMsg = renderMsg;
  var _newRenderMsg = function (msg, idx) {
    var el = _origRenderMsg(msg, idx);
    try { injectBranchUI(el, msg, idx); } catch (e) {}
    return el;
  };
  try { renderMsg = _newRenderMsg; } catch (e) {}
  try { window.renderMsg = _newRenderMsg; } catch (e) {}

  if (typeof renderMessages === 'function') {
    var _origRM = renderMessages;
    var _newRM = function (newIdx) {
      _origRM(newIdx);
      try {
        var nodes = document.querySelectorAll('#messages .msg');
        Array.prototype.forEach.call(nodes, function (el) {
          var i = Number(el.dataset.idx);
          var m = messages[i];
          if (!m || m.role !== 'assistant') return;
          if (!m.variants || m.variants.length < 2) return;
          if (el.querySelector('.msg-branch')) return;
          injectBranchUI(el, m, i);
        });
      } catch (e) {}
    };
    try { renderMessages = _newRM; } catch (e) {}
    try { window.renderMessages = _newRM; } catch (e) {}
  }

  var pendingRegen = null;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest('.msg-actions button[data-act="regen"]');
    if (!btn) return;
    var msgEl = btn.closest('.msg');
    if (!msgEl || msgEl.dataset.idx === undefined) return;
    var idx = Number(msgEl.dataset.idx);
    var m = messages[idx];
    if (!m || m.role !== 'assistant') return;
    try {
      var vs = ensureVariants(m);
      pendingRegen = {
        idx: idx, content: m.content, partsLen: (m.parts || []).length,
        variants: vs.slice(), vIdx: m.vIdx, ts: Date.now(),
      };
    } catch (err) {}
  }, true);

  var _origRA = runAssistant;
  var _newRA = async function () {
    var pr = pendingRegen;
    pendingRegen = null;
    if (pr && Date.now() - pr.ts > 120000) pr = null;
    var r = await _origRA();
    if (!pr) return r;
    var li = messages.length - 1;
    var last = messages[li];
    if (!last || last.role !== 'assistant') return r;
    if (typeof last.content !== 'string' || !last.content.trim()) return r;
    if (last.content === pr.content && (last.parts || []).length === pr.partsLen) return r;
    var variants = pr.variants.slice();
    variants.push(snap(last));
    last.variants = variants;
    last.vIdx = variants.length - 1;
    try { if (typeof saveMessages === 'function') saveMessages(); } catch (e) {}
    var el = document.querySelector('#messages .msg[data-idx="' + li + '"]');
    if (el) { try { el.replaceWith(renderMsg(last, li)); } catch (e) {} }
    say('已保留上一版，点 ‹ › 可切换', 3600);
    return r;
  };
  try { runAssistant = _newRA; } catch (e) {}
  try { window.runAssistant = _newRA; } catch (e) {}

  setTimeout(function () {
    try {
      var nodes = document.querySelectorAll('#messages .msg');
      Array.prototype.forEach.call(nodes, function (el) {
        var i = Number(el.dataset.idx);
        var m = messages[i];
        if (!m || m.role !== 'assistant') return;
        if (!m.variants || m.variants.length < 2) return;
        injectBranchUI(el, m, i);
      });
    } catch (e) {}
  }, 400);
})();

/* ============================================================
   8/9. 公式 + 图表
   ============================================================ */
(function mathAndMermaid() {
  'use strict';
  var _loading = {};
  function loadJS(src) {
    if (_loading[src]) return _loading[src];
    _loading[src] = new Promise(function (res, rej) {
      var ex = document.querySelector('script[src="' + src + '"]');
      if (ex) {
        if (ex.dataset.pok === '1') return res();
        ex.addEventListener('load', function () { ex.dataset.pok = '1'; res(); });
        ex.addEventListener('error', function () { rej(new Error('fail')); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { s.dataset.pok = '1'; res(); };
      s.onerror = function () { rej(new Error('fail')); };
      document.head.appendChild(s);
    });
    return _loading[src];
  }
  function loadCSS(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }

  var KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  var KATEX_JS = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
  var KATEX_AR = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
  var katexReady = false;

  loadCSS(KATEX_CSS);
  Promise.all([loadJS(KATEX_JS), loadJS(KATEX_AR)])
    .then(function () {
      katexReady = typeof window.renderMathInElement === 'function';
      if (katexReady) renderAllMath();
    }).catch(function () {});

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
        renderMath(el); el.dataset.mathDone = '1';
      });
    } catch (e) {}
  }

  if (typeof textEl === 'function') {
    var _origTextEl = textEl;
    var _newTextEl = function (text) {
      var el = _origTextEl(text);
      if (katexReady) { try { renderMath(el); el.dataset.mathDone = '1'; } catch (e) {} }
      return el;
    };
    try { textEl = _newTextEl; } catch (e) {}
    try { window.textEl = _newTextEl; } catch (e) {}
  }

  var MERMAID_JS = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
  var mermaidReady = false;

  function initMermaid() {
    if (mermaidReady) return true;
    if (typeof window.mermaid === 'undefined') return false;
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose', fontFamily: 'inherit',
      });
      mermaidReady = true;
      return true;
    } catch (e) { return false; }
  }
  function isMermaidFile(p) {
    if (!p) return false;
    var n = String(p.name || '').toLowerCase();
    if (n.slice(-8) === '.mermaid' || n.slice(-4) === '.mmd') return true;
    return String(p.label || '').toUpperCase().indexOf('MERMAID') >= 0;
  }
  var mmdSeq = 0;
  function mermaidEl(p) {
    var d = document.createElement('div');
    d.className = 'mermaid-wrap';
    d.innerHTML = '<div class="mermaid-loading">正在画图…</div>';
    (async function () {
      var f = null;
      try { f = await dbGet(p.fileId); } catch (e) {}
      if (!f) { d.innerHTML = '<div class="mermaid-err">图表内容找不到了</div>'; return; }
      if (!mermaidReady) { try { await loadJS(MERMAID_JS); initMermaid(); } catch (e) {} }
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
        b1.type = 'button'; b1.textContent = '看代码';
        b1.onclick = function (ev) { ev.stopPropagation(); try { openPreview(p.fileId); } catch (e) {} };
        var b2 = document.createElement('button');
        b2.type = 'button'; b2.textContent = '下载 SVG';
        b2.onclick = function (ev) {
          ev.stopPropagation();
          var svg = d.querySelector('svg');
          if (!svg) return;
          var blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = String(p.name || 'chart').replace(/\.[^.]+$/, '') + '.svg';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
        };
        bar.appendChild(b1); bar.appendChild(b2);
        d.appendChild(bar);
      } catch (e) {
        d.innerHTML = '<div class="mermaid-err">图没画出来：' +
          String((e && e.message) || e).replace(/[<>&]/g, '').slice(0, 160) + '</div>';
      }
    })();
    return d;
  }

  if (typeof fileEl === 'function') {
    var _origFileEl = fileEl;
    var _newFileEl = function (p) {
      if (isMermaidFile(p)) { try { return mermaidEl(p); } catch (e) {} }
      return _origFileEl(p);
    };
    try { fileEl = _newFileEl; } catch (e) {}
    try { window.fileEl = _newFileEl; } catch (e) {}
  }
})();

/* ============================================================
   10. 引用回复
   ============================================================ */
(function quoteFeature() {
  'use strict';
  var pendingQuote = null;

  function renderQuoteBar() {
    var bar = document.getElementById('quote-bar');
    if (!pendingQuote) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'quote-bar';
      var composer = document.getElementById('composer');
      var editBar = document.getElementById('edit-bar');
      if (composer) composer.insertBefore(bar, editBar ? editBar.nextSibling : composer.firstChild);
    }
    bar.innerHTML = '';
    var tag = document.createElement('span');
    tag.className = 'qb-tag';
    tag.textContent = '引用 ' + (pendingQuote.role === 'user' ? '我' : 'AI');
    var pre = document.createElement('span');
    pre.className = 'qb-pre';
    pre.textContent = String(pendingQuote.text || '').replace(/\s+/g, ' ').slice(0, 80);
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'qb-x'; x.textContent = '×';
    x.onclick = function (e) { e.stopPropagation(); pendingQuote = null; renderQuoteBar(); };
    bar.appendChild(tag); bar.appendChild(pre); bar.appendChild(x);
  }

  function quoteFrom(idx) {
    var m = (typeof messages !== 'undefined' && messages) ? messages[idx] : null;
    if (!m) return;
    var text = typeof m.content === 'string' ? m.content : '';
    if (!text.trim()) {
      var parts = m.parts || [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'text' && parts[i].text) { text = parts[i].text; break; }
      }
    }
    if (!text.trim()) { try { toast('这条没有可引用的文字'); } catch (e) {} return; }
    pendingQuote = { role: m.role, text: text.slice(0, 240) };
    renderQuoteBar();
    try { document.getElementById('input').focus(); } catch (e) {}
  }

  function patchQuoteButtons() {
    try {
      var acts = document.querySelectorAll('#messages .msg-actions');
      Array.prototype.forEach.call(acts, function (box) {
        if (box.querySelector('[data-act="quote"]')) return;
        var b = document.createElement('button');
        b.dataset.act = 'quote';
        b.title = '引用这条';
        b.innerHTML = '<svg class="ic"><use href="#i-chat"/></svg>';
        box.insertBefore(b, box.firstChild);
      });
    } catch (e) {}
  }
  window.__patchQuoteButtons = patchQuoteButtons;

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest('.msg-actions button[data-act="quote"]');
    if (!btn) return;
    e.stopPropagation(); e.preventDefault();
    var el = btn.closest('.msg');
    if (!el || el.dataset.idx === undefined) return;
    quoteFrom(Number(el.dataset.idx));
  }, true);

  if (typeof renderMsg === 'function') {
    var _prev = renderMsg;
    var _new = function (msg, idx) {
      var el = _prev(msg, idx);
      try {
        if (!el || !msg) return el;
        var acts = el.querySelector('.msg-actions');
        if (acts && !acts.querySelector('[data-act="quote"]')) {
          var b = document.createElement('button');
          b.dataset.act = 'quote';
          b.title = '引用这条';
          b.innerHTML = '<svg class="ic"><use href="#i-chat"/></svg>';
          acts.insertBefore(b, acts.firstChild);
        }
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
            qb.appendChild(who); qb.appendChild(tx);
            bub.insertBefore(qb, bub.firstChild);
          }
        }
      } catch (e) {}
      return el;
    };
    try { renderMsg = _new; } catch (e) {}
    try { window.renderMsg = _new; } catch (e) {}
  }

  (function watch() {
    var box = document.getElementById('messages');
    patchQuoteButtons();
    setTimeout(patchQuoteButtons, 300);
    setTimeout(patchQuoteButtons, 1200);
    if (!box || typeof MutationObserver === 'undefined') return;
    var tmr = 0;
    var mo = new MutationObserver(function () {
      if (tmr) return;
      tmr = setTimeout(function () { tmr = 0; patchQuoteButtons(); }, 120);
    });
    try { mo.observe(box, { childList: true, subtree: true }); } catch (e) {}
  })();

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

  if (typeof send === 'function') {
    var _origSend = send;
    var _newSend = async function () {
      if (typeof streaming !== 'undefined' && streaming) return _origSend();
      if (!pendingQuote) return _origSend();
      var q = pendingQuote;
      var arr = (typeof messages !== 'undefined' && messages) ? messages : null;
      if (!arr) return _origSend();
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
      try { return await _origSend(); }
      finally { if (arr.push === patched) arr.push = origPush; }
    };
    try { send = _newSend; } catch (e) {}
    try { window.send = _newSend; } catch (e) {}
  }
})();

/* ============================================================
   11. 气泡自定义
   ============================================================ */
(function bubbleStyle() {
  'use strict';
  function applyBubble() {
    try {
      document.documentElement.style.setProperty('--bubble-max', (localStorage.getItem('aih.bubbleMax') || '680') + 'px');
      document.documentElement.style.setProperty('--bubble-radius', (localStorage.getItem('aih.bubbleRadius') || '20') + 'px');
    } catch (e) {}
  }
  applyBubble();

  function buildUI() {
    var body = document.querySelector('#page-settings .page-body');
    if (!body || document.getElementById('bubble-field')) return !!body;
    var sec = document.createElement('section');
    sec.className = 'field';
    sec.id = 'bubble-field';
    sec.innerHTML = [
      '<label>气泡样式</label>',
      '<div class="bs-row"><span class="bs-lb">宽度</span><input type="range" id="bs-max" min="380" max="920" step="20" /><span class="bs-v" id="bs-max-v">680px</span></div>',
      '<div class="bs-row"><span class="bs-lb">圆角</span><input type="range" id="bs-radius" min="0" max="28" step="1" /><span class="bs-v" id="bs-radius-v">20px</span></div>',
    ].join('\n');
    var anchor = body.lastElementChild;
    if (anchor && anchor.classList && anchor.classList.contains('row')) body.insertBefore(sec, anchor);
    else body.appendChild(sec);

    var rMax = sec.querySelector('#bs-max'), rRad = sec.querySelector('#bs-radius');
    var vMax = sec.querySelector('#bs-max-v'), vRad = sec.querySelector('#bs-radius-v');
    function sync() {
      var m = localStorage.getItem('aih.bubbleMax') || '680';
      var r = localStorage.getItem('aih.bubbleRadius') || '20';
      rMax.value = m; rRad.value = r;
      vMax.textContent = m + 'px'; vRad.textContent = r + 'px';
    }
    sync();
    rMax.addEventListener('input', function () {
      localStorage.setItem('aih.bubbleMax', rMax.value);
      vMax.textContent = rMax.value + 'px'; applyBubble();
    });
    rRad.addEventListener('input', function () {
      localStorage.setItem('aih.bubbleRadius', rRad.value);
      vRad.textContent = rRad.value + 'px'; applyBubble();
    });
    return true;
  }
  buildUI();
  setTimeout(buildUI, 700);
  setTimeout(buildUI, 2000);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="settings"]')) setTimeout(buildUI, 40);
  }, true);
})();

/* ============================================================
   12. 上下文指示环
   ============================================================ */
(function ctxRing() {
  'use strict';
  var CTX_LIMIT = 1000000;

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

  function ensureRing() {
    var btn = document.getElementById('btn-attach');
    if (!btn) return null;
    var ring = document.getElementById('ctx-ring');
    if (!ring) {
      ring = document.createElement('span');
      ring.id = 'ctx-ring';
      try { btn.appendChild(ring); } catch (e) { return null; }
    }
    return ring;
  }

  function update() {
    try {
      var btn = document.getElementById('btn-attach');
      var ring = ensureRing();
      if (!ring || !btn) return;
      var t = estimateTokens();
      var pct = Math.min(100, (t / CTX_LIMIT) * 100);
      var color = pct >= 82 ? '#CE5B5B' : (pct >= 55 ? '#DBA23F' : 'var(--acc)');
      var deg = Math.max(0, Math.min(360, pct * 3.6));
      ring.style.background = 'conic-gradient(' + color + ' ' + deg + 'deg, transparent ' + deg + 'deg)';
      ring.classList.toggle('on', pct > 1.5);
      var shown = t >= 10000 ? ((t / 10000).toFixed(1).replace(/\.0$/, '') + ' 万') : t.toLocaleString('en-US');
      btn.title = '添加附件 · 上下文约 ' + shown + ' tokens（' + pct.toFixed(1) + '% / 1M）';
    } catch (e) {}
  }
  window.__ctxUpdate = update;

  try {
    var old = document.getElementById('ctx-bar');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  } catch (e) {}

  if (typeof renderMessages === 'function') {
    var _origRM = renderMessages;
    var _newRM = function (i) {
      _origRM(i);
      setTimeout(update, 30);
    };
    try { renderMessages = _newRM; } catch (e) {}
    try { window.renderMessages = _newRM; } catch (e) {}
  }

  update();
  setTimeout(update, 300);
  setTimeout(update, 1200);
})();

/* ============================================================
   13. AI 自动起标题
   ============================================================ */
(function autoTitle() {
  'use strict';
  var titling = false;

  async function maybeAutoTitle() {
    if (titling) return;
    var s = null;
    try { s = (typeof currentSession === 'function') ? currentSession() : null; } catch (e) {}
    if (!s || s.titled || s.autoTitled) return;

    var arr = (typeof messages !== 'undefined' && messages) ? messages : [];
    if (arr.length < 2) return;

    var fu = null, fa = null;
    for (var i = 0; i < arr.length; i++) {
      if (!fu && arr[i].role === 'user' && arr[i].content) fu = arr[i];
      if (!fa && arr[i].role === 'assistant' && arr[i].content) fa = arr[i];
      if (fu && fa) break;
    }
    if (!fu || !fa) return;

    var p = null;
    try { p = (typeof activeProvider === 'function') ? activeProvider() : null; } catch (e) {}
    if (!p || !p.base || !p.key) return;

    titling = true;
    try {
      var q = '请给下面这段对话起一个简短标题：不超过 12 个字，只输出标题本身，不要引号、不要句号、不要任何解释。\n\n' +
        '用户：' + String(fu.content || '').replace(/\s+/g, ' ').slice(0, 220) + '\n' +
        'AI：' + String(fa.content || '').replace(/\s+/g, ' ').slice(0, 320);
      var res = await fetch(p.base.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
        body: JSON.stringify({
          model: p.model, stream: false, temperature: 0.3, max_tokens: 48,
          messages: [{ role: 'user', content: q }],
        }),
      });
      if (!res.ok) return;
      var j = await res.json();
      var t = '';
      try { t = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; } catch (e) {}
      t = String(t).trim().replace(/^["'「『]+|["'」』]+$/g, '').replace(/[。！？.!?]+$/g, '').trim().slice(0, 24);
      if (!t) return;
      if (s.title === t) { s.autoTitled = true; return; }
      s.title = t; s.autoTitled = true;
      try { LS.sessions = sessions; } catch (e) {}
      try {
        var search = document.getElementById('conv-search');
        if (typeof renderConvList === 'function') renderConvList(search ? search.value : '');
      } catch (e) {}
    } catch (e) {} finally { titling = false; }
  }
  window.__maybeAutoTitle = maybeAutoTitle;

  if (typeof runAssistant === 'function') {
    var _prev = runAssistant;
    var _new = async function () {
      var r = await _prev();
      setTimeout(function () { maybeAutoTitle(); }, 350);
      return r;
    };
    try { runAssistant = _new; } catch (e) {}
    try { window.runAssistant = _new; } catch (e) {}
  }
})();

/* ============================================================
   14. 角色卡详情：顶部分类标签（人设 / 世界书 / 正则）
   ============================================================ */
(function cardTabs() {
  'use strict';

  var TABS = [
    { key: 'profile', label: '人设' },
    { key: 'book',    label: '世界书' },
    { key: 'regex',   label: '正则' },
  ];
  var cur = 'profile';

  function classify(sec) {
    var h3 = sec.querySelector('h3');
    var t = h3 ? String(h3.textContent || '') : '';
    if (t.indexOf('世界书') >= 0) return 'book';
    if (t.indexOf('正则') >= 0) return 'regex';
    return 'profile';
  }

  function applyTab(body) {
    var secs = body.querySelectorAll('.cv-sec');
    Array.prototype.forEach.call(secs, function (sec) {
      sec.style.display = (sec.dataset.cvTab === cur) ? '' : 'none';
    });
  }

  function highlight(bar) {
    Array.prototype.forEach.call(bar.querySelectorAll('.cv-tab'), function (b) {
      b.classList.toggle('on', b.dataset.tab === cur);
    });
  }

  function build(body) {
    var secs = body.querySelectorAll('.cv-sec');
    if (!secs.length) return;

    var counts = { profile: 0, book: 0, regex: 0 };
    Array.prototype.forEach.call(secs, function (sec) {
      var k = classify(sec);
      sec.dataset.cvTab = k;
      counts[k]++;
    });

    if (!counts[cur]) {
      for (var i = 0; i < TABS.length; i++) {
        if (counts[TABS[i].key]) { cur = TABS[i].key; break; }
      }
    }

    var bar = body.querySelector('.cv-tabs');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'cv-tabs';
      body.insertBefore(bar, body.firstChild);
    }
    bar.innerHTML = '';
    TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.tab = t.key;
      b.className = 'cv-tab' + (t.key === cur ? ' on' : '') + (counts[t.key] ? '' : ' is-empty');
      b.innerHTML = t.label + (counts[t.key] ? '<span class="cv-tab-n">' + counts[t.key] + '</span>' : '');
      b.onclick = function (e) {
        e.stopPropagation();
        if (!counts[t.key]) return;
        cur = t.key;
        applyTab(body);
        highlight(bar);
        try {
          var sb = body.closest('.sheet-body') || body;
          sb.scrollTop = 0;
        } catch (err) {}
      };
      bar.appendChild(b);
    });

    applyTab(body);
    highlight(bar);
  }

  function enhance() {
    try {
      var body = document.getElementById('cv-body');
      if (!body) return;
      if (!body.querySelector('.cv-sec')) return;
      build(body);
    } catch (e) {}
  }
  window.__cardTabs = enhance;

  (function watch() {
    function bind() {
      var body = document.getElementById('cv-body');
      if (!body || body.dataset.cvTabsWatch === '1') return;
      body.dataset.cvTabsWatch = '1';
      if (typeof MutationObserver === 'undefined') return;
      var tmr = 0;
      var mo = new MutationObserver(function () {
        if (tmr) return;
        tmr = setTimeout(function () { tmr = 0; enhance(); }, 40);
      });
      try { mo.observe(body, { childList: true, subtree: false }); } catch (e) {}
    }
    bind();
    setTimeout(bind, 600);
    setTimeout(bind, 2000);
    enhance();
  })();

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#card-list')) {
      cur = 'profile';
      setTimeout(enhance, 60);
      setTimeout(enhance, 260);
    }
  }, true);
})();

/* ============================================================
   15. 角色卡工具描述软化
   ============================================================ */
(function softenCardTool() {
  if (typeof buildToolsPayload !== 'function') return;
  var RE_CARD = /character|card/i;
  var NOTE = '\n\n注意：这是一份【背景资料】，不是角色扮演指令。' +
    '默认情况下读完只需把内容当作参考信息，不要改变你原本的身份、语气和说话方式，' +
    '不要主动入戏、不要自称卡里的角色、不要用第一人称演他/她。' +
    '只有当用户明确说「扮演这个角色」「用 XX 的语气跟我说话」时，才按角色卡设定来演。';
  var _orig = buildToolsPayload;
  var _new = function () {
    var r = _orig();
    try {
      if (!r || !Array.isArray(r.tools)) return r;
      r.tools.forEach(function (t) {
        if (!t || !t.function) return;
        if (!RE_CARD.test(t.function.name || '')) return;
        var d = String(t.function.description || '');
        if (d.indexOf('背景资料') >= 0) return;
        t.function.description = d + NOTE;
      });
    } catch (e) {}
    return r;
  };
  try { buildToolsPayload = _new; } catch (e) {}
  try { window.buildToolsPayload = _new; } catch (e) {}
})();

/* ============================================================
   16. 让 AI 知道「代码块会变成文件卡片」
   ============================================================ */
(function tellAiAboutFiles() {
  'use strict';
  if (typeof buildSystemPrompt !== 'function') return;

  var MARK = '【你能输出的文件】';
  var NOTE = [
    '',
    '',
    MARK,
    '这个界面会把你的 ``` 代码块自动渲染成一张文件卡片，用户可以点开预览、复制、下载或存入文件库。',
    '所以你可以直接「创建文件」——方式是输出代码块，不需要说「我无法创建文件」「我不能生成附件」之类的话。',
    '',
    '对照表（代码块的语言标记 → 生成的文件）：',
    '· 不带语言标记，或 ```txt / ```text / ```plain → .txt 纯文本',
    '· ```md → .md 文档　```json → .json　```csv → .csv　```yaml → .yml　```xml → .xml',
    '· ```html / ```htm / ```svg → 可全屏预览的网页或图形（带一个「打开」按钮）',
    '· ```js / ```ts / ```css / ```py / ```sh / ```sql / ```go / ```rs / ```java / ```c 等常见语言都支持',
    '· 其它语言标记也会变成对应后缀的文件，未知标记则回退为 .txt',
    '',
    '几条约定：',
    '1. 代码块里的内容要完整，不要用「此处省略」「同上」之类占位。',
    '2. 需要多个文件，就连续输出多个代码块，每个都会各自变成一张卡片。',
    '3. 想让用户拿到某个文件，直接把内容放进代码块即可，不用额外说明机制。',
    '4. 只有用户明确要「在对话里直接看」的内容（例如短提示、一句命令），才用行内 `代码` 或普通文字。',
  ].join('\n');

  var _orig = buildSystemPrompt;
  var _new = function () {
    var s = _orig();
    if (typeof s !== 'string') return s;
    if (s.indexOf(MARK) >= 0) return s;
    return s + NOTE;
  };
  try { buildSystemPrompt = _new; } catch (e) {}
  try { window.buildSystemPrompt = _new; } catch (e) {}
})();

/* ============================================================
   17. 网页搜索（Tavily，不走 MCP）
   ============================================================ */
(function webSearchFeature() {
  'use strict';

  var K_KEY = 'aih.websearch.key';
  var K_PROXY = 'aih.websearch.proxy';
  var K_ON = 'aih.websearch.enabled';
  var API = 'https://api.tavily.com/search';
  var MARK = '【联网搜索】';

  function say(msg, ms) {
    try { if (typeof toast === 'function') toast(msg, ms || 3600); } catch (e) {}
  }
  function getKey() { try { return (localStorage.getItem(K_KEY) || '').trim(); } catch (e) { return ''; } }
  function getProxy() { try { return (localStorage.getItem(K_PROXY) || '').trim(); } catch (e) { return ''; } }

  function isWebSearchOn() {
    try {
      var v = localStorage.getItem(K_ON);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch (e) {}
    try {
      var s = (typeof currentSession === 'function') ? currentSession() : null;
      var p = (s && s.persona) || (typeof LS !== 'undefined' && LS.persona) || {};
      if (p.allowWebSearch) {
        try { localStorage.setItem(K_ON, '1'); } catch (e0) {}
        return true;
      }
    } catch (e2) {}
    return false;
  }
  function setWebSearchOn(on) {
    on = !!on;
    try { localStorage.setItem(K_ON, on ? '1' : '0'); } catch (e) {}
    try {
      if (typeof setPersonaFlag === 'function') setPersonaFlag('allowWebSearch', on);
    } catch (e2) {}
  }
  window.__wsIsOn = isWebSearchOn;
  window.__wsSetOn = setWebSearchOn;

  async function searchRaw(args, key, proxy) {
    var q = String((args && (args.query || args.q || args.keyword)) || '').trim();
    if (!q) throw new Error('没有提供搜索关键词');
    var n = Number((args && args.max_results) || 5);
    if (!isFinite(n) || n < 1) n = 5;
    if (n > 10) n = 10;

    var url = API;
    if (proxy) url = proxy.replace(/\/+$/, '') + '/' + API;

    var res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
        },
        body: JSON.stringify({
          query: q,
          max_results: n,
          search_depth: 'basic',
          include_answer: false,
          include_raw_content: false,
          include_images: false,
        }),
      });
    } catch (e) {
      throw new Error('请求发不出去（多半是浏览器跨域被拦）—— 试试在设置里填一个代理前缀');
    }

    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e2) {}
      var hint = res.status === 401 ? '（Key 不对？）' : (res.status === 429 ? '（额度用完了？）' : '');
      throw new Error('HTTP ' + res.status + hint + ' ' + String(t).slice(0, 140));
    }

    var j = null;
    try { j = await res.json(); } catch (e3) { throw new Error('返回的不是 JSON'); }
    return { query: q, results: (j && j.results) || [], answer: (j && j.answer) || '' };
  }

  async function doWebSearch(args) {
    var key = getKey();
    if (!key) return '（还没配置 Tavily API Key，请让用户在「设置 → 网页搜索」里填写）';
    try {
      var r = await searchRaw(args, key, getProxy());
      if (!r.results.length) return '没有找到「' + r.query + '」的相关结果。';
      var lines = ['搜索「' + r.query + '」找到 ' + r.results.length + ' 条：', ''];
      r.results.forEach(function (x, i) {
        var s = '[' + (i + 1) + '] ' + (x.title || '(无标题)');
        if (x.url) s += '\n' + x.url;
        if (x.content) s += '\n' + String(x.content).replace(/\s+/g, ' ').slice(0, 500);
        lines.push(s);
      });
      return lines.join('\n\n');
    } catch (e) {
      return '（搜索失败：' + ((e && e.message) || e) + '）';
    }
  }
  window.__webSearch = doWebSearch;

  if (typeof mcpCallTool === 'function' && !mcpCallTool.__wsPatched) {
    var _origCall = mcpCallTool;
    var _newCall = async function (server, name, args) {
      if (!server && name === 'web_search') return await doWebSearch(args);
      return _origCall(server, name, args);
    };
    _newCall.__wsPatched = true;
    try { mcpCallTool = _newCall; } catch (e) {}
    try { window.mcpCallTool = _newCall; } catch (e) {}
  }

  if (typeof sessionPersona === 'function' && !sessionPersona.__wsPatched) {
    var _origSP = sessionPersona;
    var _newSP = function () {
      var p = _origSP();
      try { p.allowWebSearch = isWebSearchOn(); }
      catch (e) { try { p.allowWebSearch = false; } catch (e2) {} }
      return p;
    };
    _newSP.__wsPatched = true;
    try { sessionPersona = _newSP; } catch (e) {}
    try { window.sessionPersona = _newSP; } catch (e) {}
  }

  if (typeof savePersona === 'function' && !savePersona.__wsPatched) {
    var _origSave = savePersona;
    var _newSave = function () {
      try { _origSave(); } catch (e) { throw e; }
      syncToggle();
      updateStatus();
    };
    _newSave.__wsPatched = true;
    try { savePersona = _newSave; } catch (e) {}
    try { window.savePersona = _newSave; } catch (e) {}
  }

  if (typeof resetPersona === 'function' && !resetPersona.__wsPatched) {
    var _origReset = resetPersona;
    var _newReset = function () {
      try { _origReset(); } catch (e) { throw e; }
      syncToggle();
      updateStatus();
    };
    _newReset.__wsPatched = true;
    try { resetPersona = _newReset; } catch (e) {}
    try { window.resetPersona = _newReset; } catch (e) {}
  }

  if (typeof openPersona === 'function' && !openPersona.__wsPatched) {
    var _origOpen = openPersona;
    var _newOpen = function () {
      _origOpen();
      syncToggle();
    };
    _newOpen.__wsPatched = true;
    try { openPersona = _newOpen; } catch (e) {}
    try { window.openPersona = _newOpen; } catch (e) {}
  }

  if (typeof buildToolsPayload === 'function' && !buildToolsPayload.__wsPatched) {
    var _origBTP = buildToolsPayload;
    var _newBTP = function () {
      var r = _origBTP();
      try {
        if (!r || !Array.isArray(r.tools) || !r.map) return r;
        if (!isWebSearchOn()) return r;
        if (r.tools.some(function (t) { return t && t.function && t.function.name === 'web_search'; })) return r;
        r.map['web_search'] = { builtin: 'websearch', toolName: 'web_search' };
        r.tools.push({
          type: 'function',
          function: {
            name: 'web_search',
            description: '联网搜索最新信息。当用户问新闻、实时数据、你不确定或超出知识范围的事，或者用户直接说「搜一下」「查一下」时使用。返回若干条带网址的结果摘要。',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: '搜索关键词，尽量具体，例如「2026年诺贝尔物理学奖」' },
                max_results: { type: 'integer', description: '返回结果条数，1 到 10，默认 5' },
              },
              required: ['query'],
            },
          },
        });
      } catch (e) {}
      return r;
    };
    _newBTP.__wsPatched = true;
    try { buildToolsPayload = _newBTP; } catch (e) {}
    try { window.buildToolsPayload = _newBTP; } catch (e) {}
  }

  if (typeof buildSystemPrompt === 'function' && !buildSystemPrompt.__wsPatched) {
    var _origBSP = buildSystemPrompt;
    var _newBSP = function () {
      var s = _origBSP();
      if (typeof s !== 'string') return s;
      if (!isWebSearchOn()) return s;
      if (s.indexOf(MARK) >= 0) return s;
      return s + [
        '',
        '',
        MARK,
        '你有一个 web_search 工具，可以联网搜索最新的网页信息。',
        '当用户问及新闻、实时数据、你不确定或知识范围之外的事情，或者明确说「搜一下」「查一下」「帮我查」时，直接调用它。',
        '',
        '重要：不要回答「我没有联网功能」「我无法访问网络」「我只是语言模型」——你是有这个工具的，直接调用即可。',
        '',
        '拿到结果后：',
        '· 把关键信息整理成通顺的回答，不要把原始结果直接倒出来',
        '· 在末尾附上你用到的来源网址',
        '· 如果结果互相矛盾或明显过时，如实告诉用户',
        '· 如果一次没搜到，可以换个关键词再搜一次',
      ].join('\n');
    };
    _newBSP.__wsPatched = true;
    try { buildSystemPrompt = _newBSP; } catch (e) {}
    try { window.buildSystemPrompt = _newBSP; } catch (e) {}
  }

  function syncToggle() {
    try {
      var btn = document.getElementById('pa-websearch');
      if (!btn) return;
      btn.classList.toggle('on', isWebSearchOn());
    } catch (e) {}
  }

  function injectPermRow() {
    var host = document.querySelector('#persona .perm-row');
    if (!host || !host.parentNode) return false;
    if (document.getElementById('pa-websearch')) { syncToggle(); return true; }

    var row = document.createElement('div');
    row.className = 'perm-row';
    row.innerHTML =
      '<div class="perm-meta">' +
        '<div class="perm-name">联网搜索</div>' +
        '<div class="perm-sub">开启后 AI 可以搜最新的网页信息（需要在设置里填 Tavily Key）</div>' +
      '</div>' +
      '<button id="pa-websearch" class="ti-toggle" title="开启 / 关闭"></button>';
    host.parentNode.appendChild(row);
    syncToggle();
    return true;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest('#pa-websearch');
    if (!btn) return;
    e.stopPropagation();
    var next = !isWebSearchOn();
    setWebSearchOn(next);
    btn.classList.toggle('on', next);
    say(next ? '已开启联网搜索' : '已关闭联网搜索');
    updateStatus();
  }, true);

  injectPermRow();
  setTimeout(injectPermRow, 300);
  setTimeout(injectPermRow, 1200);

  function rebindSave() {
    try {
      var b = document.getElementById('pa-save');
      if (b && b.dataset.wsRebound !== '1') {
        b.dataset.wsRebound = '1';
        b.onclick = savePersona;
      }
    } catch (e) {}
  }
  rebindSave();
  setTimeout(rebindSave, 300);
  setTimeout(rebindSave, 1200);

  function updateStatus() {
    try {
      var el = document.getElementById('ws-status');
      if (!el) return;
      var on = isWebSearchOn();
      var names = [];
      try {
        if (typeof buildToolsPayload === 'function') {
          var r = buildToolsPayload();
          (r && r.tools || []).forEach(function (t) {
            var nm = t && t.function && t.function.name;
            if (nm) names.push(nm);
          });
        }
      } catch (e2) {}
      var has = names.indexOf('web_search') >= 0;
      var out = '当前状态：' + (on ? '<b>已开启</b>' : '未开启（去 AI 人设里打开）');
      out += ' · 已注册工具 <b>' + names.length + '</b> 个';
      if (has) out += '，含 <b class="ok">web_search</b> ✅';
      else if (on) out += '，但 <b class="warn">没有 web_search</b> ⚠️';
      if (names.length && names.length <= 6) out += '<br>工具：' + names.join('、');
      el.innerHTML = out;
    } catch (e) {}
  }
  window.__wsStatus = updateStatus;

  function buildSearchUI() {
    var body = document.querySelector('#page-settings .page-body');
    if (!body) return false;
    if (document.getElementById('websearch-field')) { syncToggle(); updateStatus(); return true; }

    var sec = document.createElement('section');
    sec.className = 'field';
    sec.id = 'websearch-field';
    sec.innerHTML = [
      '<label>网页搜索 <span class="ws-badge">Tavily</span></label>',
      '<div class="ws-toggle-row">',
      '  <div class="ws-tg-meta">',
      '    <div class="ws-tg-name">开启联网搜索</div>',
      '    <div class="ws-tg-sub">打开后 AI 才会拿到搜索工具；这个开关独立保存，不会被人设覆盖</div>',
      '  </div>',
      '  <button type="button" id="ws-toggle" class="ti-toggle" title="开启 / 关闭"></button>',
      '</div>',
      '<div class="ws-inputs">',
      '  <input id="ws-key" type="password" placeholder="Tavily API Key，形如 tvly-…" />',
      '  <input id="ws-proxy" placeholder="可选：CORS 代理前缀（直连报跨域时再填）" />',
      '</div>',
      '<div class="ws-row">',
      '  <button type="button" class="ghost" id="ws-test">测试连接</button>',
      '  <button type="button" class="ghost" id="ws-clear">清空</button>',
      '</div>',
      '<div class="ws-status" id="ws-status">检查中…</div>',
      '<p class="ws-tip">去 tavily.com 免费注册就能拿到 Key（每月有免费额度）。<br>点「测试连接」会真发一次搜索请求；如果报「请求发不出去」，说明浏览器跨域被拦了，这时才需要在上面填代理前缀。</p>',
    ].join('\n');

    var toolList = document.getElementById('tool-list');
    var toolField = toolList ? toolList.closest('.field') : null;
    if (toolField && toolField.parentNode) {
      toolField.parentNode.insertBefore(sec, toolField.nextSibling);
    } else {
      var anchor = body.lastElementChild;
      if (anchor && anchor.classList && anchor.classList.contains('row')) body.insertBefore(sec, anchor);
      else body.appendChild(sec);
    }

    var keyEl = sec.querySelector('#ws-key');
    var proxyEl = sec.querySelector('#ws-proxy');
    var tgEl = sec.querySelector('#ws-toggle');
    keyEl.value = getKey();
    proxyEl.value = getProxy();
    tgEl.classList.toggle('on', isWebSearchOn());

    tgEl.addEventListener('click', function (e) {
      e.stopPropagation();
      var next = !isWebSearchOn();
      setWebSearchOn(next);
      tgEl.classList.toggle('on', next);
      syncToggle();
      say(next ? '已开启联网搜索' : '已关闭联网搜索');
      updateStatus();
    });

    keyEl.addEventListener('change', function () {
      try { localStorage.setItem(K_KEY, keyEl.value.trim()); } catch (e) {}
      say('Key 已保存');
      updateStatus();
    });
    proxyEl.addEventListener('change', function () {
      try { localStorage.setItem(K_PROXY, proxyEl.value.trim()); } catch (e) {}
      say('代理已保存');
    });

    sec.querySelector('#ws-test').addEventListener('click', async function () {
      var k = (keyEl.value || '').trim();
      var px = (proxyEl.value || '').trim();
      try { localStorage.setItem(K_KEY, k); } catch (e) {}
      try { localStorage.setItem(K_PROXY, px); } catch (e2) {}
      if (!k) { say('先填 Tavily API Key'); return; }
      say('正在测试…', 6000);
      try {
        var r = await searchRaw({ query: 'hello world', max_results: 1 }, k, px);
        say('连接成功！返回了 ' + r.results.length + ' 条结果', 4200);
      } catch (e3) {
        say('失败：' + ((e3 && e3.message) || e3), 7000);
      }
    });

    sec.querySelector('#ws-clear').addEventListener('click', function () {
      if (!confirm('清空 Tavily Key 和代理设置？')) return;
      try { localStorage.removeItem(K_KEY); } catch (e) {}
      try { localStorage.removeItem(K_PROXY); } catch (e2) {}
      keyEl.value = '';
      proxyEl.value = '';
      say('已清空');
      updateStatus();
    });

    updateStatus();
    return true;
  }

  buildSearchUI();
  setTimeout(buildSearchUI, 500);
  setTimeout(buildSearchUI, 1600);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="settings"]')) {
      setTimeout(buildSearchUI, 40);
      setTimeout(updateStatus, 120);
    }
  }, true);
})();

/* ============================================================
   18. 导航栏高度同步（配合磨砂）
   ============================================================ */
(function navFrost() {
  'use strict';

  function sync() {
    try {
      var root = document.documentElement;
      var tb = document.getElementById('topbar');
      var bb = document.getElementById('tabbar');
      if (tb) {
        var th = Math.round(tb.getBoundingClientRect().height);
        if (th > 0) root.style.setProperty('--nav-top', th + 'px');
      }
      if (bb) {
        var bh = Math.round(bb.getBoundingClientRect().height);
        if (bh > 0) root.style.setProperty('--nav-bot', bh + 'px');
      }
    } catch (e) {}
  }

  sync();
  setTimeout(sync, 60);
  setTimeout(sync, 300);
  setTimeout(sync, 1000);
  setTimeout(sync, 2200);

  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', function () { setTimeout(sync, 260); });

  if (typeof MutationObserver !== 'undefined') {
    try {
      var mo = new MutationObserver(function () {
        clearTimeout(mo._t);
        mo._t = setTimeout(sync, 80);
      });
      var tb = document.getElementById('topbar');
      var bb = document.getElementById('tabbar');
      if (tb) mo.observe(tb, { childList: true, subtree: true, attributes: true });
      if (bb) mo.observe(bb, { childList: true, subtree: true, attributes: true });
    } catch (e) {}
  }
})();

/* ============================================================
   19. 编辑 AI 消息（只替换内容，不重新生成、不动用户消息）
   ============================================================ */
(function editAssistantMsg() {
  'use strict';

  var editingIdx = null;

  function say(msg, ms) {
    try { if (typeof toast === 'function') toast(msg, ms || 3200); } catch (e) {}
  }

  function barEl() { return document.getElementById('edit-bar'); }
  function barTextEl() {
    var b = barEl();
    return b ? b.querySelector('span') : null;
  }

  function showBar() {
    try {
      var b = barEl();
      if (!b) return;
      b.classList.remove('hidden');
      var t = barTextEl();
      if (t) t.textContent = '编辑 AI 消息 · 改完点发送就替换，不会重新生成';
    } catch (e) {}
  }
  function hideBar() {
    try {
      var b = barEl();
      if (b) b.classList.add('hidden');
      var t = barTextEl();
      if (t) t.textContent = '编辑中 · 发送后将从这条重新生成';
    } catch (e) {}
  }

  function textOf(m) {
    if (!m) return '';
    var t = typeof m.content === 'string' ? m.content : '';
    if (t.trim()) return t;
    var parts = m.parts || [];
    return parts.filter(function (p) { return p && p.type === 'text'; })
      .map(function (p) { return p.text || ''; }).join('\n\n');
  }

  function start(idx) {
    if (typeof streaming !== 'undefined' && streaming) { say('生成中，先停止再操作'); return; }
    var m = (typeof messages !== 'undefined' && messages) ? messages[idx] : null;
    if (!m || m.role !== 'assistant') return;

    try { if (typeof cancelEdit === 'function') cancelEdit(); } catch (e) {}

    editingIdx = idx;
    try { if (typeof switchPage === 'function') switchPage('chat'); } catch (e1) {}

    var input = document.getElementById('input');
    if (input) {
      var txt = textOf(m);
      input.value = txt;
      try {
        if (typeof autoGrow === 'function') autoGrow();
        input.focus();
        input.setSelectionRange(txt.length, txt.length);
      } catch (e2) {}
    }
    showBar();
    say('改完点发送就行，不会重新生成', 3600);
  }

  function cancel() {
    editingIdx = null;
    hideBar();
  }

  function commit(newText) {
    var idx = editingIdx;
    editingIdx = null;
    hideBar();

    var m = (typeof messages !== 'undefined' && messages) ? messages[idx] : null;
    if (!m || m.role !== 'assistant') return false;

    m.content = newText;

    /* 保留文件卡片 / 工具卡片，只把文字部分换成新的 */
    var parts = m.parts || [];
    var keep = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] && parts[i].type !== 'text') keep.push(parts[i]);
    }
    m.parts = [{ type: 'text', text: newText }].concat(keep);

    try { if (typeof saveMessages === 'function') saveMessages(); } catch (e) {}

    try {
      var box = document.getElementById('messages');
      var el = box ? box.querySelector('.msg[data-idx="' + idx + '"]') : null;
      if (el && typeof renderMsg === 'function') el.replaceWith(renderMsg(m, idx));
      else if (typeof renderMessages === 'function') renderMessages();
    } catch (e2) {}

    say('已修改', 2600);
    return true;
  }

  window.__editAssistantStart = start;
  window.__editAssistantCancel = cancel;
  window.__editAssistantCommit = commit;
  window.__editAssistantActive = function () { return editingIdx; };

  /* ---------- 给 AI 消息加「编辑」按钮 ---------- */
  function addBtn(el, msg) {
    try {
      if (!el || !msg || msg.role !== 'assistant') return;
      var acts = el.querySelector('.msg-actions');
      if (!acts || acts.querySelector('[data-act="editai"]')) return;
      var b = document.createElement('button');
      b.dataset.act = 'editai';
      b.title = '编辑这条（只替换，不重新生成）';
      b.innerHTML = '<svg class="ic"><use href="#i-edit"/></svg>';
      var regen = acts.querySelector('[data-act="regen"]');
      if (regen) acts.insertBefore(b, regen);
      else acts.appendChild(b);
    } catch (e) {}
  }

  if (typeof renderMsg === 'function' && !renderMsg.__editAiPatched) {
    var _prev = renderMsg;
    var _new = function (msg, idx) {
      var el = _prev(msg, idx);
      try { addBtn(el, msg); } catch (e) {}
      return el;
    };
    _new.__editAiPatched = true;
    try { renderMsg = _new; } catch (e) {}
    try { window.renderMsg = _new; } catch (e) {}
  }

  /* ---------- 点击「编辑」 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest('.msg-actions button[data-act="editai"]');
    if (!btn) return;
    e.stopPropagation(); e.preventDefault();
    var el = btn.closest('.msg');
    if (!el || el.dataset.idx === undefined) return;
    start(Number(el.dataset.idx));
  }, true);

  /* ---------- 拦截 send ---------- */
  if (typeof send === 'function' && !send.__editAiPatched) {
    var _origSend = send;
    var _newSend = async function () {
      if (editingIdx === null || editingIdx === undefined) return _origSend();
      if (typeof streaming !== 'undefined' && streaming) return _origSend();

      var input = document.getElementById('input');
      var text = input ? String(input.value || '').trim() : '';
      if (!text) { say('内容不能为空'); return; }

      try { if (typeof cancelEdit === 'function') cancelEdit(); } catch (e) {}

      if (input) input.value = '';
      try { if (typeof autoGrow === 'function') autoGrow(); } catch (e2) {}

      commit(text);
    };
    _newSend.__editAiPatched = true;
    try { send = _newSend; } catch (e) {}
    try { window.send = _newSend; } catch (e) {}
  }

  /* ---------- 重绑「发送」按钮（原版绑的是旧 send） ---------- */
  function rebindSend() {
    try {
      var b = document.getElementById('btn-send');
      if (b && b.dataset.eaRebound !== '1') {
        b.dataset.eaRebound = '1';
        b.onclick = send;
      }
    } catch (e) {}
  }
  rebindSend();
  setTimeout(rebindSend, 300);
  setTimeout(rebindSend, 1200);

  /* ---------- 重绑「取消」按钮 ---------- */
  function rebindCancel() {
    try {
      var b = document.getElementById('edit-cancel');
      if (b && b.dataset.eaRebound !== '1') {
        b.dataset.eaRebound = '1';
        b.onclick = function () {
          try { if (typeof cancelEdit === 'function') cancelEdit(); } catch (e) {}
          if (editingIdx !== null) cancel();
        };
      }
    } catch (e) {}
  }
  rebindCancel();
  setTimeout(rebindCancel, 300);
  setTimeout(rebindCancel, 1200);

  /* ---------- 已有消息补按钮 ---------- */
  function patchAll() {
    try {
      var nodes = document.querySelectorAll('#messages .msg.assistant');
      Array.prototype.forEach.call(nodes, function (el) {
        var i = Number(el.dataset.idx);
        var m = (typeof messages !== 'undefined' && messages) ? messages[i] : null;
        addBtn(el, m);
      });
    } catch (e) {}
  }
  patchAll();
  setTimeout(patchAll, 300);
  setTimeout(patchAll, 1200);

  (function watch() {
    var box = document.getElementById('messages');
    if (!box || typeof MutationObserver === 'undefined') return;
    var tmr = 0;
    var mo = new MutationObserver(function () {
      if (tmr) return;
      tmr = setTimeout(function () { tmr = 0; patchAll(); }, 140);
    });
    try { mo.observe(box, { childList: true, subtree: false }); } catch (e) {}
  })();
})();

/* ============================================================
   20. 版本徽章
   ============================================================ */
(function bumpVer() {
  function set() {
    try {
      var el = document.querySelector('.ver');
      if (!el) return;
      el.textContent = 'v75';
    } catch (e) {}
  }
  set();
  setTimeout(set, 300);
  setTimeout(set, 1200);
  setTimeout(set, 3000);
})();
