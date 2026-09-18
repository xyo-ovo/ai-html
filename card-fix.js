/* ============================================================
   card-fix.js v8 —— 补上 LS.cards 存取器（真正的根因）

   之前所有"点了没反应"，最底层都栽在这里：
   app.v29.js 里的 LS 对象只定义了
     providers / activeId / themeMode / themeColor /
     tools / lore / sessions / persona
   唯独漏了 cards。

   而 extra.v4.js 到处在用 LS.cards.slice()、LS.cards = arr，
   LS.cards 读出来是 undefined → .slice() 直接抛
   TypeError: Cannot read properties of undefined (reading 'slice')

   本脚本在最开头给 LS 补上 cards 的 getter/setter（localStorage 持久化），
   导入 / 列表 / 开关 / 删除就全通了。

   另外保留：
   · 按钮换 id（btn-import-card-v2）躲开 extra.v4.js 的旧委托
   · 错误一律 toast 出来
   · 覆盖 parseCardJson 清洗畸形条目
   · 粘贴 JSON 导入
   ============================================================ */

/* ---------- 0. 补 LS.cards（最关键，必须最先跑） ---------- */
(function ensureCardsStorage() {
  if (typeof LS === 'undefined' || !LS) return;

  var d = null;
  try { d = Object.getOwnPropertyDescriptor(LS, 'cards'); } catch (e) {}
  if (d && (d.get || d.set)) return;   /* 已经有了就不重复定义 */

  try {
    Object.defineProperty(LS, 'cards', {
      get: function () {
        try {
          var raw = localStorage.getItem('aih.cards');
          var arr = raw ? JSON.parse(raw) : [];
          return Array.isArray(arr) ? arr : [];
        } catch (e) {
          return [];
        }
      },
      set: function (v) {
        try {
          localStorage.setItem('aih.cards', JSON.stringify(Array.isArray(v) ? v : []));
        } catch (e) {
          /* 存不下就算了，别让调用方崩 */
          try { console.warn('[card-fix] 存角色卡失败（可能超容量）', e); } catch (_) {}
        }
      },
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    try { console.warn('[card-fix] 无法定义 LS.cards', e); } catch (_) {}
  }
})();

(function () {
  'use strict';

  var BTN_ID = 'btn-import-card-v2';

  /* ---------- 1. 安全 toast ---------- */
  function say(msg, ms) {
    try {
      if (typeof toast === 'function') toast(msg, ms || 3600);
      else console.warn('[card-fix]', msg);
    } catch (e) {
      try { console.warn('[card-fix]', msg); } catch (_) {}
    }
  }
  window.__cardFixSay = say;

  /* ---------- 2. 覆盖 parseCardJson：先清洗再交给原实现 ---------- */
  function sanitizeCardJson(json) {
    try {
      var d = (json && (json.data || json)) || {};

      var book = d.character_book || d.world_info || d.worldInfo;
      if (book) {
        if (Array.isArray(book)) {
          var cleanedArr = book.filter(function (e) { return e && typeof e === 'object'; });
          if (d.character_book === book) d.character_book = cleanedArr;
          else if (d.world_info === book) d.world_info = cleanedArr;
          else if (d.worldInfo === book) d.worldInfo = cleanedArr;
        } else if (typeof book === 'object' && Array.isArray(book.entries)) {
          book.entries = book.entries.filter(function (e) { return e && typeof e === 'object'; });
        }
      }

      var ex = d.extensions;
      if (ex && typeof ex === 'object') {
        var rx = ex.regex_scripts || ex.Regex;
        if (Array.isArray(rx)) {
          var cleanedRx = rx.filter(function (r) { return r && typeof r === 'object'; });
          if (ex.regex_scripts) ex.regex_scripts = cleanedRx;
          else ex.Regex = cleanedRx;
        }
      }
      if (Array.isArray(d.regex_scripts)) {
        d.regex_scripts = d.regex_scripts.filter(function (r) { return r && typeof r === 'object'; });
      }

      if (Array.isArray(d.alternate_greetings)) {
        d.alternate_greetings = d.alternate_greetings.filter(function (g) {
          return g != null && String(g).trim();
        });
      }
    } catch (e) {
      try { console.warn('[card-fix] 清洗出错（已忽略）', e); } catch (_) {}
    }
    return json;
  }

  (function patchParseCardJson() {
    if (typeof parseCardJson !== 'function') return;
    if (parseCardJson.__cfPatched) return;
    var orig = parseCardJson;
    var patched = function (json) {
      return orig(sanitizeCardJson(json));
    };
    patched.__cfPatched = true;
    try { parseCardJson = patched; } catch (e) {}
  })();

  /* ---------- 3. 导入入口：错误必须可见 ---------- */
  function pickEl() {
    return document.getElementById('pick-card');
  }

  function doImport(files) {
    if (!files || !files.length) {
      say('没有拿到文件（选择器可能被取消了）', 3200);
      return;
    }
    var fn = window.importCardFile || (typeof importCardFile === 'function' ? importCardFile : null);
    if (!fn) {
      say('解析函数未就绪，请强制刷新页面', 3600);
      return;
    }
    var i = 0;
    var okCount = 0;
    var errList = [];

    (function next() {
      if (i >= files.length) {
        if (errList.length) {
          say('导入失败：' + errList[0], 5200);
        } else if (okCount === 0) {
          say('没有文件被导入（可能是格式不支持）', 4200);
        }
        return;
      }
      var f = files[i++];
      var fname = (f && f.name) || ('第 ' + i + ' 个文件');
      Promise.resolve()
        .then(function () { return fn(f); })
        .then(function () { okCount++; })
        .catch(function (e) {
          var m = (e && e.message) || String(e);
          errList.push(fname + '：' + m);
          try { console.warn('[card-fix] 导入出错', e); } catch (_) {}
          say('「' + fname + '」导入出错：' + m, 5200);
        })
        .then(function () { setTimeout(next, 0); });
    })();
  }
  window.__cardFixImport = doImport;

  /* ---------- 4. 绑定（不 preventDefault） ---------- */
  function bind() {
    var btn = document.getElementById(BTN_ID);
    var p = pickEl();
    if (!btn || !p) return false;
    if (btn.dataset.cfBound === '1') return true;
    btn.dataset.cfBound = '1';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      try {
        p.click();
      } catch (err) {
        say('打不开文件选择器：' + ((err && err.message) || err), 4200);
      }
    });
    return true;
  }

  bind();
  setTimeout(bind, 80);
  setTimeout(bind, 400);
  setTimeout(bind, 1500);

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="card"]')) {
      setTimeout(bind, 40);
    }
  }, true);

  /* ---------- 5. 粘贴导入 ---------- */
  window.__cardFixImportText = function (text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) { say('先粘贴内容', 2600); return; }

    var json = null;

    if (t.charAt(0) === '{' || t.charAt(0) === '[') {
      try { json = JSON.parse(t); } catch (e) {}
    }
    if (!json && typeof b64ToUtf8 === 'function') {
      try { json = JSON.parse(b64ToUtf8(t)); } catch (e) {}
    }
    if (!json) {
      try { json = JSON.parse(atob(t)); } catch (e) {}
    }

    if (!json || typeof json !== 'object') {
      say('不是合法的角色卡 JSON', 4200);
      return;
    }

    if (typeof parseCardJson !== 'function' || typeof LS === 'undefined') {
      say('解析器未就绪，请强制刷新', 4200);
      return;
    }

    var parsed;
    try {
      parsed = parseCardJson(json);
    } catch (e) {
      say('解析失败：' + ((e && e.message) || e), 5200);
      try { console.warn('[card-fix] parse 出错', e, json); } catch (_) {}
      return;
    }

    if (!parsed || !parsed.fields) {
      say('解析结果为空，可能不是角色卡格式', 4200);
      return;
    }

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
    try { arr = (LS.cards || []).slice(); }
    catch (e) { arr = []; }
    arr.unshift(card);
    try {
      LS.cards = arr;
    } catch (e) {
      say('角色卡太大，localStorage 存不下了', 4600);
      return;
    }

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
