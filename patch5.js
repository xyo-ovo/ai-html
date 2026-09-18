/* ============================================================
   patch5.js —— 视觉精修包
   1) 修 + 按钮 / 发送按钮的垂直对齐（居中）
   2) 列表去"千篇一律"：角色卡 / 供应商 / MCP / 世界书 / 文件库
      各自有独立的视觉语言
   3) 顺带把 patch6.js 拉起来（带 ?v=55 绕开浏览器缓存）

   纯 CSS 覆盖 + 少量 JS 钩子，不改动任何渲染函数。
   ============================================================ */

/* ---------- -1. 尽早把 patch6.js 拉起来（带版本号绕缓存） ---------- */
(function loadPatch6() {
  try {
    if (document.querySelector('script[src^="patch6.js"]')) return;
    var s = document.createElement('script');
    s.src = 'patch6.js?v=55';
    s.async = false;
    s.onerror = function () {
      try { console.warn('[patch5] patch6.js 加载失败（网络？）'); } catch (e) {}
    };
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
})();

(function () {
  'use strict';

  /* ============================================================
     0. 样式
     ============================================================ */
  (function injectCss() {
    if (document.getElementById('p5-css')) return;
    var s = document.createElement('style');
    s.id = 'p5-css';
    s.textContent = [

      /* ---------------------------------------------------------
         1. 输入区对齐
         --------------------------------------------------------- */
      '.composer-inner{display:flex;align-items:center !important}',
      '.composer-inner > button,.composer-inner > .tool-btn{align-self:center !important;flex:0 0 auto;margin-top:0 !important;margin-bottom:0 !important}',
      '.composer-inner > textarea{align-self:center !important}',

      /* ---------------------------------------------------------
         2. 角色卡 —— 卡片感最强的一档
         --------------------------------------------------------- */
      '#card-list .card-item{',
      '  position:relative;',
      '  border-radius:20px !important;',
      '  padding:16px 40px 16px 18px !important;',
      '  background:var(--bg2);',
      '  background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 7%,var(--bg2)) 0%,var(--bg2) 58%) !important;',
      '  border:1px solid color-mix(in srgb,var(--acc) 20%,var(--line2)) !important;',
      '  box-shadow:0 1px 2px rgba(0,0,0,.02) !important;',
      '  transition:transform .22s cubic-bezier(.16,1,.3,1),box-shadow .24s ease,border-color .2s ease !important;',
      '}',
      '#card-list .card-item:hover{',
      '  transform:translateY(-2px) !important;',
      '  border-color:color-mix(in srgb,var(--acc) 48%,var(--line2)) !important;',
      '  box-shadow:0 14px 30px -16px color-mix(in srgb,var(--acc) 55%,transparent) !important;',
      '}',
      '#card-list .card-item::after{',
      '  content:"›";position:absolute;right:15px;top:50%;',
      '  transform:translateY(-50%) translateX(-4px);',
      '  font-size:22px;line-height:1;color:var(--acc);',
      '  opacity:0;transition:opacity .2s ease,transform .22s cubic-bezier(.16,1,.3,1);',
      '  pointer-events:none;',
      '}',
      '#card-list .card-item:hover::after{opacity:.75;transform:translateY(-50%) translateX(0)}',
      '#card-list .card-item .ci-ico{',
      '  width:46px !important;height:46px !important;',
      '  border-radius:15px !important;',
      '  background:linear-gradient(140deg,var(--acc),color-mix(in srgb,var(--acc) 62%,#3A2A1E)) !important;',
      '  box-shadow:0 7px 18px -7px color-mix(in srgb,var(--acc) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.28) !important;',
      '}',
      '#card-list .card-item .ci-ico .ic{width:21px !important;height:21px !important}',
      '#card-list .card-item .ci-t{font-size:15px !important;letter-spacing:-.015em}',

      /* ---------------------------------------------------------
         3. 供应商 —— 左色条 + 状态圆点
         --------------------------------------------------------- */
      '#provider-list .provider-item{',
      '  position:relative;',
      '  border-radius:16px !important;',
      '  padding:13px 16px !important;',
      '  overflow:hidden;',
      '  background:var(--bg2) !important;',
      '  border:1px solid var(--line2) !important;',
      '  transition:background-color .2s ease,border-color .2s ease !important;',
      '}',
      '#provider-list .provider-item::before{',
      '  content:"";position:absolute;left:0;top:10%;bottom:10%;width:3px;',
      '  border-radius:0 3px 3px 0;',
      '  background:var(--acc);',
      '  transform:scaleY(0);transform-origin:center;',
      '  transition:transform .28s cubic-bezier(.16,1,.3,1);',
      '}',
      '#provider-list .provider-item.active::before{transform:scaleY(1)}',
      '#provider-list .provider-item.active{',
      '  background:color-mix(in srgb,var(--acc) 6%,var(--bg2)) !important;',
      '  border-color:color-mix(in srgb,var(--acc) 38%,var(--line2)) !important;',
      '}',
      '#provider-list .provider-item .pi-dot{',
      '  width:10px !important;height:10px !important;',
      '  border-radius:50% !important;',
      '  background:transparent !important;',
      '  border:2px solid var(--fg3) !important;',
      '  opacity:.55;',
      '  transition:all .22s ease !important;',
      '}',
      '#provider-list .provider-item.active .pi-dot{',
      '  border-color:var(--acc) !important;',
      '  background:var(--acc) !important;',
      '  opacity:1;',
      '  box-shadow:0 0 0 3.5px color-mix(in srgb,var(--acc) 20%,transparent);',
      '}',
      '#provider-list .provider-item .pi-model{',
      '  font-family:var(--font-mono) !important;',
      '  font-size:11px !important;',
      '  opacity:.82;',
      '}',

      /* ---------------------------------------------------------
         4. MCP 工具 —— 方形图标 + 淡色底
         --------------------------------------------------------- */
      '#tool-list .tool-item{',
      '  border-radius:14px !important;',
      '  padding:12px 14px !important;',
      '  background:var(--bg2) !important;',
      '  border:1px solid var(--line2) !important;',
      '  transition:border-color .2s ease,background-color .2s ease !important;',
      '}',
      '#tool-list .tool-item:hover{',
      '  border-color:color-mix(in srgb,var(--acc) 42%,var(--line2)) !important;',
      '  background:color-mix(in srgb,var(--acc) 3%,var(--bg2)) !important;',
      '}',
      '#tool-list .tool-item .ti-icon{',
      '  width:34px !important;height:34px !important;',
      '  border-radius:10px !important;',
      '  background:color-mix(in srgb,var(--acc) 13%,transparent) !important;',
      '  color:var(--acc) !important;',
      '  box-shadow:none !important;',
      '}',
      '#tool-list .tool-item .ti-icon .ic{width:16px !important;height:16px !important}',

      /* ---------------------------------------------------------
         5. 世界书 —— 左侧书脊线
         --------------------------------------------------------- */
      '#lore-list .tool-item{',
      '  border-radius:4px 14px 14px 4px !important;',
      '  padding:12px 14px 12px 16px !important;',
      '  background:var(--bg2) !important;',
      '  border:1px solid var(--line2) !important;',
      '  border-left:3px solid color-mix(in srgb,var(--acc) 55%,transparent) !important;',
      '  transition:border-color .2s ease,background-color .2s ease !important;',
      '}',
      '#lore-list .tool-item:hover{',
      '  border-color:color-mix(in srgb,var(--acc) 35%,var(--line2)) !important;',
      '  border-left-color:var(--acc) !important;',
      '  background:color-mix(in srgb,var(--acc) 3.5%,var(--bg2)) !important;',
      '}',
      '#lore-list .tool-item .ti-icon{',
      '  background:transparent !important;',
      '  color:color-mix(in srgb,var(--acc) 80%,transparent) !important;',
      '  width:24px !important;height:24px !important;',
      '  box-shadow:none !important;',
      '}',
      '#lore-list .tool-item .ti-sub{',
      '  font-family:var(--font-mono) !important;',
      '  font-size:11px !important;',
      '  opacity:.8;',
      '}',

      /* ---------------------------------------------------------
         6. 文件库 —— 类型底色 + 右侧操作淡入
         --------------------------------------------------------- */
      '#file-list .file-row{',
      '  border-radius:16px !important;',
      '  padding:13px 15px !important;',
      '  background:var(--bg2) !important;',
      '  border:1px solid var(--line2) !important;',
      '  transition:border-color .2s ease,background-color .2s ease,transform .2s cubic-bezier(.16,1,.3,1) !important;',
      '}',
      '#file-list .file-row:hover{',
      '  transform:translateY(-1px);',
      '  border-color:color-mix(in srgb,var(--acc) 40%,var(--line2)) !important;',
      '  background:color-mix(in srgb,var(--acc) 4%,var(--bg2)) !important;',
      '}',
      '#file-list .file-row .fr-icon{',
      '  width:38px !important;height:38px !important;',
      '  border-radius:12px !important;',
      '  background:color-mix(in srgb,var(--acc) 13%,transparent) !important;',
      '  color:var(--acc) !important;',
      '}',
      '#file-list .file-row .fr-btns{',
      '  opacity:.45;',
      '  transition:opacity .2s ease;',
      '}',
      '#file-list .file-row:hover .fr-btns{opacity:1}',

      /* ---------------------------------------------------------
         7. 空态统一
         --------------------------------------------------------- */
      '#card-list .empty,#tool-list .empty,#lore-list .empty,#provider-list .empty,#file-list .empty{',
      '  padding:22px 14px !important;',
      '  border:1px dashed var(--line2);',
      '  border-radius:16px;',
      '  font-size:12.5px;',
      '  line-height:1.8;',
      '  opacity:.72;',
      '}',

    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ============================================================
     1. 对齐兜底：万一 .composer-inner 不是 flex，补成 flex
     ============================================================ */
  (function fixComposerAlign() {
    function apply() {
      try {
        var inner = document.querySelector('.composer-inner');
        if (!inner) return;
        var cs = getComputedStyle(inner);
        if (cs.display !== 'flex') {
          inner.style.display = 'flex';
          inner.style.alignItems = 'center';
        }
      } catch (e) {}
    }
    apply();
    setTimeout(apply, 300);
    setTimeout(apply, 1200);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('#tabbar button[data-page="chat"]')) setTimeout(apply, 60);
    }, true);
  })();

  /* ============================================================
     2. 版本
     ============================================================ */
  (function bumpVer() {
    try {
      var v = document.querySelector('.ver');
      if (v) v.textContent = 'v55';
    } catch (e) {}
  })();

})();
