/* ============================================================
   card-fix.js v5 —— 安卓兜底
   除了「按钮 → input.click()」，再加一条完全不依赖文件选择器的路：
   直接粘贴角色卡 JSON 文本 → 解析 → 导入
   ============================================================ */

(function () {
  'use strict';

  function pickEl() {
    return document.getElementById('pick-card');
  }

  function doImport(files) {
    if (!files || !files.length) return;
    var fn = window.importCardFile || (typeof importCardFile === 'function' ? importCardFile : null);
    if (!fn) {
      if (window.toast) toast('解析函数未就绪，请强制刷新页面', 3400);
      return;
    }
    var i = 0;
    (function next() {
      if (i >= files.length) return;
      var f = files[i++];
      Promise.resolve()
        .then(function () { return fn(f); })
        .catch(function (e) { try { console.warn('[card-fix] 导入出错', e); } catch (_) {} })
        .then(function () { setTimeout(next, 0); });
    })();
  }
  window.__cardFixImport = doImport;

  /* 绑定：只做一件事 —— 同步 pick.click()，不拦任何事件 */
  function bind() {
    var btn = document.getElementById('btn-import-card');
    var p = pickEl();
    if (!btn || !p) return false;
    if (btn.dataset.cfBound === '1') return true;
    btn.dataset.cfBound = '1';

    btn.addEventListener('click', function () {
      try { p.click(); } catch (e) {}
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

  /* ================= 粘贴导入（绕开文件选择器） ================= */
  window.__cardFixImportText = function (text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) {
      if (window.toast) toast('先粘贴内容', 2600);
      return;
    }

    var json = null;

    /* 1) 直接当 JSON */
    if (t.charAt(0) === '{' || t.charAt(0) === '[') {
      try { json = JSON.parse(t); } catch (e) {}
    }
    /* 2) 当 base64（从 PNG 里拷出来的那种），UTF-8 解码 */
    if (!json && typeof b64ToUtf8 === 'function') {
      try { json = JSON.parse(b64ToUtf8(t)); } catch (e) {}
    }
    /* 3) 兜底：浏览器原生 atob */
    if (!json) {
      try { json = JSON.parse(atob(t)); } catch (e) {}
    }

    if (!json || typeof json !== 'object') {
      if (window.toast) toast('不是合法的角色卡 JSON', 3400);
      return;
    }

    if (typeof parseCardJson !== 'function' || typeof LS === 'undefined') {
      if (window.toast) toast('解析器未就绪，请强制刷新', 3400);
      return;
    }

    var parsed;
    try { parsed = parseCardJson(json); }
    catch (e) { if (window.toast) toast('解析失败：' + ((e && e.message) || e), 3600); return; }

    var card = {
      id: (typeof uid === 'function' ? uid() : String(Date.now())),
      name: parsed.fields.name,
      ts: Date.now(),
      active: true,
      fields: parsed.fields,
      book: parsed.book,
      regex: parsed.regex,
    };

    var arr = LS.cards.slice();
    arr.unshift(card);
    try { LS.cards = arr; }
    catch (e) { if (window.toast) toast('角色卡太大，存不下了', 3600); return; }

    if (typeof renderCardList === 'function') renderCardList();
    var nB = parsed.book.entries.length;
    var nR = parsed.regex.length;
    if (window.toast) {
      toast('已导入「' + card.name + '」' +
        (nB ? ' · ' + nB + ' 条世界书' : '') +
        (nR ? ' · ' + nR + ' 条正则' : ''), 3600);
    }
    var ta = document.getElementById('paste-card');
    if (ta) ta.value = '';
  };
})();
