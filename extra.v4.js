/* ============================================================
   AI HTML 工坊 · 增强补丁 v5（extra.v4.js）
   修复 v34 卡死：MutationObserver ↔ updateDiag 无限循环
   · updateDiag 改为幂等（文本不变不写 DOM）
   · Observer 加防抖 + 断开保护
   ============================================================ */

window.__EXTRA_VER = 'v35';

/* ================= 1. 语法高亮 ================= */
const KW_SET = new Set(('if else for while do switch case break continue return function class extends new this super import export from default try catch finally throw typeof instanceof delete void yield in of let const var async await static get set public private protected readonly abstract implements interface enum type namespace declare as satisfies package using struct union typedef sizeof extern inline template typename virtual override final operator ' +
  'def elif pass raise with lambda global nonlocal assert del is not and or None True False self print len range str int float list dict set tuple ' +
  'int float double char long short unsigned signed bool string define include ifdef ifndef endif pragma ' +
  'select insert update delete where join group by order having limit offset create table index drop alter null like between union all distinct ' +
  'begin end then elsif loop procedure cursor exception echo fi done esac local source').split(/\s+/).filter(Boolean));

function hlLine(s) {
  const toks = [];
  const put = (cls, t) => {
    const i = toks.length;
    toks.push('<span class="tk-' + cls + '">' + esc(t) + '</span>');
    return '\u0001' + i + '\u0001';
  };
  let r = String(s);
  r = r.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, m => put('s', m));
  r = r.replace(/(\/\/.*$|#(?!\{).*$|\/\*.*?\*\/)/g, m => put('c', m));
  r = r.replace(/\b(0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, m => put('n', m));
  r = r.replace(/[A-Za-z_$][A-Za-z0-9_$]*/g, m => KW_SET.has(m) ? put('k', m) : m);
  r = r.replace(/([{}()\[\];,.:=+\-*\/%<>!&|?~^@]+)/g, m => put('p', m));
  return esc(r).replace(/\u0001(\d+)\u0001/g, (_, i) => toks[+i]);
}

codeEl = function (lang, code) {
  const w = document.createElement('div');
  w.className = 'code-block collapsed';
  const src = String(code || '');
  const lines = src.split('\n');
  let inner;
  if (lines.length <= 600) {
    inner = lines.map((ln, i) =>
      '<span class="cl" data-n="' + (i + 1) + '">' + (hlLine(ln) || '') + '</span>'
    ).join('\n');
  } else {
    inner = esc(src);
  }
  w.innerHTML = '<div class="code-head"><span class="lang">' + icon('code') + esc(lang || 'code') +
    '</span><button class="cp">' + icon('copy') + '复制</button></div><pre><code>' + inner + '</code></pre>';
  w.querySelector('.cp').onclick = e => {
    e.stopPropagation();
    navigator.clipboard.writeText(src);
    toast('已复制');
  };
  w.querySelector('.code-head').onclick = () => w.classList.toggle('collapsed');
  return w;
};

/* ================= 2. renderMsg ================= */
renderMsg = function (msg, idx) {
  const w = document.createElement('div');
  w.className = 'msg ' + msg.role;
  w.dataset.idx = idx;

  if (msg.role === 'user') {
    const b = document.createElement('div');
    b.className = 'bubble';
    const atts = msg.attachments || [];
    if (atts.length) {
      const wrap = document.createElement('div');
      wrap.className = 'att-view';
      for (const a of atts) {
        if (a.kind === 'image') {
          const im = document.createElement('img');
          im.className = 'att-img';
          im.src = a.dataUrl;
          im.alt = a.name || '';
          im.onclick = () => { try { window.open(a.dataUrl, '_blank'); } catch (e) {} };
          wrap.appendChild(im);
        } else {
          const chip = document.createElement('div');
          chip.className = 'att-chip';
          chip.innerHTML = icon('file') + '<span>' + esc(a.name) + '</span>';
          chip.title = fmtSize(a.size) + ' · 点开查看';
          chip.onclick = () => openTextAtt(a.name, a.text);
          wrap.appendChild(chip);
        }
      }
      b.appendChild(wrap);
    }
    const hasText = typeof msg.content === 'string' && msg.content.trim();
    if (hasText) {
      const t = document.createElement('div');
      t.className = 'att-text';
      t.textContent = msg.content;
      b.appendChild(t);
    }
    if (!hasText && atts.length) b.classList.add('bare');
    if (!hasText && !atts.length) {
      const t = document.createElement('div');
      t.className = 'att-text';
      t.textContent = '（空消息）';
      b.appendChild(t);
    }
    w.appendChild(b);
  } else {
    const body = document.createElement('div');
    body.className = 'msg-body';
    if (msg.parts || msg.reasoning) renderParts(body, msg);
    else if (msg.content) body.appendChild(textEl(msg.content));
    w.appendChild(body);
  }

  const bits = [];
  if (msg.role === 'assistant' && msg.model) bits.push('<span class="meta-model">' + esc(msg.model) + '</span>');
  if (msg.time) bits.push('<span class="meta-time">' + fmtTime(msg.time) + '</span>');

  const own = usageTotal(msg.usage);
  if (own) {
    const cum = cumulativeUsage(idx);
    let txt = num(own) + ' tokens';
    if (cum > own) txt += ' · 累计 ' + num(cum);
    bits.push('<span class="meta-usage">' + txt + '</span>');
  }

  const actions = ['<button data-act="copy" title="复制">' + icon('copy') + '</button>'];
  if (msg.role === 'user' || msg.role === 'assistant') {
    actions.push('<button data-act="edit" title="编辑">' + icon('edit') + '</button>');
  }
  if (msg.role === 'assistant') {
    actions.push('<button data-act="regen" title="重新回复">' + icon('refresh') + '</button>');
    if (idx === messages.length - 1 && !streaming) {
      actions.push('<button data-act="continue" title="继续生成">' + icon('arrowDown') + '</button>');
    }
  }
  actions.push('<button data-act="del" title="删除">' + icon('trash') + '</button>');

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = '<span class="meta-info">' + bits.join('<span class="dot">·</span>') + '</span>' +
    '<span class="msg-actions">' + actions.join('') + '</span>';
  w.appendChild(meta);

  return w;
};

/* ================= 3. startEdit ================= */
startEdit = function (idx) {
  if (streaming) { toast('生成中，先停止再操作'); return; }
  const msg = messages[idx];
  if (!msg) return;
  if (msg.role !== 'user' && msg.role !== 'assistant') return;
  editingIndex = idx;
  switchPage('chat');
  const input = $('#input');
  input.value = msg.role === 'assistant'
    ? String(msg.raw || msg.content || '')
    : (typeof msg.content === 'string' ? msg.content : '');
  autoGrow();
  const bar = $('#edit-bar');
  if (bar) {
    const sp = bar.querySelector('span');
    if (sp) {
      sp.textContent = msg.role === 'assistant'
        ? '编辑 AI 回复 · 发送后作为你的消息重新生成'
        : '编辑中 · 发送后将从这条重新生成';
    }
    bar.classList.remove('hidden');
  }
  input.focus();
  try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
};

/* ================= 4. finalize ================= */
finalize = async function (msg, idx, segs, reasoning, thinkSecs, base) {
  const parts = [];
  const usedNames = new Set();
  for (const s of segs) {
    if (s.type === 'tool') {
      parts.push({ type: 'tool', name: s.name, server: s.server, status: s.status, result: s.result });
      continue;
    }
    if (s.type !== 'text') continue;
    for (const seg of parseSegments(s.text)) {
      if (seg.type === 'text') {
        if (seg.text.trim()) parts.push({ type: 'text', text: seg.text });
        continue;
      }
      const k = fileKind(seg.lang, seg.code);
      let bname = fileBaseName(seg.lang, seg.code) || '文件';
      bname = bname.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40) || '文件';
      let name = bname + '.' + k.ext;
      let n = 2;
      while (usedNames.has(name)) { name = bname + ' ' + n + '.' + k.ext; n++; }
      usedNames.add(name);
      const id = uid();
      await dbPut({ id, name, code: seg.code, ts: Date.now(), preview: k.preview, label: k.label, saved: false });
      parts.push({ type: 'file', fileId: id, name, preview: k.preview, label: k.label });
    }
  }
  const raw = segs.filter(s => s.type === 'text').map(s => s.text).join('\n\n');
  if (base) {
    msg.parts = [...(base.parts || []), ...parts];
    msg.content = (base.content || '') + raw;
    msg.raw = (base.raw || '') + raw;
  } else {
    msg.parts = parts;
    msg.content = raw;
    msg.raw = raw;
  }
  if (reasoning) { msg.reasoning = reasoning; msg.thinkSecs = thinkSecs; }
  const old = $msgs.querySelector('.msg[data-idx="' + idx + '"]');
  if (old) old.replaceWith(renderMsg(msg, idx));
  else renderMessages();
};

/* ================= 5. 角色卡：解析 ================= */
function cardStr(v) { return String(v == null ? '' : v); }
function cardArr(v) {
  if (Array.isArray(v)) return v.map(cardStr).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return v ? [cardStr(v)] : [];
}

function parseCardJson(json) {
  const d = (json && (json.data || json)) || {};

  const fields = {
    name: cardStr(d.name || d.char_name) || '未命名角色',
    description: cardStr(d.description),
    personality: cardStr(d.personality),
    scenario: cardStr(d.scenario),
    first_mes: cardStr(d.first_mes || d.greeting),
    mes_example: cardStr(d.mes_example || d.example_dialogue),
    creator_notes: cardStr(d.creator_notes || d.creatorcomment),
    system_prompt: cardStr(d.system_prompt),
    post_history_instructions: cardStr(d.post_history_instructions),
    creator: cardStr(d.creator),
    character_version: cardStr(d.character_version),
    tags: cardArr(d.tags),
    alternate_greetings: cardArr(d.alternate_greetings),
  };

  const bookSrc = d.character_book || d.world_info || d.worldInfo || null;
  const book = { name: '', entries: [] };
  if (bookSrc) {
    if (Array.isArray(bookSrc)) {
      book.entries = bookSrc;
    } else {
      book.name = cardStr(bookSrc.name);
      book.entries = Array.isArray(bookSrc.entries) ? bookSrc.entries : [];
    }
  }
  book.entries = book.entries.map((e, i) => {
    const kk = cardArr(e.keys || e.key || e.keywords);
    const sk = cardArr(e.secondary_keys || e.secondaryKeys || e.keysecondary);
    let ord = 100;
    if (typeof e.insertion_order === 'number') ord = e.insertion_order;
    else if (typeof e.insertionOrder === 'number') ord = e.insertionOrder;
    else if (typeof e.order === 'number') ord = e.order;
    return {
      id: 'e' + i,
      name: cardStr(e.comment || e.name) || kk[0] || ('条目 ' + (i + 1)),
      keys: kk,
      secondary_keys: sk,
      content: cardStr(e.content || e.entry),
      enabled: e.enabled !== false && e.disable !== true,
      insertion_order: ord,
      constant: !!e.constant,
      case_sensitive: !!(e.case_sensitive || e.caseSensitive),
    };
  });

  const ex = d.extensions || {};
  const rxSrc = ex.regex_scripts || ex.Regex || d.regex_scripts || [];
  const regex = (Array.isArray(rxSrc) ? rxSrc : []).map((r, i) => ({
    id: 'r' + i,
    name: cardStr(r.scriptName || r.name) || ('正则 ' + (i + 1)),
    findRegex: cardStr(r.findRegex),
    replaceString: cardStr(r.replaceString),
    disabled: !!r.disabled,
  }));

  return { fields, book, regex };
}

function cardStats(card) {
  const nBook = ((card.book && card.book.entries) || []).length;
  const nRx = (card.regex || []).length;
  const bits = [];
  if (nBook) bits.push(nBook + ' 条世界书');
  if (nRx) bits.push(nRx + ' 条正则');
  if (!bits.length) bits.push('仅人设');
  return bits.join(' · ');
}

function cardBrief(card) {
  const f = card.fields || {};
  const L = [];
  L.push('名称：' + f.name);
  if (f.creator) L.push('作者：' + f.creator + (f.character_version ? ' / ' + f.character_version : ''));
  if (f.tags && f.tags.length) L.push('标签：' + f.tags.join('、'));
  const put = (label, v) => { if (v) L.push('【' + label + '】\n' + v); };
  put('描述', f.description);
  put('性格', f.personality);
  put('场景', f.scenario);
  put('开场白', f.first_mes);
  put('对话示例', f.mes_example);
  put('系统提示', f.system_prompt);
  put('历史后指令', f.post_history_instructions);
  if (f.alternate_greetings && f.alternate_greetings.length) {
    L.push('【备用开场白】');
    f.alternate_greetings.forEach((g, i) => L.push('(' + (i + 1) + ') ' + g));
  }
  const es = (card.book && card.book.entries) || [];
  if (es.length) {
    L.push('【世界书 · ' + es.length + ' 条】');
    es.forEach((e, i) => {
      L.push('#' + (i + 1) + ' ' + e.name + (e.enabled === false ? '（已关闭）' : '') + (e.constant ? '（常驻）' : ''));
      L.push('关键词：' + (e.keys.join(', ') || '无') + (e.secondary_keys.length ? ' ｜ 次关键词：' + e.secondary_keys.join(', ') : ''));
      L.push('内容：' + e.content);
    });
  }
  const rs = card.regex || [];
  if (rs.length) {
    L.push('【正则 · ' + rs.length + ' 条】');
    rs.forEach((r, i) => {
      L.push('#' + (i + 1) + ' ' + r.name + (r.disabled ? '（已禁用）' : ''));
      L.push('find：' + r.findRegex);
      L.push('replace：' + r.replaceString);
    });
  }
  return L.join('\n');
}

function bookToSTJson(card) {
  const es = (card.book && card.book.entries) || [];
  const out = {};
  es.forEach((e, i) => {
    out[String(i)] = {
      uid: i,
      key: e.keys,
      keysecondary: e.secondary_keys || [],
      comment: e.name,
      content: e.content,
      constant: !!e.constant,
      vectorized: false,
      selective: true,
      selectiveLogic: 0,
      addMemo: true,
      order: typeof e.insertion_order === 'number' ? e.insertion_order : 100,
      position: 0,
      disable: e.enabled === false,
      excludeRecursion: false,
      preventRecursion: false,
      delayUntilRecursion: false,
      probability: 100,
      useProbability: true,
      depth: 4,
      group: '',
      groupOverride: false,
      groupWeight: 100,
      scanDepth: null,
      caseSensitive: !!e.case_sensitive,
      matchWholeWords: null,
      useGroupScoring: null,
      automationId: '',
      role: null,
      sticky: 0,
      cooldown: 0,
      delay: 0,
      displayIndex: i,
    };
  });
  return JSON.stringify({ entries: out }, null, 2);
}

function readCardForAI(name, section) {
  const sec = String(section || 'all').toLowerCase();
  let list = LS.cards || [];
  if (name) {
    const q = String(name).toLowerCase();
    const hit = list.filter(c => String(c.name || '').toLowerCase().includes(q));
    if (hit.length) list = hit;
  }
  if (!list.length) {
    const names = (LS.cards || []).map(c => c.name).join('、');
    return names ? ('没有找到匹配的角色卡。当前已导入：' + names) : '当前没有导入任何角色卡。';
  }
  const out = [];
  for (const c of list) {
    if (sec === 'all') {
      out.push(cardBrief(c));
    } else if (sec === 'book') {
      const es = (c.book && c.book.entries) || [];
      out.push('【' + c.name + ' · 世界书 ' + es.length + ' 条】');
      es.forEach((e, i) => {
        out.push('#' + (i + 1) + ' ' + e.name + (e.enabled === false ? '（已关闭）' : '') + (e.constant ? '（常驻）' : ''));
        out.push('关键词：' + (e.keys.join(', ') || '无'));
        if (e.secondary_keys.length) out.push('次关键词：' + e.secondary_keys.join(', '));
        out.push('内容：' + e.content);
      });
    } else if (sec === 'regex') {
      const rs = c.regex || [];
      out.push('【' + c.name + ' · 正则 ' + rs.length + ' 条】');
      rs.forEach((r, i) => {
        out.push('#' + (i + 1) + ' ' + r.name + (r.disabled ? '（已禁用）' : ''));
        out.push('find：' + r.findRegex);
        out.push('replace：' + r.replaceString);
      });
    } else {
      const f = c.fields || {};
      out.push('【' + c.name + ' · 基础字段】');
      ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example', 'system_prompt', 'post_history_instructions', 'creator', 'character_version']
        .forEach(k => { if (f[k]) out.push(k + '：' + f[k]); });
      if (f.tags && f.tags.length) out.push('tags：' + f.tags.join('、'));
    }
  }
  let s = out.join('\n\n');
  if (s.length > 30000) s = s.slice(0, 30000) + '\n…（内容过长已截断）';
  return s;
}

/* ================= 6. prompt / tools 覆盖 ================= */
const _origBSP = buildSystemPrompt;
buildSystemPrompt = function () {
  let base = _origBSP();
  const cards = (LS.cards || []).filter(c => c.active !== false);
  if (!cards.length) return base;
  let s = '\n\n【已导入的角色卡资料（供参考 / 可修改）】\n' +
    cards.map(c => '──── ' + c.name + ' ────\n' + cardBrief(c)).join('\n\n');
  if (s.length > 16000) s = s.slice(0, 16000) + '\n…（已截断，可用 read_character_card 工具读取完整内容）';
  return base + s;
};

const _origBTP = buildToolsPayload;
buildToolsPayload = function () {
  const r = _origBTP();
  const cards = (LS.cards || []).filter(c => c.active !== false);
  if (cards.length) {
    const used = new Set(r.tools.map(t => t.function && t.function.name));
    if (!used.has('read_character_card')) {
      r.tools.push({
        type: 'function',
        function: {
          name: 'read_character_card',
          description: '读取已导入角色卡的完整数据。用于帮用户检查或修改人设字段、世界书条目（含关键词、开关、内容）、正则脚本（find/replace）。',
          parameters: {
            type: 'object',
            properties: {
              card: { type: 'string', description: '角色卡名称（模糊匹配），留空读取全部' },
              section: { type: 'string', description: '要读的部分：all（默认）/ fields / book / regex' },
            },
          },
        },
      });
      r.map['read_character_card'] = { builtin: 'card' };
    }
  }
  return r;
};

/* ================= 7. runAssistant ================= */
let continueMode = false;

runAssistant = async function () {
  const p = activeProvider();
  if (!p) return;
  const append = continueMode;

  let aMsg, idx, el, base = null;

  if (append) {
    idx = messages.length - 1;
    aMsg = messages[idx];
    if (!aMsg || aMsg.role !== 'assistant') { toast('最后一条不是 AI 的回复'); return; }
    el = $msgs.querySelector('.msg[data-idx="' + idx + '"]');
    if (!el) { renderMessages(); el = $msgs.querySelector('.msg[data-idx="' + idx + '"]'); }
    if (!el) return;
    base = { parts: (aMsg.parts || []).slice(), content: aMsg.content || '', raw: aMsg.raw || '' };
  } else {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') { toast('前面需要有一条用户消息'); return; }
    aMsg = { role: 'assistant', content: '', time: Date.now(), model: p.model };
    messages.push(aMsg);
    idx = messages.length - 1;
    el = renderMsg(aMsg, idx);
    el.classList.add('msg-new');
    $msgs.appendChild(el);
    renderStream(el, '', [], '', true);
    if (autoScroll) scrollDown();
  }

  setStreaming(true);
  abortCtrl = new AbortController();

  const segs = [];
  let accR = '';
  let usage = null;
  let tStart = 0, tEnd = 0;
  let errMsg = '', aborted = false;

  const url = p.base.replace(/\/+$/, '') + '/chat/completions';
  const sys = buildSystemPrompt();
  const extra = reasoningParams(p);
  const { tools, map } = buildToolsPayload();

  const src = append ? messages.slice() : messages.slice(0, -1);
  const hist = [];
  for (const m of src) {
    if (m.role === 'user') {
      const built = buildUserContent(m);
      const prev = hist[hist.length - 1];
      const canMerge = prev && prev.role === 'user'
        && typeof prev.content === 'string' && typeof built === 'string';
      if (canMerge) prev.content += '\n\n' + built;
      else hist.push({ role: 'user', content: built });
      continue;
    }
    const c = typeof m.content === 'string' ? m.content.trim() : '';
    if (!c) continue;
    if (c.startsWith('⚠️')) continue;
    const prev = hist[hist.length - 1];
    if (prev && prev.role === 'assistant' && typeof prev.content === 'string') prev.content += '\n\n' + c;
    else hist.push({ role: 'assistant', content: c });
  }
  const msgs = [{ role: 'system', content: sys }, ...hist];

  try {
    for (let round = 0; round < 6; round++) {
      let roundText = '';
      const toolCalls = [];

      const body = { model: p.model, stream: true, ...extra, messages: msgs };
      if (streamOptionsOK) body.stream_options = { include_usage: true };
      if (tools.length) body.tools = tools;

      const doFetch = () => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
        body: JSON.stringify(body),
        signal: abortCtrl.signal,
      });

      let res = await doFetch();
      if (!res.ok && res.status === 400 && body.stream_options) {
        streamOptionsOK = false;
        delete body.stream_options;
        res = await doFetch();
      }
      if (!res.ok) {
        const t = await res.text();
        const err = new Error('HTTP ' + res.status + '：' + t.slice(0, 300));
        err.status = res.status;
        throw err;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          let j;
          try { j = JSON.parse(data); } catch { continue; }
          if (j.usage) usage = j.usage;

          const d = j.choices?.[0]?.delta || {};

          let rc = '';
          if (typeof d.reasoning_content === 'string') rc = d.reasoning_content;
          else if (typeof d.reasoning === 'string') rc = d.reasoning;
          else if (typeof d.thinking === 'string') rc = d.thinking;
          if (Array.isArray(d.reasoning_details)) {
            rc += d.reasoning_details.map(x => (x && (x.text || x.content)) || '').join('');
          }
          if (rc) {
            if (!tStart) tStart = Date.now();
            tEnd = Date.now();
            accR += rc;
          }

          if (Array.isArray(d.tool_calls)) {
            for (const tc of d.tool_calls) {
              const ti = tc.index ?? 0;
              if (!toolCalls[ti]) toolCalls[ti] = { id: '', name: '', args: '' };
              if (tc.id) toolCalls[ti].id = tc.id;
              if (tc.function && tc.function.name) toolCalls[ti].name += tc.function.name;
              if (tc.function && tc.function.arguments) toolCalls[ti].args += tc.function.arguments;
            }
          }

          const dc = d.content ?? j.choices?.[0]?.text ?? '';
          if (dc) roundText += dc;
          if (rc || dc) scheduleStream(el, append ? '' : accR, segs, roundText, true);
        }
      }

      const calls = toolCalls.filter(t => t && t.name);

      if (!calls.length) {
        if (roundText.trim()) segs.push({ type: 'text', text: roundText });
        break;
      }

      msgs.push({
        role: 'assistant',
        content: roundText || null,
        tool_calls: calls.map(t => ({ id: t.id || ('call_' + uid()), type: 'function', function: { name: t.name, arguments: t.args || '{}' } })),
      });
      if (roundText.trim()) segs.push({ type: 'text', text: roundText });

      for (const t of calls) {
        const target = map[t.name];
        const serverName = target
          ? (target.builtin ? '内置' : ((LS.tools.find(s => s.id === target.serverId) || {}).name || ''))
          : '';
        const seg = { type: 'tool', name: t.name, server: serverName, status: 'running', result: '' };
        segs.push(seg);
        renderStream(el, append ? '' : accR, segs, '', false);
        if (autoScroll) scrollDown();

        let out = '';
        if (!target) {
          seg.status = 'error';
          out = '未知工具：' + t.name + '（可能已停用）';
        } else {
          try {
            let args = {};
            try { args = JSON.parse(t.args || '{}'); } catch (e) { args = {}; }
            if (target.builtin === 'history') {
              out = searchHistory(args.keyword || args.query || args.q);
            } else if (target.builtin === 'card') {
              out = readCardForAI(args.card || args.name, args.section);
            } else {
              const server = LS.tools.find(s => s.id === target.serverId);
              out = await mcpCallTool(server, target.toolName, args);
            }
            seg.status = 'ok';
          } catch (e) {
            seg.status = 'error';
            out = (e && (e.message || String(e))) || '调用失败';
          }
        }
        seg.result = out;
        renderStream(el, append ? '' : accR, segs, '', false);
        if (autoScroll) scrollDown();
        msgs.push({ role: 'tool', tool_call_id: t.id || ('call_' + uid()), content: out || '(空)' });
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') aborted = true;
    else errMsg = e.message || String(e);
  }

  if (streamRaf) { cancelAnimationFrame(streamRaf); streamRaf = 0; streamPending = null; }

  const secs = tStart && tEnd ? Math.max(1, Math.round((tEnd - tStart) / 1000)) : 0;
  setStreaming(false);
  abortCtrl = null;

  if (errMsg) {
    if (!append) {
      messages.pop();
      const errEl = document.createElement('div');
      errEl.className = 'msg assistant';
      const d = document.createElement('div');
      d.className = 'bubble error-bubble';
      d.textContent = '⚠️ 出错了：' + errMsg;
      errEl.appendChild(d);
      el.replaceWith(errEl);
    } else {
      toast('继续生成失败：' + errMsg, 3200);
      const o2 = $msgs.querySelector('.msg[data-idx="' + idx + '"]');
      if (o2 && aMsg) o2.replaceWith(renderMsg(aMsg, idx));
    }
    saveMessages();
    if (autoScroll) scrollDown();
    return;
  }

  const hasAny = segs.some(s => (s.type === 'text' && s.text.trim()) || s.type === 'tool') || accR.trim();
  if (aborted && !hasAny && !append) {
    messages.pop();
    el.remove();
    saveMessages();
    toast('已停止生成');
    return;
  }

  aMsg.usage = usage || null;
  await finalize(aMsg, idx, segs, append ? '' : accR, secs, base);
  if (aborted) toast('已停止生成');
  saveMessages();
  if (autoScroll) scrollDown();
  if (append) toast('已继续生成');
};

async function continueGen() {
  if (streaming) { toast('正在生成中…'); return; }
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') { toast('最后一条不是 AI 的回复'); return; }
  if (!activeProvider()) { toast('先去设置页添加 API'); switchPage('settings'); return; }
  continueMode = true;
  try { await runAssistant(); }
  finally { continueMode = false; }
}

/* ================= 8. send ================= */
send = async function () {
  if (streaming) return;
  const text = $('#input').value.trim();
  const atts = pendingAtts.slice();
  if (!text && !atts.length) return;
  const p = activeProvider();
  if (!p) { toast('先去设置页添加 API'); switchPage('settings'); return; }

  $('#input').value = '';
  autoGrow();
  closeAttachMenu();

  if (editingIndex !== null) {
    const idx = editingIndex;
    editingIndex = null;
    const bar = $('#edit-bar');
    if (bar) bar.classList.add('hidden');
    const old = messages[idx];
    if (old && old.role === 'assistant') {
      messages[idx] = { role: 'user', content: text, attachments: atts, time: Date.now() };
    } else if (old) {
      old.content = text;
      old.time = Date.now();
      if (atts.length) old.attachments = atts;
    }
    messages.splice(idx + 1);
    pendingAtts = [];
    renderAttachBar();
    saveMessages();
    autoScroll = true;
    renderMessages();
    scrollDown();
    await runAssistant();
    return;
  }

  messages.push({ role: 'user', content: text, attachments: atts, time: Date.now() });
  pendingAtts = [];
  renderAttachBar();
  saveMessages();
  autoScroll = true;
  renderMessages(messages.length - 1);
  scrollDown();
  await runAssistant();
};

/* ================= 9. 角色卡：导入 ================= */
function b64ToUtf8(b64) {
  const clean = String(b64 || '').replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

async function readPngChara(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length < 16) return { err: '文件太小，不是有效 PNG' };
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) return { err: '不是 PNG 文件（缺少 PNG 签名）' };
  }
  const dec = new TextDecoder('latin1');
  let pos = 8;
  let found = null;
  while (pos + 8 <= buf.length) {
    const len = (buf[pos] << 24) | (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3];
    if (len < 0 || pos + 12 + len > buf.length) break;
    const type = dec.decode(buf.slice(pos + 4, pos + 8));
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'tEXt' || type === 'iTXt') {
      const sep = data.indexOf(0);
      if (sep > 0) {
        const key = dec.decode(data.slice(0, sep));
        let val = '';
        if (type === 'tEXt') {
          val = dec.decode(data.slice(sep + 1));
        } else {
          let i2 = sep + 3;
          const l2 = data.indexOf(0, i2);
          if (l2 >= 0) {
            i2 = l2 + 1;
            const l3 = data.indexOf(0, i2);
            if (l3 >= 0) {
              i2 = l3 + 1;
              val = new TextDecoder('utf-8').decode(data.slice(i2));
            }
          }
        }
        if (val && (key === 'chara' || key === 'ccv3' || key === 'Chara' || key === 'CCv3')) {
          found = val;
          break;
        }
      }
    }
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  if (!found) return { err: 'PNG 里没找到 chara / ccv3 数据块（可能不是角色卡）' };
  return { val: found };
}

async function importCardFile(file) {
  const fname = String(file.name || '').toLowerCase();
  let json = null;

  try {
    if (fname.endsWith('.png') || /^image\/png/.test(file.type || '')) {
      const r = await readPngChara(file);
      if (r.err) { toast('导入失败：' + r.err, 4000); return; }
      let txt = String(r.val || '').trim();
      if (!txt.startsWith('{')) {
        try { txt = b64ToUtf8(r.val); }
        catch (e) { toast('导入失败：base64 解码出错', 4000); return; }
      }
      try { json = JSON.parse(txt); }
      catch (e) { toast('导入失败：数据不是合法 JSON', 4000); return; }
    } else {
      const txt = await readAsText(file);
      try { json = JSON.parse(txt); }
      catch (e) { toast('导入失败：JSON 格式不对', 4000); return; }
    }
  } catch (e) {
    toast('读取失败：' + ((e && e.message) || '未知错误'), 4000);
    return;
  }

  if (!json || typeof json !== 'object') { toast('角色卡内容无效', 3200); return; }

  const parsed = parseCardJson(json);
  const card = {
    id: uid(),
    name: parsed.fields.name,
    ts: Date.now(),
    active: true,
    fields: parsed.fields,
    book: parsed.book,
    regex: parsed.regex,
  };

  const arr = LS.cards.slice();
  arr.unshift(card);
  try {
    LS.cards = arr;
  } catch (e) {
    toast('角色卡太大，localStorage 存不下了', 3600);
    return;
  }

  renderCardList();
  const nB = parsed.book.entries.length;
  const nR = parsed.regex.length;
  toast('已导入「' + card.name + '」' +
    (nB ? ' · ' + nB + ' 条世界书' : '') +
    (nR ? ' · ' + nR + ' 条正则' : '') +
    '（只存在这张卡里，未动全局世界书）', 3600);
}

/* ================= 10. 角色卡：列表 / 详情 ================= */
function renderCardList() {
  const box = document.getElementById('card-list');
  if (!box) return;
  const list = LS.cards || [];
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<div class="empty" style="padding:20px">还没有角色卡<br>导入一张 PNG 或 JSON 试试</div>';
    return;
  }
  for (const c of list) {
    const d = document.createElement('div');
    d.className = 'card-item';
    d.dataset.cid = c.id;
    d.innerHTML = '<div class="ci-ico">' + icon('card') + '</div>' +
      '<div class="ci-meta">' +
        '<div class="ci-t">' + esc(c.name) + '</div>' +
        '<div class="ci-s">' + esc(cardStats(c)) + ' · ' + fmtTime(c.ts) + '</div>' +
      '</div>' +
      '<button class="ti-toggle' + (c.active !== false ? ' on' : '') + '" title="参与对话"></button>' +
      '<button class="ti-edit" title="查看 / 编辑">' + icon('edit') + '</button>';
    box.appendChild(d);
  }
}

let curCardId = null;

function openCardView(id) {
  curCardId = id;
  renderCardView();
  openSheet('card-view');
}

function renderCardView() {
  const c = (LS.cards || []).find(x => x.id === curCardId);
  const body = document.getElementById('cv-body');
  if (!c || !body) return;
  const ttl = document.getElementById('cv-title');
  if (ttl) ttl.textContent = c.name;

  const f = c.fields || {};
  const sec = (title, inner, extraBtn) =>
    '<div class="cv-sec"><h3>' + title + (extraBtn || '') + '</h3>' + inner + '</div>';
  const field = (label, v) => v
    ? '<div class="cv-field"><div class="k">' + label + '</div><pre>' + esc(v) + '</pre></div>'
    : '';

  let html = '';

  html += sec('概览',
    '<div class="cv-field"><div class="k">名称</div><pre>' + esc(f.name) + '</pre></div>' +
    field('作者', f.creator) +
    field('版本', f.character_version) +
    field('标签', (f.tags || []).join('、')) +
    field('作者备注', f.creator_notes) +
    '<div class="cv-field"><div class="k">状态</div><pre>' +
      (c.active !== false ? '参与对话（内容会注入系统提示，AI 可读）' : '已停止参与对话') +
    '</pre></div>'
  );

  html += sec('人设字段',
    field('描述 description', f.description) +
    field('性格 personality', f.personality) +
    field('场景 scenario', f.scenario) +
    field('开场白 first_mes', f.first_mes) +
    field('对话示例 mes_example', f.mes_example) +
    field('系统提示 system_prompt', f.system_prompt) +
    field('历史后指令 post_history_instructions', f.post_history_instructions) +
    ((f.alternate_greetings || []).length
      ? '<div class="cv-field"><div class="k">备用开场白（' + f.alternate_greetings.length + ' 条）</div><pre>' +
        esc(f.alternate_greetings.map((g, i) => '(' + (i + 1) + ') ' + g).join('\n\n')) + '</pre></div>'
      : '')
  );

  const es = (c.book && c.book.entries) || [];
  const bookBtns = '<span class="cv-btns">' +
    '<button class="mini" id="cv-copy-book" title="复制成 ST 世界书 JSON">复制 JSON</button>' +
    '<button class="mini" id="cv-to-global" title="手动复制到全局世界书">导入全局</button>' +
  '</span>';
  let bookHtml = '';
  if (!es.length) {
    bookHtml = '<div class="hint">这张卡没有内嵌世界书</div>';
  } else {
    bookHtml += '<div class="hint" style="margin-bottom:10px">共 ' + es.length + ' 条 · 这里的开关只影响「注入给 AI」，不改你的 ST 文件。</div>';
    es.forEach((e, i) => {
      bookHtml += '<div class="cv-entry' + (e.enabled === false ? ' off' : '') + '" data-eid="' + esc(e.id) + '">' +
        '<div class="eh">' +
          '<span class="en">#' + (i + 1) + ' ' + esc(e.name) + (e.constant ? ' · 常驻' : '') + '</span>' +
          '<button class="ti-toggle' + (e.enabled !== false ? ' on' : '') + '" title="开关"></button>' +
        '</div>' +
        '<div class="ek">' + esc(e.keys.join(' , ') || '（无关键词）') +
          (e.secondary_keys.length ? ' ｜ ' + esc(e.secondary_keys.join(' , ')) : '') + '</div>' +
        '<div class="ec">' + esc(e.content) + '</div>' +
      '</div>';
    });
  }
  html += sec('世界书 · ' + es.length + ' 条', bookHtml, bookBtns);

  const rs = c.regex || [];
  let rxHtml = '';
  if (!rs.length) {
    rxHtml = '<div class="hint">这张卡没有正则脚本</div>';
  } else {
    rs.forEach((r, i) => {
      rxHtml += '<div class="cv-entry' + (r.disabled ? ' off' : '') + '">' +
        '<div class="eh"><span class="en">#' + (i + 1) + ' ' + esc(r.name) + (r.disabled ? ' · 已禁用' : '') + '</span></div>' +
        '<div class="ek">find：' + esc(r.findRegex) + '</div>' +
        '<div class="ec">replace：' + esc(r.replaceString) + '</div>' +
      '</div>';
    });
  }
  html += sec('正则脚本 · ' + rs.length + ' 条', rxHtml);

  html += '<div class="row between" style="margin-top:6px;padding-top:16px;border-top:1px solid var(--line)">' +
    '<button class="ghost danger" id="cv-del">删除这张卡</button>' +
    '<button class="ghost" id="cv-copy-all">复制全部数据</button>' +
  '</div>';

  body.innerHTML = html;
}

/* ================= 11. 事件委托 ================= */
document.addEventListener('click', function (e) {
  const t = e.target;
  if (!t || !t.closest) return;

  if (t.closest('.msg-actions button[data-act="continue"]')) {
    e.preventDefault();
    e.stopPropagation();
    continueGen();
    return;
  }

  const regenBtn = t.closest('.msg-actions button[data-act="regen"]');
  if (regenBtn) {
    e.preventDefault();
    e.stopPropagation();
    const msgEl = regenBtn.closest('.msg');
    if (!msgEl) return;
    const idx = Number(msgEl.dataset.idx);
    if (streaming) { toast('正在生成中…'); return; }
    if (idx !== messages.length - 1 && !confirm('重新回复会移除这条及之后的消息，继续？')) return;
    const keepTop = $chat.scrollTop;
    const wasBottom = nearBottom();
    messages.splice(idx);
    saveMessages();
    renderMessages();
    if (wasBottom) { autoScroll = true; scrollDown(); }
    else { autoScroll = false; $chat.scrollTop = keepTop; }
    runAssistant();
    return;
  }

  if (t.closest('#btn-import-card')) {
    e.preventDefault();
    e.stopPropagation();
    const pick = document.getElementById('pick-card');
    if (pick) pick.click();
    else toast('找不到文件选择器（pick-card）', 3000);
    return;
  }

  const cardToggle = t.closest('.card-item .ti-toggle');
  if (cardToggle) {
    e.preventDefault();
    e.stopPropagation();
    const item = cardToggle.closest('.card-item');
    const cid = item && item.dataset.cid;
    if (!cid) return;
    const arr = LS.cards.slice();
    const c = arr.find(x => x.id === cid);
    if (!c) return;
    c.active = c.active === false;
    LS.cards = arr;
    cardToggle.classList.toggle('on', c.active !== false);
    toast(c.active === false ? '已停止参与对话' : '已参与对话');
    return;
  }

  const cardEdit = t.closest('.card-item .ti-edit');
  if (cardEdit) {
    e.preventDefault();
    e.stopPropagation();
    const item = cardEdit.closest('.card-item');
    if (item && item.dataset.cid) openCardView(item.dataset.cid);
    return;
  }
  const cardItem = t.closest('.card-item');
  if (cardItem && cardItem.dataset.cid) {
    openCardView(cardItem.dataset.cid);
    return;
  }

  const entryToggle = t.closest('#cv-body .cv-entry .ti-toggle');
  if (entryToggle) {
    e.preventDefault();
    e.stopPropagation();
    const wrap = entryToggle.closest('.cv-entry');
    const eid = wrap && wrap.dataset.eid;
    if (!eid) return;
    const arr = LS.cards.slice();
    const card = arr.find(x => x.id === curCardId);
    if (!card) return;
    const entry = (card.book.entries || []).find(x => x.id === eid);
    if (!entry) return;
    entry.enabled = entry.enabled === false;
    LS.cards = arr;
    wrap.classList.toggle('off', entry.enabled === false);
    entryToggle.classList.toggle('on', entry.enabled !== false);
    toast(entry.enabled === false ? '已关闭该条目' : '已开启该条目');
    return;
  }

  if (t.closest('#cv-del')) {
    e.preventDefault();
    const arr = LS.cards || [];
    const c = arr.find(x => x.id === curCardId);
    if (!c) return;
    if (!confirm('删除角色卡「' + c.name + '」？')) return;
    LS.cards = arr.filter(x => x.id !== c.id);
    closeSheet('card-view');
    renderCardList();
    toast('已删除');
    return;
  }

  if (t.closest('#cv-copy-all')) {
    e.preventDefault();
    const c = (LS.cards || []).find(x => x.id === curCardId);
    if (!c) return;
    navigator.clipboard.writeText(cardBrief(c)).then(
      () => toast('已复制全部数据'),
      () => toast('复制失败，可手动选中')
    );
    return;
  }

  if (t.closest('#cv-copy-book')) {
    e.preventDefault();
    const c = (LS.cards || []).find(x => x.id === curCardId);
    if (!c) return;
    const es = (c.book && c.book.entries) || [];
    if (!es.length) { toast('这张卡没有世界书'); return; }
    navigator.clipboard.writeText(bookToSTJson(c)).then(
      () => toast('已复制 ' + es.length + ' 条世界书（ST 格式）', 2800),
      () => toast('复制失败，可手动选中')
    );
    return;
  }

  if (t.closest('#cv-to-global')) {
    e.preventDefault();
    const c = (LS.cards || []).find(x => x.id === curCardId);
    if (!c) return;
    const es = (c.book && c.book.entries) || [];
    if (!es.length) { toast('这张卡没有世界书'); return; }
    if (!confirm('把「' + c.name + '」的 ' + es.length + ' 条世界书复制到全局世界书？\n\n注意：全局世界书对所有对话生效，会一起注入给 AI。')) return;
    const arr = LS.lore.slice();
    for (const e of es) {
      arr.push({
        id: uid(),
        name: e.name + '（' + c.name + '）',
        keywords: e.keys.join(','),
        content: e.content,
        enabled: e.enabled !== false,
      });
    }
    LS.lore = arr;
    renderLore();
    toast('已导入 ' + es.length + ' 条到全局世界书', 3000);
    return;
  }
}, true);

/* ================= 12. 绑定（幂等 + 防死循环） ================= */
let _cardBound = false;

function bindCardImport() {
  const btn = document.getElementById('btn-import-card');
  const pick = document.getElementById('pick-card');
  if (!btn || !pick) return false;

  if (btn.dataset.bound !== '1') {
    btn.dataset.bound = '1';
    btn.onclick = function (ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      try { pick.click(); } catch (e) { toast('无法打开文件选择器', 3000); }
    };
  }

  if (pick.dataset.bound !== '1') {
    pick.dataset.bound = '1';
    pick.addEventListener('change', function () {
      const fs = pick.files;
      if (fs && fs.length) {
        (async () => {
          for (let i = 0; i < fs.length; i++) await importCardFile(fs[i]);
        })();
      }
      pick.value = '';
    });
  }

  _cardBound = true;
  updateDiag();
  return true;
}

/* 幂等：文本没变就不写 DOM（否则会触发 MutationObserver 死循环） */
let _lastDiag = '';
function updateDiag() {
  const el = document.getElementById('card-diag');
  if (!el) return;
  const appOk = (typeof buildSystemPrompt === 'function');
  const btnOk = !!document.getElementById('btn-import-card');
  const pickOk = !!document.getElementById('pick-card');
  const txt = '脚本 ' + window.__EXTRA_VER +
    ' · 核心 ' + (appOk ? '✓' : '✗') +
    ' · 导入按钮 ' + (btnOk ? '✓' : '✗') +
    ' · 文件选择器 ' + (pickOk ? '✓' : '✗') +
    ' · 已绑定 ' + (_cardBound ? '✓' : '✗');
  if (txt === _lastDiag) return;
  _lastDiag = txt;
  el.textContent = txt;
}

bindCardImport();
setTimeout(bindCardImport, 60);
setTimeout(bindCardImport, 400);
setTimeout(bindCardImport, 1200);

/* Observer 只监听 tabbar 的切换，避免全页监听引发死循环 */
try {
  const tb = document.getElementById('tabbar');
  if (tb && window.MutationObserver) {
    let tmr = 0;
    const mo = new MutationObserver(() => {
      if (tmr) return;
      tmr = setTimeout(() => { tmr = 0; bindCardImport(); }, 250);
    });
    mo.observe(tb, { childList: true, subtree: true, attributes: true });
  }
} catch (e) {}

/* ================= 13. 对话内搜索 ================= */
let findHits = [], findIdx = -1;

function openFind() {
  const bar = $('#find-bar');
  if (!bar) return;
  bar.classList.remove('hidden');
  const inp = $('#find-input');
  if (inp) { inp.focus(); inp.select(); }
}

function closeFind() {
  const bar = $('#find-bar');
  if (bar) bar.classList.add('hidden');
  $$('.msg').forEach(el => el.classList.remove('find-hit', 'find-cur'));
  findHits = [];
  findIdx = -1;
}

function jumpFind(n) {
  if (!findHits.length) return;
  findIdx = ((n % findHits.length) + findHits.length) % findHits.length;
  findHits.forEach((el, i) => el.classList.toggle('find-cur', i === findIdx));
  const el = findHits[findIdx];
  const cnt = $('#find-count');
  if (cnt) cnt.textContent = (findIdx + 1) + '/' + findHits.length;
  if (!el) return;
  lockScroll = true;
  try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
  setTimeout(() => { lockScroll = false; autoScroll = false; }, 450);
}

function runFind() {
  const inp = $('#find-input');
  const q = inp ? String(inp.value || '').trim().toLowerCase() : '';
  $$('.msg').forEach(el => el.classList.remove('find-hit', 'find-cur'));
  findHits = [];
  findIdx = -1;
  const cnt = $('#find-count');
  if (!q) { if (cnt) cnt.textContent = '0/0'; return; }
  messages.forEach((m, i) => {
    const a = typeof m.content === 'string' ? m.content : '';
    const b = typeof m.raw === 'string' ? m.raw : '';
    if ((a + '\n' + b).toLowerCase().includes(q)) {
      const el = $msgs.querySelector('.msg[data-idx="' + i + '"]');
      if (el) { el.classList.add('find-hit'); findHits.push(el); }
    }
  });
  if (findHits.length) jumpFind(0);
  else if (cnt) cnt.textContent = '0/0';
}

(function bindFind() {
  const fb = $('#find-bar');
  if (!fb) return;
  const inp = $('#find-input');
  if (inp) {
    inp.addEventListener('input', runFind);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); jumpFind(findIdx + (e.shiftKey ? -1 : 1)); }
      else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
    });
  }
  const prev = $('#find-prev'), next = $('#find-next'), close = $('#find-close');
  if (prev) prev.onclick = () => jumpFind(findIdx - 1);
  if (next) next.onclick = () => jumpFind(findIdx + 1);
  if (close) close.onclick = closeFind;

  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (String(e.key).toLowerCase() !== 'f') return;
    if (curPage !== 'chat') return;
    e.preventDefault();
    openFind();
  });

  const fbtn = $('#btn-find');
  if (fbtn) fbtn.onclick = () => {
    if (fb.classList.contains('hidden')) openFind();
    else closeFind();
  };
})();

/* ================= 14. switchPage ================= */
const _origSwitchPage = switchPage;
switchPage = function (name) {
  _origSwitchPage(name);
  if (name === 'card') {
    renderCardList();
    bindCardImport();
    updateDiag();
  }
};

/* ================= 15. 弹层兜底 ================= */
(function bindSheets() {
  const ov = document.getElementById('card-view');
  if (ov) ov.addEventListener('click', e => { if (e.target === ov) ov.classList.add('hidden'); });
  const cb = document.querySelector('#card-view [data-close]');
  if (cb) cb.onclick = () => closeSheet('card-view');
})();

/* ================= 16. 刷新一次 ================= */
setTimeout(() => {
  try {
    renderMessages();
    renderCardList();
    bindCardImport();
    updateDiag();
  } catch (e) {}
}, 0);
