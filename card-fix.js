/* ============================================================
   card-fix.js v4 —— 安卓 Chrome 兼容版
   关键原则（安卓 Chrome 只认这一种）：
     · 必须是 <button>（不是 label / div）
     · input 用「视觉隐藏」而非 display:none / opacity:0
     · 绑定时绝不 preventDefault / stopPropagation
     · 必须在点击的同步执行栈里直接 input.click()
   ============================================================ */

(function () {
  'use strict';

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

  /* 绑定：只做一件事 —— 同步 pick.click()，不拦任何事件 */
  function bind() {
    var btn = document.getElementById('btn-import-card');
    var p = pickEl();
    if (!btn || !p) return false;
    if (btn.dataset.cfBound === '1') return true;
    btn.dataset.cfBound = '1';

    btn.addEventListener('click', function () {
      /* 不要 preventDefault，不要 stopPropagation
         安卓 Chrome 会因为「手势被取消」而拒绝打开文件框 */
      try { p.click(); } catch (e) {}
    });
    return true;
  }

  bind();
  setTimeout(bind, 80);
  setTimeout(bind, 400);
  setTimeout(bind, 1500);

  /* 切到角色卡页时补一次 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="card"]')) {
      setTimeout(bind, 40);
    }
  }, true);
})();
