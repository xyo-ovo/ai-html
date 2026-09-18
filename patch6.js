/* ============================================================
   patch6.js —— 角色卡详情：可折叠 + 弹层底部不悬空

   1) #card-view 弹层：内容不满时不再撑满留白，底部留安全间距
   2) .cv-sec（章节）可点击标题折叠；条目多（>4）默认收起
   3) .cv-entry（世界书 / 正则条目）默认收起正文，点条目名展开
   4) .cv-field pre（人设长字段）超过约 200 字折叠，点一下展开

   全部靠 CSS + 后处理，不改 extra.v4.js 的渲染逻辑。
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     0. 样式
     ============================================================ */
  (function injectCss() {
    if (document.getElementById('p6-css')) return;
    var s = document.createElement('style');
    s.id = 'p6-css';
    s.textContent = [

      /* ---- 1. 弹层底部不悬空 ---- */
      '#card-view .sheet{max-height:88vh;display:flex;flex-direction:column}',
      '#card-view .sheet-body{',
      '  flex:0 1 auto !important;',
      '  min-height:0;',
      '  overflow-y:auto;',
      '  padding-bottom:calc(30px + env(safe-area-inset-bottom,0px)) !important;',
      '  -webkit-overflow-scrolling:touch;',
      '}',

      /* ---- 2. 章节折叠 ---- */
      '.cv-sec > h3{',
      '  cursor:pointer;user-select:none;-webkit-user-select:none;',
      '  position:relative;padding-left:15px;',
      '}',
      '.cv-sec > h3::before{',
      '  content:"";position:absolute;left:0;top:50%;',
      '  width:0;height:0;',
      '  border-left:5px solid currentColor;',
      '  border-top:4px solid transparent;',
      '  border-bottom:4px solid transparent;',
      '  transform:translateY(-50%) rotate(90deg);',
      '  transition:transform .2s cubic-bezier(.16,1,.3,1);',
      '  opacity:.5;',
      '}',
      '.cv-sec.folded > h3::before{transform:translateY(-50%) rotate(0deg)}',
      '.cv-sec.folded > *:not(h3){display:none !important}',
      '.cv-sec > h3 .cv-count{',
      '  font-size:10.5px;font-weight:600;',
      '  padding:1px 7px;border-radius:999px;',
      '  background:var(--bg4);color:var(--fg3);',
      '  margin-left:5px;font-variant-numeric:tabular-nums;',
      '  letter-spacing:.02em;',
      '}',

      /* ---- 3. 条目（世界书 / 正则）折叠 ---- */
      '.cv-entry .eh{cursor:pointer;position:relative;padding-right:18px}',
      '.cv-entry .eh::after{',
      '  content:"";position:absolute;right:2px;top:50%;',
      '  width:0;height:0;',
      '  border-left:4px solid currentColor;',
      '  border-top:3.5px solid transparent;',
      '  border-bottom:3.5px solid transparent;',
      '  transform:translateY(-50%) rotate(90deg);',
      '  transition:transform .2s ease;',
      '  opacity:.4;',
      '}',
      '.cv-entry.folded .eh::after{transform:translateY(-50%) rotate(0deg)}',
      '.cv-entry .ec{',
      '  transition:max-height .28s cubic-bezier(.16,1,.3,1),opacity .2s ease,padding .22s ease;',
      '  overflow:hidden;',
      '}',
      '.cv-entry.folded .ec{max-height:0 !important;opacity:0;padding-top:0;padding-bottom:0;margin:0}',

      /* ---- 4. 长字段折叠 ---- */
      '.cv-field pre.clamp{',
      '  max-height:82px;overflow:hidden;position:relative;cursor:pointer;',
      '}',
      '.cv-field pre.clamp::after{',
      '  content:"";position:absolute;left:0;right:0;bottom:0;height:34px;',
      '  background:linear-gradient(transparent,var(--bg3));',
      '  pointer-events:none;border-radius:0 0 12px 12px;',
      '}',
      '.cv-field pre.clamp::before{',
      '  content:"点开看全部";',
      '  position:absolute;right:10px;bottom:6px;',
      '  font-size:10.5px;color:var(--acc);opacity:.9;z-index:1;',
      '  font-family:var(--font-sans);letter-spacing:.02em;',
      '}',

    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ============================================================
     1. 增强函数
     ============================================================ */
  function enhanceCardView() {
    try {
      var body = document.getElementById('cv-body');
      if (!body) return;

      /* ---- 章节 ---- */
      var secs = body.querySelectorAll('.cv-sec');
      Array.prototype.forEach.call(secs, function (sec) {
        var h3 = sec.querySelector('h3');
        if (!h3 || h3.dataset.p6 === '1') return;
        h3.dataset.p6 = '1';

        var nAll = sec.querySelectorAll('.cv-field, .cv-entry').length;
        if (nAll > 0 && !h3.querySelector('.cv-count')) {
          var badge = document.createElement('span');
          badge.className = 'cv-count';
          badge.textContent = String(nAll);
          var btns = h3.querySelector('.cv-btns');
          if (btns) h3.insertBefore(badge, btns);
          else h3.appendChild(badge);
        }

        /* 条目多的章节默认收起（人设字段那种短的保持展开） */
        var nEntry = sec.querySelectorAll('.cv-entry').length;
        if (nEntry > 4) sec.classList.add('folded');

        h3.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('.cv-btns')) return;
          sec.classList.toggle('folded');
        });
      });

      /* ---- 条目正文 ---- */
      var entries = body.querySelectorAll('.cv-entry');
      Array.prototype.forEach.call(entries, function (en) {
        if (en.dataset.p6 === '1') return;
        var eh = en.querySelector('.eh');
        var ec = en.querySelector('.ec');
        if (!eh || !ec) return;
        en.dataset.p6 = '1';
        if ((ec.textContent || '').trim().length < 90) return;
        en.classList.add('folded');
        eh.addEventListener('click', function (e) {
          e.stopPropagation();
          en.classList.toggle('folded');
        });
      });

      /* ---- 长字段 ---- */
      var pres = body.querySelectorAll('.cv-field pre');
      Array.prototype.forEach.call(pres, function (pre) {
        if (pre.dataset.p6 === '1') return;
        pre.dataset.p6 = '1';
        if ((pre.textContent || '').trim().length < 200) return;
        pre.classList.add('clamp');
        pre.addEventListener('click', function () {
          pre.classList.toggle('clamp');
        });
      });

    } catch (e) {}
  }
  window.__cardFold = enhanceCardView;

  /* ============================================================
     2. 监听弹层内容重建
     ============================================================ */
  (function watch() {
    function bind() {
      var body = document.getElementById('cv-body');
      if (!body || body.dataset.p6Watch === '1') return;
      body.dataset.p6Watch = '1';
      if (typeof MutationObserver === 'undefined') return;
      var tmr = 0;
      var mo = new MutationObserver(function () {
        if (tmr) return;
        tmr = setTimeout(function () { tmr = 0; enhanceCardView(); }, 40);
      });
      try { mo.observe(body, { childList: true, subtree: false }); } catch (e) {}
    }

    bind();
    setTimeout(bind, 600);
    setTimeout(bind, 2000);

    /* 点角色卡列表 / 弹层内任何地方，都顺手增强一次 */
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#card-list') || t.closest('#card-view')) {
        setTimeout(enhanceCardView, 50);
        setTimeout(enhanceCardView, 260);
      }
    }, true);

    enhanceCardView();
    setTimeout(enhanceCardView, 400);
  })();

  /* ============================================================
     3. 版本
     ============================================================ */
  (function bumpVer() {
    try {
      var v = document.querySelector('.ver');
      if (v) v.textContent = 'v53';
    } catch (e) {}
  })();

})();
