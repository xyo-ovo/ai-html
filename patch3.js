/* ============================================================
   patch3.js v2 —— 搜索重做 + 修竖排

   竖排根因：index.html 里有一条
     .find-bar button{ width:32px; height:32px; ... }
   本意是给「✕ 关闭」按钮用的，但 .find-row 也是 <button>
   且在 .find-bar 内，于是每条结果都被压成 32px 宽，
   文字挤成一列 —— 看着就是"竖着"。

   本脚本注入一条更高优先级的覆盖样式修掉，不用重写 index.html。
   ============================================================ */

/* ---------- 0. 注入覆盖样式 + 标版本 ---------- */
(function injectFindFix() {
  try {
    if (document.getElementById('find-fix-css')) return;
    var s = document.createElement('style');
    s.id = 'find-fix-css';
    s.textContent = [
      /* 只作用于直接子按钮（✕），不再波及 .find-row */
      '.find-bar > button{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;color:var(--fg2);font-size:14px;line-height:1;background:none;border:none;cursor:pointer}',
      '.find-bar > button:hover{background:var(--bg3);color:var(--fg)}',
      /* 结果行：撑满、自动高、横向排列 */
      '.find-bar .find-list .find-row{width:100% !important;height:auto !important;min-height:0 !important;display:flex !important;align-items:flex-start !important;gap:9px !important;padding:9px 11px !important;border-radius:11px !important;text-align:left !important;font-size:12.5px !important;line-height:1.6 !important;background:none !important;border:none !important;cursor:pointer !important;box-sizing:border-box !important}',
      '.find-bar .find-list .find-row:hover{background:var(--bg3) !important}',
      '.find-bar .find-list .find-row .fr-n{flex:0 0 1.8em !important;text-align:right;color:var(--fg3);font-size:11.5px;padding-top:1px}',
      '.find-bar .find-list .find-row .fr-role{flex:0 0 auto !important;font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--bg4);color:var(--fg2);line-height:1.5;white-space:nowrap}',
      '.find-bar .find-list .find-row .fr-role.u{background:var(--acc-soft);color:var(--acc)}',
      /* 摘要：占满剩余宽度，最多两行 */
      '.find-bar .find-list .find-row .fr-txt{flex:1 1 auto !important;min-width:0 !important;width:auto !important;color:var(--fg2);word-break:break-word;white-space:normal !important;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();

(function bumpVer() {
  try {
    var v = document.querySelector('.ver');
    if (v) v.textContent = 'v46';
  } catch (e) {}
})();

(function () {
  'use strict';

  var BTN_ID = 'btn-find';

  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 把消息正文压成可读的一行：剥代码块 → 剥链接 → 压空白 */
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

  /* 用 clone 换掉输入框，清掉旧监听器，避免双触发 */
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

  /* 点放大镜打开搜索条时，确保绑定 + 聚焦 */
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
