/* ============================================================
   patch6.js v7 —— 角色卡详情
   1) 章节 / 条目 / 长字段 三层折叠
   2) 弹层高度 = 内容高度（最多 88vh）
   3) 世界书 / 正则条目 → 跟全局世界书一样的「书脊」样式
   4) 读角色卡的工具照常挂着，只在描述里加一句「这是资料，不是扮演指令」

   v7：前几版光靠 CSS 压不住高度（弹层照样铺满），这版改成
       「先清空所有高度限制 → 量出内容真实高度 → 写死一个精确 px」。
       行内 + !important 是最高优先级，没有更高的了。
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     0. 样式
     ============================================================ */
  (function injectCss() {
    var old = document.getElementById('p6-css');
    if (old) old.remove();

    var s = document.createElement('style');
    s.id = 'p6-css';
    s.textContent = [

      /* ---- 1. 弹层：先给个合理默认，精确高度由 JS 写死 ---- */
      '#card-view{',
      '  align-items:center !important;',
      '  justify-content:center !important;',
      '}',
      '#card-view .sheet{',
      '  height:auto !important;',
      '  min-height:0 !important;',
      '  max-height:88vh !important;',
      '  align-self:center !important;',
      '  display:flex !important;',
      '  flex-direction:column !important;',
      '  padding-bottom:0 !important;',
      '  margin-bottom:0 !important;',
      '}',
      '#card-view .sheet-body{',
      '  flex:0 1 auto !important;',
      '  height:auto !important;',
      '  min-height:0 !important;',
      '  max-height:none !important;',
      '  padding-bottom:0 !important;',
      '  margin-bottom:0 !important;',
      '  -webkit-overflow-scrolling:touch;',
      '}',

      /* 最后一项的 margin / padding 全归零 */
      '#card-view .sheet-body > *:last-child,',
      '#card-view .cv-sec:last-child,',
      '#card-view .cv-sec:last-child > *:last-child,',
      '#card-view .cv-field:last-child,',
      '#card-view .cv-entry:last-child{',
      '  margin-bottom:0 !important;',
      '  padding-bottom:0 !important;',
      '}',

      /* 角色卡那一页本身也收一下底 */
      '#page-card .page-body > *:last-child{margin-bottom:0 !important}',

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

      /* ---- 3. 世界书 / 正则条目：跟全局世界书一个样式 ---- */
      '.cv-entry{',
      '  border-radius:4px 14px 14px 4px !important;',
      '  padding:12px 14px 12px 16px !important;',
      '  background:var(--bg2) !important;',
      '  border:1px solid var(--line2) !important;',
      '  border-left:3px solid color-mix(in srgb,var(--acc) 55%,transparent) !important;',
      '  margin-bottom:9px !important;',
      '  transition:border-color .2s ease,background-color .2s ease !important;',
      '}',
      '.cv-entry:hover{',
      '  border-color:color-mix(in srgb,var(--acc) 35%,var(--line2)) !important;',
      '  border-left-color:var(--acc) !important;',
      '  background:color-mix(in srgb,var(--acc) 3.5%,var(--bg2)) !important;',
      '}',
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
     1. 精确测量，把弹层高度写死
     ============================================================ */
  function fitCardSheet() {
    try {
      var overlay = document.getElementById('card-view');
      if (!overlay || overlay.classList.contains('hidden')) return;

      var sheet = overlay.querySelector('.sheet');
      var body = document.getElementById('cv-body');
      if (!sheet || !body) return;
      var head = sheet.querySelector('.sheet-head');

      /* --- ① 先把所有高度限制清干净，让浏览器算出「自然高度」 --- */
      sheet.style.removeProperty('height');
      sheet.style.removeProperty('min-height');
      sheet.style.removeProperty('max-height');
      body.style.removeProperty('height');
      body.style.removeProperty('min-height');
      body.style.removeProperty('max-height');

      /* --- ② 量 --- */
      var vh = window.innerHeight || document.documentElement.clientHeight || 800;
      var cap = Math.round(vh * 0.88);
      var headH = head ? head.offsetHeight : 0;
      var bodyH = Math.max(body.scrollHeight, body.offsetHeight);
      var need = headH + bodyH;

      /* --- ③ 写死 --- */
      sheet.style.setProperty('align-self', 'center', 'important');
      sheet.style.setProperty('min-height', '0', 'important');
      sheet.style.setProperty('max-height', cap + 'px', 'important');
      sheet.style.setProperty('height', Math.min(need, cap) + 'px', 'important');
      sheet.style.setProperty('padding-bottom', '0', 'important');
      sheet.style.setProperty('margin-bottom', '0', 'important');

      if (need <= cap) {
        /* 内容装得下：body 不要滚，也不要撑 */
        body.style.setProperty('max-height', 'none', 'important');
        body.style.setProperty('overflow-y', 'visible', 'important');
      } else {
        /* 内容超了：body 自己滚 */
        body.style.setProperty('max-height', Math.max(0, cap - headH) + 'px', 'important');
        body.style.setProperty('overflow-y', 'auto', 'important');
      }

      /* 最后一项的 margin 直接清掉 */
      var kids = body.children;
      if (kids && kids.length) {
        var last = kids[kids.length - 1];
        if (last && last.style) {
          last.style.marginBottom = '0';
          last.style.paddingBottom = '0';
          var inner = last.lastElementChild;
          if (inner && inner.style) {
            inner.style.marginBottom = '0';
            inner.style.paddingBottom = '0';
          }
        }
      }
    } catch (e) {}
  }
  window.__cardFit = fitCardSheet;

  /* 连测几帧，防字体/图片/异步内容把高度改了 */
  function fitCardSheetSoon() {
    fitCardSheet();
    requestAnimationFrame(fitCardSheet);
    setTimeout(fitCardSheet, 60);
    setTimeout(fitCardSheet, 200);
    setTimeout(fitCardSheet, 500);
  }
  window.__cardFitSoon = fitCardSheetSoon;

  /* ============================================================
     2. 折叠增强
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

        var nEntry = sec.querySelectorAll('.cv-entry').length;
        if (nEntry > 4) sec.classList.add('folded');

        h3.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('.cv-btns')) return;
          sec.classList.toggle('folded');
          setTimeout(fitCardSheet, 220);
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
          setTimeout(fitCardSheet, 320);
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
          setTimeout(fitCardSheet, 60);
        });
      });

      fitCardSheetSoon();

    } catch (e) {}
  }
  window.__cardFold = enhanceCardView;

  (function watch() {
    function bind() {
      var body = document.getElementById('cv-body');
      if (!body || body.dataset.p6Watch === '1') return;
      body.dataset.p6Watch = '1';
      if (typeof MutationObserver === 'undefined') return;
      var tmr = 0;
      var mo = new MutationObserver(function () {
        if (tmr) return;
        tmr = setTimeout(function () {
          tmr = 0;
          enhanceCardView();
          fitCardSheetSoon();
        }, 40);
      });
      try { mo.observe(body, { childList: true, subtree: false }); } catch (e) {}
    }

    bind();
    setTimeout(bind, 600);
    setTimeout(bind, 2000);

    /* 点角色卡列表项 → 打开弹层，密集重测 */
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#card-list')) {
        fitCardSheetSoon();
        setTimeout(fitCardSheet, 700);
        setTimeout(fitCardSheet, 1100);
        setTimeout(enhanceCardView, 60);
        setTimeout(enhanceCardView, 260);
      }
    }, true);

    enhanceCardView();
    fitCardSheetSoon();

    /* 窗口尺寸变了也重测 */
    window.addEventListener('resize', function () {
      setTimeout(fitCardSheet, 80);
    }, { passive: true });

    /* 弹层关掉时清掉写死的样式，下次打开重新量 */
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('[data-close="card-view"]')) {
        setTimeout(function () {
          try {
            var sheet = document.querySelector('#card-view .sheet');
            var body = document.getElementById('cv-body');
            if (sheet) {
              sheet.style.removeProperty('height');
              sheet.style.removeProperty('max-height');
              sheet.style.removeProperty('align-self');
            }
            if (body) {
              body.style.removeProperty('max-height');
              body.style.removeProperty('overflow-y');
            }
          } catch (err) {}
        }, 260);
      }
    }, true);
  })();

  /* ============================================================
     3. 工具描述：读到内容 ≠ 要扮演
     ============================================================ */
  (function softenCardTool() {
    if (typeof buildToolsPayload !== 'function') return;

    var RE_CARD = /character|card/i;
    var NOTE =
      '\n\n注意：这是一份【背景资料】，不是角色扮演指令。' +
      '默认情况下读完只需把内容当作参考信息，不要改变你原本的身份、语气和说话方式，' +
      '不要主动入戏、不要自称卡里的角色、不要用第一人称演他/她。' +
      '只有当用户明确说「扮演这个角色」「用 XX 的语气跟我说话」时，才按角色卡设定来演。';

    var _origBTP = buildToolsPayload;
    var _newBTP = function () {
      var r = _origBTP();
      try {
        if (!r || !Array.isArray(r.tools)) return r;
        r.tools.forEach(function (t) {
          if (!t || !t.function) return;
          var n = t.function.name || '';
          if (!RE_CARD.test(n)) return;
          var d = String(t.function.description || '');
          if (d.indexOf('背景资料') >= 0) return;
          t.function.description = d + NOTE;
        });
      } catch (e) {}
      return r;
    };

    try { buildToolsPayload = _newBTP; } catch (e) {}
    try { window.buildToolsPayload = _newBTP; } catch (e) {}
  })();

  /* ============================================================
     4. 版本徽章
     ============================================================ */
  (function bumpVer() {
    try {
      var el = document.querySelector('.ver');
      if (!el) return;
      var me = document.querySelector('script[src*="patch6.js"]')
            || document.querySelector('script[src*="patch5.js"]')
            || document.querySelector('script[src*="patch3.js"]');
      var m = me && String(me.src || '').match(/[?&]v=([^&]+)/);
      el.textContent = 'v' + (m ? m[1] : '56') + 'c';
    } catch (e) {}
  })();

})();
