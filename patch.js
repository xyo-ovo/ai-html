/* ============================================================
   patch.js —— 所有补丁合并版
   （原 card-fix + patch3~6 合并而成）

   v60 修：
     · 弹层高度改用 CSS height:fit-content（不靠 JS 算，浏览器自己收缩）
     · fitCardSheet 改用 body.scrollHeight 量内容（不再受 sheet 拉伸影响）
     · 版本徽章 v60
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

    /* ---- 角色卡详情：弹层高度 = 内容高度 ---- */
    '#card-view{align-items:center !important;justify-content:center !important}',
    '#card-view .sheet{',
    '  height:fit-content !important;',   /* ← 让浏览器按内容收缩 */
    '  max-height:88vh !important;',
    '  min-height:0 !important;',
    '  align-self:center !important;',   /* ← 拒绝 flex stretch */
    '  flex:0 0 auto !important;',       /* ← 不长大、不缩小 */
    '  display:flex !important;',
    '  flex-direction:column !important;',
    '  padding-bottom:0 !important;',
    '  margin-bottom:0 !important;',
    '  overflow:hidden !important;',
    '}',
    '#card-view .sheet-body{',
    '  flex:0 1 auto !important;',
    '  height:auto !important;',
    '  min-height:0 !important;',
    '  max-height:none !important;',
    '  padding-bottom:0 !important;',
    '  margin-bottom:0 !important;',
    '  -webkit-overflow-scrolling:touch;',
    '}',
    '#card-view .sheet-body > *:last-child,#card-view .cv-sec:last-child,#card-view .cv-sec:last-child > *:last-child,#card-view .cv-field:last-child,#card-view .cv-entry:last-child{margin-bottom:0 !important;padding-bottom:0 !important}',
    '#page-card .page-body > *:last-child{margin-bottom:0 !important}',

    /* ---- 章节折叠 ---- */
    '.cv-sec > h3{cursor:pointer;user-select:none;-webkit-user-select:none;position:relative;padding-left:15px}',
    '.cv-sec > h3::before{content:"";position:absolute;left:0;top:50%;width:0;height:0;border-left:5px solid currentColor;border-top:4px solid transparent;border-bottom:4px solid transparent;transform:translateY(-50%) rotate(90deg);transition:transform .2s cubic-bezier(.16,1,.3,1);opacity:.5}',
    '.cv-sec.folded > h3::before{transform:translateY(-50%) rotate(0deg)}',
    '.cv-sec.folded > *:not(h3){display:none !important}',
    '.cv-sec > h3 .cv-count{font-size:10.5px;font-weight:600;padding:1px 7px;border-radius:999px;background:var(--bg4);color:var(--fg3);margin-left:5px}',

    /* ---- 世界书 / 正则条目：书脊样式 ---- */
    '.cv-entry{border-radius:4px 14px 14px 4px !important;padding:12px 14px 12px 16px !important;background:var(--bg2) !important;border:1px solid var(--line2) !important;border-left:3px solid color-mix(in srgb,var(--acc) 55%,transparent) !important;margin-bottom:9px !important;transition:border-color .2s ease,background-color .2s ease !important}',
    '.cv-entry:hover{border-color:color-mix(in srgb,var(--acc) 35%,var(--line2)) !important;border-left-color:var(--acc) !important;background:color-mix(in srgb,var(--acc) 3.5%,var(--bg2)) !important}',
    '.cv-entry .eh{cursor:pointer;position:relative;padding-right:18px}',
    '.cv-entry .eh::after{content:"";position:absolute;right:2px;top:50%;width:0;height:0;border-left:4px solid currentColor;border-top:3.5px solid transparent;border-bottom:3.5px solid transparent;transform:translateY(-50%) rotate(90deg);transition:transform .2s ease;opacity:.4}',
    '.cv-entry.folded .eh::after{transform:translateY(-50%) rotate(0deg)}',
    '.cv-entry .ec{transition:max-height .28s cubic-bezier(.16,1,.3,1),opacity .2s ease,padding .22s ease;overflow:hidden}',
    '.cv-entry.folded .ec{max-height:0 !important;opacity:0;padding-top:0;padding-bottom:0;margin:0}',

    /* ---- 长字段折叠 ---- */
    '.cv-field pre.clamp{max-height:82px;overflow:hidden;position:relative;cursor:pointer}',
    '.cv-field pre.clamp::after{content:"";position:absolute;left:0;right:0;bottom:0;height:34px;background:linear-gradient(transparent,var(--bg3));pointer-events:none;border-radius:0 0 12px 12px}',
    '.cv-field pre.clamp::before{content:"点开看全部";position:absolute;right:10px;bottom:6px;font-size:10.5px;color:var(--acc);opacity:.9;z-index:1;font-family:var(--font-sans)}',

    /* ---- 输入区对齐 ---- */
    '.composer-inner{display:flex;align-items:center !important}',
    '.composer-inner > button,.composer-inner > .tool-btn{align-self:center !important;flex:0 0 auto;margin-top:0 !important;margin-bottom:0 !important}',
    '.composer-inner > textarea{align-self:center !important}',

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
   14. 角色卡详情：折叠 + 弹层高度（v60 重做）
   ============================================================ */
(function cardView() {
  'use strict';

  /* ------------------------------------------------------------
     弹层高度：直接用 body.scrollHeight 算内容高度，
     再用行内样式把 sheet 的 height 钉死（不依赖 CSS 优先级）
     ------------------------------------------------------------ */
  function fitCardSheet() {
    try {
      var overlay = document.getElementById('card-view');
      if (!overlay || overlay.classList.contains('hidden')) return;

      var sheet = overlay.querySelector('.sheet');
      var body = document.getElementById('cv-body');
      if (!sheet || !body) return;
      var head = sheet.querySelector('.sheet-head');

      var vh = window.innerHeight || document.documentElement.clientHeight || 800;
      var cap = Math.round(vh * 0.88);

      var headH = head ? head.offsetHeight : 0;
      var bodyH = body.scrollHeight;          /* 内容真实高度（不受拉伸影响） */
      var need = headH + bodyH;

      /* 先清掉之前写死的东西，避免累加 */
      sheet.style.removeProperty('height');
      sheet.style.removeProperty('min-height');
      sheet.style.removeProperty('max-height');

      /* 把 sheet 钉在「内容高度」，上限 88vh */
      var finalH = Math.min(need, cap);
      sheet.style.setProperty('height', finalH + 'px', 'important');
      sheet.style.setProperty('min-height', '0', 'important');
      sheet.style.setProperty('max-height', cap + 'px', 'important');
      sheet.style.setProperty('align-self', 'center', 'important');
      sheet.style.setProperty('flex', '0 0 auto', 'important');
      sheet.style.setProperty('padding-bottom', '0', 'important');
      sheet.style.setProperty('margin-bottom', '0', 'important');

      if (need > cap) {
        body.style.setProperty('max-height', Math.max(0, cap - headH) + 'px', 'important');
        body.style.setProperty('overflow-y', 'auto', 'important');
      } else {
        body.style.setProperty('max-height', 'none', 'important');
        body.style.setProperty('overflow-y', 'visible', 'important');
      }
      body.style.setProperty('min-height', '0', 'important');
      body.style.setProperty('padding-bottom', '0', 'important');
      body.style.setProperty('margin-bottom', '0', 'important');

      /* 最后一项的尾巴切掉 */
      var kids = body.children;
      if (kids && kids.length) {
        var last = kids[kids.length - 1];
        if (last && last.style) {
          last.style.marginBottom = '0';
          last.style.paddingBottom = '0';
          var inner = last.lastElementChild;
          if (inner && inner.style) {
            inner.style.marginBottom = '0';
            inner.style.paddingBottom = '0';
          }
        }
      }
    } catch (e) {}
  }
  window.__cardFit = fitCardSheet;

  function fitSoon() {
    fitCardSheet();
    requestAnimationFrame(fitCardSheet);
    setTimeout(fitCardSheet, 60);
    setTimeout(fitCardSheet, 200);
    setTimeout(fitCardSheet, 500);
  }
  window.__cardFitSoon = fitSoon;

  /* ------------------------------------------------------------
     折叠
     ------------------------------------------------------------ */
  function enhanceCardView() {
    try {
      var body = document.getElementById('cv-body');
      if (!body) return;

      var secs = body.querySelectorAll('.cv-sec');
      Array.prototype.forEach.call(secs, function (sec) {
        var h3 = sec.querySelector('h3');
        if (!h3 || h3.dataset.p6 === '1') return;
        h3.dataset.p6 = '1';

        var nAll = sec.querySelectorAll('.cv-field, .cv-entry').length;
        if (nAll > 0 && !h3.querySelector('.cv-count')) {
          var badge = document.createElement('span');
          badge.className = 'cv-count';
          badge.textContent = String(nAll);
          var btns = h3.querySelector('.cv-btns');
          if (btns) h3.insertBefore(badge, btns); else h3.appendChild(badge);
        }
        if (sec.querySelectorAll('.cv-entry').length > 4) sec.classList.add('folded');

        h3.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('.cv-btns')) return;
          sec.classList.toggle('folded');
          setTimeout(fitCardSheet, 220);
        });
      });

      var entries = body.querySelectorAll('.cv-entry');
      Array.prototype.forEach.call(entries, function (en) {
        if (en.dataset.p6 === '1') return;
        var eh = en.querySelector('.eh'), ec = en.querySelector('.ec');
        if (!eh || !ec) return;
        en.dataset.p6 = '1';
        if ((ec.textContent || '').trim().length < 90) return;
        en.classList.add('folded');
        eh.addEventListener('click', function (e) {
          e.stopPropagation();
          en.classList.toggle('folded');
          setTimeout(fitCardSheet, 320);
        });
      });

      var pres = body.querySelectorAll('.cv-field pre');
      Array.prototype.forEach.call(pres, function (pre) {
        if (pre.dataset.p6 === '1') return;
        pre.dataset.p6 = '1';
        if ((pre.textContent || '').trim().length < 200) return;
        pre.classList.add('clamp');
        pre.addEventListener('click', function () {
          pre.classList.toggle('clamp');
          setTimeout(fitCardSheet, 60);
        });
      });

      fitSoon();
    } catch (e) {}
  }
  window.__cardFold = enhanceCardView;

  (function watch() {
    function bind() {
      var body = document.getElementById('cv-body');
      if (!body || body.dataset.p6Watch === '1') return;
      body.dataset.p6Watch = '1';
      if (typeof MutationObserver === 'undefined') return;
      var tmr = 0;
      var mo = new MutationObserver(function () {
        if (tmr) return;
        tmr = setTimeout(function () { tmr = 0; enhanceCardView(); fitSoon(); }, 40);
      });
      try { mo.observe(body, { childList: true, subtree: false }); } catch (e) {}
    }
    bind();
    setTimeout(bind, 600);
    setTimeout(bind, 2000);

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#card-list')) {
        fitSoon();
        setTimeout(fitCardSheet, 700);
        setTimeout(fitCardSheet, 1100);
        setTimeout(enhanceCardView, 60);
        setTimeout(enhanceCardView, 260);
      }
    }, true);

    enhanceCardView();
    fitSoon();

    window.addEventListener('resize', function () { setTimeout(fitCardSheet, 80); }, { passive: true });

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('[data-close="card-view"]')) {
        setTimeout(function () {
          try {
            var sheet = document.querySelector('#card-view .sheet');
            var body = document.getElementById('cv-body');
            if (sheet) {
              sheet.style.removeProperty('height');
              sheet.style.removeProperty('max-height');
              sheet.style.removeProperty('align-self');
              sheet.style.removeProperty('flex');
            }
            if (body) {
              body.style.removeProperty('max-height');
              body.style.removeProperty('overflow-y');
              body.style.removeProperty('flex');
            }
          } catch (err) {}
        }, 260);
      }
    }, true);
  })();
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
   16. 版本徽章
   ============================================================ */
(function bumpVer() {
  function set() {
    try {
      var el = document.querySelector('.ver');
      if (!el) return;
      el.textContent = 'v60';
    } catch (e) {}
  }
  set();
  setTimeout(set, 300);
  setTimeout(set, 1200);
  setTimeout(set, 3000);
})();
