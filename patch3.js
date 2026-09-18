/* ============================================================
   patch3.js —— 搜索重做：先列结果，点选跳转

   上一版（v37 的 patch2.js）两个坑：
   1) 摘要把 msg.raw 也算了进去，而 raw 里含 HTML 代码块
      → 截出来全是 class="..."、div> 这种碎片，看着像乱码
   2) 列表项没做 min-width:0，长文本把行撑歪，看着像竖排

   这版：
   · 只搜 msg.content（纯文本原文）
   · 摘要前先剥掉 ```代码块``` 和 markdown 链接
   · 用 cloneNode 换掉输入框，清掉旧监听器，避免双触发
   ============================================================ */

(function () {
  'use strict';

  function q1(s) { return document.querySelector(s); }
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

  /* 用 clone 换掉输入框，清掉旧监听器 */
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
    if (t && t.closest && t.closest('#btn-find')) {
      setTimeout(function () {
        rebind();
        var inp = document.getElementById('find-input');
        if (inp) { try { inp.focus(); inp.select(); } catch (e2) {} }
        build();
      }, 30);
    }
  }, true);
})();
