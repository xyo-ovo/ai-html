/* ============================================================
   card-fix.js v7 —— 让错误可见 + 清洗畸形数据

   修两件事：
   1) 之前 doImport 的 .catch 只 console.warn，界面完全没反馈
      → 现在一律 toast 出来，能看到具体哪步炸的
   2) parseCardJson 里遍历世界书/正则条目时假设每项都是对象，
      遇到 null / 字符串会抛 TypeError
      → 覆盖 parseCardJson，先过滤掉非对象项再交给原实现

   另外保留：
   · 按钮换 id（btn-import-card-v2）躲开 extra.v4.js 的旧委托
   · 粘贴 JSON 导入
   ============================================================ */

(function () {
  'use strict';

  var BTN_ID = 'btn-import-card-v2';

  /* ---------- 0. 安全 toast ---------- */
  function say(msg, ms) {
    try {
      if (typeof toast === 'function') toast(msg, ms || 3600);
      else console.warn('[card-fix]', msg);
    } catch (e) {
      try { console.warn('[card-fix]', msg); } catch (_) {}
    }
  }
  window.__cardFixSay = say;

  /* ---------- 1. 覆盖 parseCardJson：先清洗，再交给原实现 ---------- */
  function sanitizeCardJson(json) {
    try {
      var d = (json && (json.data || json)) || {};

      /* 世界书：过滤非对象项 */
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

      /* 正则：过滤非对象项 */
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

      /* alternate_greetings：过滤空值 */
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

  /* ---------- 2. 导入入口：错误必须可见 ---------- */
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
        /* 全部跑完，给个总反馈 */
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
          /* 单文件出错也立刻提示，不用等全部跑完 */
          say('「' + fname + '」导入出错：' + m, 5200);
        })
        .then(function () { setTimeout(next, 0); });
    })();
  }
  window.__cardFixImport = doImport;

  /* ---------- 3. 绑定（不 preventDefault） ---------- */
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

  /* ---------- 4. 粘贴导入 ---------- */
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

    var arr = (LS.cards || []).slice();
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
