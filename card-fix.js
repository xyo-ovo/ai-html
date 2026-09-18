/* ============================================================
   card-fix.js v2 —— 角色卡导入「硬触发」
   修复两个问题：
   1) 原先找 #btn-import-card（v37 改成 label 后没 id）→ 提前 return，整段失效
   2) 原生 label-for 联动会被页面上的 preventDefault 拦掉 → 不再依赖它
   方案：document 捕获阶段最先拿到点击 → 手动 pick.click()
   ============================================================ */

(function () {
  'use strict';

  var _lastOpen = 0;

  function pickEl() {
    return document.getElementById('pick-card');
  }

  function openPick() {
    var now = Date.now();
    if (now - _lastOpen < 400) return;   /* 节流，防双触发 */
    _lastOpen = now;
    var p = pickEl();
    if (!p) {
      if (window.toast) toast('找不到文件选择器（pick-card）', 3000);
      return;
    }
    try { p.click(); }
    catch (err) {
      if (window.toast) toast('无法打开文件选择器：' + ((err && err.message) || err), 3600);
    }
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
  window.__cardFixOpen = openPick;

  /* ① 捕获阶段：比页面上任何监听器都早，先拿到点击并阻止传播 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var hit = t.closest('label[for="pick-card"], #btn-import-card');
    if (!hit) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    openPick();
  }, true);

  /* ② 再给 label 自己挂一层（防止捕获层因某种原因没跑到） */
  function bindDirect() {
    var lb = document.querySelector('label[for="pick-card"]');
    if (lb && lb.dataset.cfBound !== '1') {
      lb.dataset.cfBound = '1';
      lb.addEventListener('click', function (e) {
        e.preventDefault();
        openPick();
      });
    }
  }

  bindDirect();
  setTimeout(bindDirect, 60);
  setTimeout(bindDirect, 400);
  setTimeout(bindDirect, 1500);
})();
