/* ============================================================
   card-fix.js —— 角色卡导入「死磕版」
   独立于其它脚本，只干一件事：让「导入角色卡」按钮一定能用。

   为什么之前点了没反应：
   1) <input type="file" hidden> 的 display:none 在部分浏览器
      会阻止程序化 .click()  —— 已在 index.html 换成屏幕外定位
   2) 绑定时机依赖脚本加载顺序，错过就永远失效
      —— 这里改成「多次 + 事件后」反复绑
   ============================================================ */

(function () {
  'use strict';

  var BOUND_FLAG = '__cardFixBound';

  function getEls() {
    return {
      btn: document.getElementById('btn-import-card'),
      pick: document.getElementById('pick-card')
    };
  }

  function doImport(files) {
    if (!files || !files.length) return;
    var fn = window.importCardFile || (typeof importCardFile === 'function' ? importCardFile : null);
    if (!fn) {
      if (window.toast) toast('解析函数未就绪，请刷新页面', 3200);
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

  function bind() {
    var els = getEls();
    if (!els.btn || !els.pick) return false;

    /* 直接赋值 onclick / onchange：不依赖 addEventListener 的注册顺序 */
    els.btn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      try {
        els.pick.click();
      } catch (err) {
        if (window.toast) toast('无法打开文件选择器：' + (err && err.message || err), 3600);
      }
    };

    els.pick.onchange = function () {
      var fs = els.pick.files;
      doImport(fs);
      els.pick.value = '';
    };

    /* 标记 */
    try { window[BOUND_FLAG] = true; } catch (e) {}
    return true;
  }

  /* 立即 + 多个时间点反复绑（覆盖脚本加载顺序、动态渲染等所有情况） */
  bind();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  }
  window.addEventListener('load', bind);
  [0, 50, 200, 500, 1200, 2500, 5000].forEach(function (ms) {
    setTimeout(bind, ms);
  });

  /* 切到「角色卡」页时再绑一次 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="card"]')) {
      setTimeout(bind, 0);
      setTimeout(bind, 120);
    }
  }, true);

  /* 供内联 onclick / onchange 兜底调用 */
  window.__cardFixBind = bind;
  window.__cardFixImport = doImport;
})();
