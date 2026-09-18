/* ============================================================
   card-fix.js v3 —— 安卓可用版
   关键修复：绝对不要 preventDefault！
   安卓浏览器要求 .click() 必须发生在"未被 preventDefault 的用户手势"里，
   之前 v2 在捕获阶段先 preventDefault 再 click()，安卓直接拒绝打开文件框。

   现在主方案已改为「input 透明铺满按钮区域」（见 index.html），
   本脚本只做兜底 + 提供导入入口。
   ============================================================ */

(function () {
  'use strict';

  function pickEl() {
    return document.getElementById('pick-card');
  }

  /* 导入入口（内联 onchange 会调它） */
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

  /* 兜底：只在「事件目标不是 input 自己」时才手动 click
     并且绝对不 preventDefault —— 让浏览器认为这是有效的用户手势 */
  function bind() {
    var wrap = document.getElementById('btn-import-card');
    var p = pickEl();
    if (!wrap || !p) return false;
    if (wrap.dataset.cfBound === '1') return true;
    wrap.dataset.cfBound = '1';

    wrap.addEventListener('click', function (ev) {
      /* 用户已经直接点到 input 了，浏览器会自己处理，不用管 */
      if (ev.target === p) return;
      try { p.click(); } catch (e) {}
      /* 注意：这里没有 preventDefault */
    });
    return true;
  }

  bind();
  setTimeout(bind, 80);
  setTimeout(bind, 400);
  setTimeout(bind, 1500);

  /* 切到角色卡页时补绑一次 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="card"]')) {
      setTimeout(bind, 30);
    }
  }, true);
})();
