/* ============================================================
   patch6.js v2 —— 角色卡详情
   1) 章节 / 条目 / 长字段 三层折叠
   2) 底部不留白（去掉上一版加的 padding-bottom）
   3) 世界书 / 正则条目 → 跟全局世界书一样的「书脊」样式
   4) 新增「允许 AI 读取角色卡」开关（默认关）
      · 关闭：请求里不挂 read_character_card 之类的工具
      · 开启：保留工具，但改写描述，约束它别主动扮演
   ============================================================ */

(function () {
  'use strict';

  var CARD_TOOL_KEY = 'aih.allowCardTool';

  function cardToolAllowed() {
    try { return localStorage.getItem(CARD_TOOL_KEY) === '1'; }
    catch (e) { return false; }
  }

  /* ============================================================
     0. 样式
     ============================================================ */
  (function injectCss() {
    var old = document.getElementById('p6-css');
    if (old) old.remove();

    var s = document.createElement('style');
    s.id = 'p6-css';
    s.textContent = [

      /* ---- 1. 弹层：内容自适应，底部不加额外留白 ---- */
      '#card-view .sheet{max-height:88vh;display:flex;flex-direction:column}',
      '#card-view .sheet-body{',
      '  flex:0 1 auto !important;',
      '  min-height:0;',
      '  overflow-y:auto;',
      '  padding-bottom:0 !important;',
      '  -webkit-overflow-scrolling:touch;',
      '}',
      '#card-view .sheet-body > *:last-child{margin-bottom:0 !important}',

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

      /* ---- 5. 角色卡读取开关 ---- */
      '#card-tool-row{',
      '  display:flex;align-items:center;gap:14px;',
      '  padding:13px 15px;margin:14px 0 6px;',
      '  border:1px solid var(--line2);border-radius:16px;',
      '  background:var(--bg2);',
      '}',
      '#card-tool-row .ct-meta{flex:1 1 auto;min-width:0}',
      '#card-tool-row .ct-name{font-size:13.5px;font-weight:600;letter-spacing:-.01em}',
      '#card-tool-row .ct-sub{font-size:11.5px;color:var(--fg3);margin-top:3px;line-height:1.65}',

    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ============================================================
     1. 折叠增强
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
     2. 角色卡读取开关
     ============================================================ */

  /* ---- 工具层：按开关决定挂不挂、怎么描述 ---- */
  (function patchTools() {
    if (typeof buildToolsPayload !== 'function') return;

    var RE_CARD = /character|card/i;

    var _origBTP = buildToolsPayload;
    var _newBTP = function () {
      var r = _origBTP();
      try {
        if (!r || !Array.isArray(r.tools)) return r;

        if (!cardToolAllowed()) {
          /* 关闭：整条工具摘掉 */
          r.tools = r.tools.filter(function (t) {
            var n = (t && t.function && t.function.name) || '';
            return !RE_CARD.test(n);
          });
          if (r.map) {
            Object.keys(r.map).forEach(function (k) {
              if (RE_CARD.test(k)) delete r.map[k];
            });
          }
        } else {
          /* 开启：保留，但约束行为 */
          r.tools.forEach(function (t) {
            var n = (t && t.function && t.function.name) || '';
            if (!RE_CARD.test(n)) return;
            t.function.description =
              '读取角色卡的内容。**只有当用户明确要求「读一下角色卡」「看看这张卡的设定」时才调用**；' +
              '不要主动调用，也不要因为读到了内容就开始扮演、不要改变你原本的身份和说话方式。';
          });
        }
      } catch (e) {}
      return r;
    };

    try { buildToolsPayload = _newBTP; } catch (e) {}
    try { window.buildToolsPayload = _newBTP; } catch (e) {}
  })();

  /* ---- 界面层：角色卡页加一个开关 ---- */
  function buildCardToolUI() {
    try {
      var body = document.querySelector('#page-card .page-body');
      if (!body) return false;
      if (document.getElementById('card-tool-row')) return true;

      var row = document.createElement('div');
      row.id = 'card-tool-row';
      row.innerHTML = [
        '<div class="ct-meta">',
        '  <div class="ct-name">允许 AI 读取角色卡</div>',
        '  <div class="ct-sub" id="ct-sub">关闭时 AI 看不到角色卡，也不会自己开始扮演</div>',
        '</div>',
        '<button type="button" class="ti-toggle" id="ct-btn" title="开启 / 关闭"></button>',
      ].join('\n');

      var anchor = body.querySelector('.hint');
      if (anchor) body.insertBefore(row, anchor);
      else body.appendChild(row);

      var btn = row.querySelector('#ct-btn');
      var sub = row.querySelector('#ct-sub');

      function sync() {
        var on = cardToolAllowed();
        btn.classList.toggle('on', on);
        sub.textContent = on
          ? '开启中：AI 可按需读取角色卡（已约束它别主动扮演）'
          : '关闭时 AI 看不到角色卡，也不会自己开始扮演';
      }
      sync();

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var next = !cardToolAllowed();
        try { localStorage.setItem(CARD_TOOL_KEY, next ? '1' : '0'); } catch (err) {}
        sync();
        try {
          if (typeof toast === 'function') {
            toast(next
              ? '已允许 AI 读取角色卡（下次发消息生效）'
              : '已关闭角色卡读取，AI 不会再自己扮演');
          }
        } catch (err) {}
      });

      return true;
    } catch (e) { return false; }
  }
  window.__cardToolUI = buildCardToolUI;

  buildCardToolUI();
  setTimeout(buildCardToolUI, 600);
  setTimeout(buildCardToolUI, 1800);

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#tabbar button[data-page="card"]')) {
      setTimeout(buildCardToolUI, 60);
    }
  }, true);

  /* ============================================================
     3. 版本
     ============================================================ */
  (function bumpVer() {
    try {
      var v = document.querySelector('.ver');
      if (v) v.textContent = 'v54';
    } catch (e) {}
  })();

})();
