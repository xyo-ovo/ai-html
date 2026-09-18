/* ============================================================
   card-fix.js v6 —— 修掉「点了没反应」的真正原因

   问题定位（Claude 帮忙看的）：
   extra.v4.js 里有一段全局事件委托：
       document.addEventListener('click', function(e){
         if (t.closest('#btn-import-card')) {
           e.preventDefault();      // ← 安卓：这等于取消了本次手势
           e.stopPropagation();
           pick.click();            // ← 手势已失效，被浏览器拒绝
         }
       }, true);                     // ← 捕获阶段，最先执行

   因为它跑在捕获阶段，我们绑在按钮上的监听器根本轮不到；
   而它自己又先 preventDefault 再 click()，安卓直接拒绝打开文件框。

   修复：给按钮换一个 id（避开那段旧委托），
        由本脚本用「不 preventDefault、同步 click」的方式接管。
   ============================================================ */

(function () {
  'use strict';

  /* 故意换 id：躲开 extra.v4.js 里针对 #btn-import-card 的那段委托 */
  var BTN_ID = 'btn-import-card-v2';

  function pickEl() {
    return document.getElementById('pick-card');
  }

  /* 导入入口（input 的内联 onchange 会调它） */
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

  function bind() {
    var btn = document.getElementById(BTN_ID);
    var p = pickEl();
    if (!btn || !p) return false;
    if (btn.dataset.cfBound === '1') return true;
    btn.dataset.cfBound = '1';

    btn.addEventListener('click', function (e) {
      /* 拦住这次点击，别让别的委托再重复触发一次 click()
         注意：这里绝对不 preventDefault —— 安卓会因为「手势被取消」而拒绝 */
      e.stopPropagation();
      try { p.click(); } catch (err) {}
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

  /* ================= 粘贴导入（绕开文件选择器，一定可用） ================= */
  window.__cardFixImportText = function (text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) {
      if (window.toast) toast('先粘贴内容', 2600);
      return;
    }

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
