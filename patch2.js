/* ============================================================
   patch2.js —— 搜索改成「先列结果，再点选跳转」
   · 输入关键词 → 下方弹出匹配消息列表（带摘要 + 角色标签 + 条数）
   · 点某一条 → 跳到那条并高亮
   · 用 cloneNode 换掉输入框，清掉旧版监听器，避免双触发
   ============================================================ */

(function () {
  'use strict';

  window.__EXTRA_VER = 'v37';

  function q1(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 跳到指定消息并高亮 */
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
  window.__jumpToMsg = jumpToMsg;

  /* 生成结果列表 */
  function buildList() {
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
      var a = (typeof m.content === 'string') ? m.content : '';
      var b = (typeof m.raw === 'string') ? m.raw : '';
      var all = a + '\n' + b;
      var p = all.toLowerCase().indexOf(q);
      if (p < 0) return;
      var from = Math.max(0, p - 26);
      var to = Math.min(all.length, p + 70);
      var snip = (from > 0 ? '…' : '') +
        all.slice(from, to).replace(/\s+/g, ' ') +
        (to < all.length ? '…' : '');
      hits.push({ i: i, role: m.role, snip: snip });
    });

    if (cnt) cnt.textContent = hits.length + ' 条';

    if (!hits.length) {
      box.innerHTML = '<div class="find-empty">没有匹配的消息</div>';
      box.classList.remove('hidden');
      return;
    }

    hits.slice(0, 200).forEach(function (h, n) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'find-row';
      row.innerHTML =
        '<span class="fr-n">' + (n + 1) + '</span>' +
        '<span class="fr-role' + (h.role === 'user' ? ' u' : '') + '">' +
          (h.role === 'user' ? '我' : 'AI') + '</span>' +
        '<span class="fr-txt">' + esc(h.snip) + '</span>';
      row.onclick = function () { jumpToMsg(h.i); };
      box.appendChild(row);
    });
    box.classList.remove('hidden');
  }

  /* 用 clone 换掉输入框，清掉旧监听器 */
  function rebind() {
    var old = document.getElementById('find-input');
    var box = document.getElementById('find-list');
    var bar = document.getElementById('find-bar');
    if (!old || !box || !bar) return false;
    if (old.dataset.fresh === '1') return true;

    var fresh = old.cloneNode(true);
    fresh.dataset.fresh = '1';
    try { delete fresh.id; } catch (e) {}
    fresh.id = 'find-input';
    old.parentNode.replaceChild(fresh, old);

    fresh.addEventListener('input', buildList);
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
  setTimeout(rebind, 60);
  setTimeout(rebind, 400);
  setTimeout(rebind, 1500);

  /* 点放大镜打开搜索条时，确保绑定 + 聚焦 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#btn-find')) {
      setTimeout(function () {
        rebind();
        var inp = document.getElementById('find-input');
        if (inp) { try { inp.focus(); inp.select(); } catch (e2) {} }
      }, 30);
    }
  }, true);
})();
