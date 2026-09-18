/* ============================================================
   patch3.js v3
   1) 搜索重做（结果列表点选）
   2) 修竖排（覆盖 .find-bar button 误伤 .find-row）
   3) 正文字体上传（存 IndexedDB，FontFace 加载，只作用正文）

   字体文件通常几 MB，localStorage 装不下，所以用 IndexedDB。
   UI 由本脚本动态注入到「设置 → 外观」下方，无需改 index.html。
   ============================================================ */

/* ---------- 0. 注入覆盖样式 + 标版本 ---------- */
(function injectFindFix() {
  try {
    if (document.getElementById('find-fix-css')) return;
    var s = document.createElement('style');
    s.id = 'find-fix-css';
    s.textContent = [
      '.find-bar > button{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;color:var(--fg2);font-size:14px;line-height:1;background:none;border:none;cursor:pointer}',
      '.find-bar > button:hover{background:var(--bg3);color:var(--fg)}',
      '.find-bar .find-list .find-row{width:100% !important;height:auto !important;min-height:0 !important;display:flex !important;align-items:flex-start !important;gap:9px !important;padding:9px 11px !important;border-radius:11px !important;text-align:left !important;font-size:12.5px !important;line-height:1.6 !important;background:none !important;border:none !important;cursor:pointer !important;box-sizing:border-box !important}',
      '.find-bar .find-list .find-row:hover{background:var(--bg3) !important}',
      '.find-bar .find-list .find-row .fr-n{flex:0 0 1.8em !important;text-align:right;color:var(--fg3);font-size:11.5px;padding-top:1px}',
      '.find-bar .find-list .find-row .fr-role{flex:0 0 auto !important;font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--bg4);color:var(--fg2);line-height:1.5;white-space:nowrap}',
      '.find-bar .find-list .find-row .fr-role.u{background:var(--acc-soft);color:var(--acc)}',
      '.find-bar .find-list .find-row .fr-txt{flex:1 1 auto !important;min-width:0 !important;width:auto !important;color:var(--fg2);word-break:break-word;white-space:normal !important;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      /* 字体上传区 */
      '#font-field .font-name{font-size:12.5px;color:var(--fg2);margin:6px 0 10px;word-break:break-all}',
      '#font-field .font-name b{color:var(--acc)}',
      '#font-field .font-btns{display:flex;gap:8px;flex-wrap:wrap}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();

(function bumpVer() {
  try {
    var v = document.querySelector('.ver');
    if (v) v.textContent = 'v47';
  } catch (e) {}
})();

/* ---------- 0.5 正文字体上传 ---------- */
(function fontFeature() {
  'use strict';

  var DB_NAME = 'aih-font';
  var STORE = 'fonts';
  var KEY = 'current';
  var FAMILY = 'aih-user-font';
  var STYLE_ID = 'aih-font-style';

  function say(msg, ms) {
    try {
      if (typeof toast === 'function') toast(msg, ms || 3600);
      else console.warn('[font]', msg);
    } catch (e) {}
  }

  /* ---- IndexedDB 小工具 ---- */
  function openDB() {
    return new Promise(function (res, rej) {
      var r;
      try { r = indexedDB.open(DB_NAME, 1); }
      catch (e) { rej(e); return; }
      r.onupgradeneeded = function () {
        try { r.result.createObjectStore(STORE); } catch (e) {}
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbPut(key, val) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(val, key);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readonly');
        var rq = tx.objectStore(STORE).get(key);
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
      });
    });
  }

  /* ---- 把字体挂到页面 ---- */
  function mountStyle() {
    var s = document.getElementById(STYLE_ID);
    if (s) return s;
    s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      /* 气泡内所有文字换成用户字体 */
      '.msg .bubble,',
      '.msg .bubble p, .msg .bubble li, .msg .bubble h1, .msg .bubble h2,',
      '.msg .bubble h3, .msg .bubble h4, .msg .bubble blockquote,',
      '.msg .bubble td, .msg .bubble th, .msg .bubble a, .msg .bubble strong,',
      '.msg .bubble em, .msg .bubble span:not(.ic) {',
      '  font-family: "' + FAMILY + '", var(--font-sans) !important;',
      '}',
      /* 代码块 / 行内代码保持等宽 */
      '.msg .bubble pre, .msg .bubble pre *,',
      '.msg .bubble code, .msg .bubble kbd, .msg .bubble samp {',
      '  font-family: var(--font-mono) !important;',
      '}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
    return s;
  }

  function unmountStyle() {
    var s = document.getElementById(STYLE_ID);
    if (s) s.remove();
    try {
      document.fonts.forEach(function (f) {
        if (f.family === FAMILY) document.fonts.delete(f);
      });
    } catch (e) {}
  }

  function applyFont(rec) {
    if (!rec || !rec.data) return Promise.resolve(false);
    var buf = rec.data;
    var ff;
    try {
      ff = new FontFace(FAMILY, buf);
    } catch (e) {
      return Promise.reject(e);
    }
    return ff.load().then(function (loaded) {
      try {
        document.fonts.forEach(function (f) {
          if (f.family === FAMILY) document.fonts.delete(f);
        });
      } catch (e) {}
      document.fonts.add(loaded);
      mountStyle();
      return true;
    });
  }

  /* ---- UI ---- */
  function buildUI() {
    var body = document.querySelector('#page-settings .page-body');
    if (!body) return false;
    if (document.getElementById('font-field')) return true;

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

    /* 插到「清空当前对话」那行之前 */
    var anchor = body.lastElementChild;
    if (anchor && anchor.classList && anchor.classList.contains('row')) {
      body.insertBefore(sec, anchor);
    } else {
      body.appendChild(sec);
    }

    var pick = sec.querySelector('#pick-font');
    var btnPick = sec.querySelector('#btn-font-pick');
    var btnReset = sec.querySelector('#btn-font-reset');
    var nameEl = sec.querySelector('#font-name');

    function setName(n) {
      if (!nameEl) return;
      if (n) {
        nameEl.innerHTML = '当前：<b>' + String(n).replace(/[<>&]/g, '') + '</b>';
      } else {
        nameEl.textContent = '当前：系统默认';
      }
    }

    btnPick.addEventListener('click', function (e) {
      e.stopPropagation();
      try { pick.click(); } catch (err) {
        say('打不开文件选择器：' + ((err && err.message) || err), 4200);
      }
    });

    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) {
        say('字体文件超过 20MB，先换个小的吧', 4200);
        return;
      }
      say('正在加载字体…', 2200);
      var reader = new FileReader();
      reader.onload = function () {
        var buf = reader.result;
        var rec = { name: f.name, data: buf, ts: Date.now() };
        idbPut(KEY, rec)
          .then(function () { return applyFont(rec); })
          .then(function () {
            setName(f.name);
            say('字体已应用：' + f.name, 3600);
          })
          .catch(function (e2) {
            say('字体加载失败：' + ((e2 && e2.message) || e2), 4600);
          });
      };
      reader.onerror = function () {
        say('读文件失败，换一个试试', 3600);
      };
      try { reader.readAsArrayBuffer(f); }
      catch (e3) { say('这个字体格式读不了：' + ((e3 && e3.message) || e3), 4200); }
      try { pick.value = ''; } catch (e4) {}
    });

    btnReset.addEventListener('click', function (e) {
      e.stopPropagation();
      idbPut(KEY, null)
        .then(function () {
          unmountStyle();
          setName(null);
          say('已恢复默认字体', 3000);
        })
        .catch(function () {
          unmountStyle();
          setName(null);
        });
    });

    return true;
  }

  /* ---- 启动 ---- */
  function boot() {
    buildUI();
    idbGet(KEY).then(function (rec) {
      if (!rec || !rec.data) return;
      return applyFont(rec).then(function () {
        var nameEl = document.getElementById('font-name');
        if (nameEl) {
          nameEl.innerHTML = '当前：<b>' + String(rec.name || '自定义字体').replace(/[<>&]/g, '') + '</b>';
        }
      }).catch(function () {});
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(buildUI, 600);
  setTimeout(buildUI, 1800);

  /* 每次切到设置页都确认 UI 在 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="settings"]')) {
      setTimeout(buildUI, 40);
    }
  }, true);
})();

/* ---------- 1. 搜索 ---------- */
(function () {
  'use strict';

  var BTN_ID = 'btn-find';

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
      .replace(/\s+/g, ' ')
      .trim();
  }

  function snippet(text, q) {
    var s = plain(text);
    if (!s) return '';
    var low = s.toLowerCase();
    var p = low.indexOf(q);
    if (p < 0) return '';
    var from = Math.max(0, p - 22);
    var to = Math.min(s.length, p + 62);
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
  window.__findJump = jumpToMsg;

  function build() {
    var inp = document.getElementById('find-input');
    var box = document.getElementById('find-list');
    var cnt = document.getElementById('find-count');
    if (!inp || !box) return;

    var q = String(inp.value || '').trim().toLowerCase();
    box.innerHTML = '';
    qa('.msg').forEach(function (x) { x.classList.remove('find-hit', 'find-cur'); });

    if (!q) {
      box.classList.add('hidden');
      if (cnt) cnt.textContent = '0 条';
      return;
    }

    var msgs = (typeof messages !== 'undefined' && messages) ? messages : [];
    var hits = [];
    msgs.forEach(function (m, i) {
      var c = (typeof m.content === 'string') ? m.content : '';
      if (!c) return;
      if (c.toLowerCase().indexOf(q) < 0) return;
      var sn = snippet(c, q);
      if (!sn) return;
      hits.push({ i: i, role: m.role, sn: sn });
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
        '<span class="fr-role' + (h.role === 'user' ? ' u' : '') + '">' +
          (h.role === 'user' ? '我' : 'AI') +
        '</span>' +
        '<span class="fr-txt">' + esc(h.sn) + '</span>';
      row.addEventListener('click', function () { jumpToMsg(h.i); });
      box.appendChild(row);
    });
    box.classList.remove('hidden');
  }
  window.__findBuild = build;

  function rebind() {
    var old = document.getElementById('find-input');
    var box = document.getElementById('find-list');
    if (!old || !box) return false;
    if (old.dataset.f3 === '1') return true;

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
    if (t && t.closest && t.closest('#' + BTN_ID)) {
      setTimeout(function () {
        rebind();
        var inp = document.getElementById('find-input');
        if (inp) { try { inp.focus(); inp.select(); } catch (e2) {} }
        build();
      }, 30);
    }
  }, true);
})();
