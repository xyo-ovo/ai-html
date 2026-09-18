/* ============================================================
   AI HTML 工坊 · 增强补丁 v1
   在 app.v29.js 之后加载，覆盖/新增：
   · 代码块行号 + 语法高亮
   · 继续生成
   · 编辑 AI 回复
   · 对话内搜索（Ctrl+F）
   · 重新生成保留滚动位置
   · 角色卡导入（PNG / JSON，含内嵌世界书）
   ============================================================ */

/* ---------- 1. 语法高亮 ---------- */
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

/* ---------- 2. 角色卡导入 ---------- */
function b64ToUtf8(b64) {
  const clean = String(b64 || '').replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

async function readPngChara(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length < 16) return null;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  const dec = new TextDecoder('latin1');
  let pos = 8;
  while (pos + 12 <= buf.length) {
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
          let idx = sep + 3;
          const l2 = data.indexOf(0, idx);
          if (l2 < 0) { pos += 12 + len; continue; }
          idx = l2 + 1;
          const l3 = data.indexOf(0, idx);
          if (l3 < 0) { pos += 12 + len; continue; }
          idx = l3 + 1;
          val = new TextDecoder('utf-8').decode(data.slice(idx));
        }
        if (key === 'chara' || key === 'ccv3' || key === 'Chara') return val;
      }
    }
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  return null;
}

function cardToPersona(card) {
  const d = (card && (card.data || card)) || {};
  const name = String(d.name || d.char_name || '未命名角色').slice(0, 24);
  const parts = [];
  const push = (label, txt) => {
    const t = String(txt == null ? '' : txt).trim();
    if (t) parts.push(label ? '【' + label + '】\n' + t : t);
  };
  push('', d.description);
  push('性格', d.personality);
  push('场景', d.scenario);
  push('对话示例', d.mes_example || d.example_dialogue);
  push('', d.system_prompt || d.systemPrompt);
  push('作者备注', d.creator_notes || d.creatorcomment);
  const greeting = String(d.first_mes || d.greeting || '').trim();
  return { name, bio: parts.join('\n\n'), greeting, raw: d };
}

function cardToLore(card) {
  const d = (card && (card.data || card)) || {};
  const book = d.character_book || d.world_info || d.worldInfo || null;
  const out = [];
  if (!book) return out;
  const entries = Array.isArray(book) ? book : (book.entries || []);
  for (const e of entries) {
    if (!e || e.enabled === false) continue;
    let keys = e.keys || e.key || e.keywords || [];
    if (typeof keys === 'string') keys = keys.split(',');
    keys = (Array.isArray(keys) ? keys : []).map(k => String(k).trim()).filter(Boolean);
    const content = String(e.content || e.entry || '').trim();
    if (!content) continue;
    out.push({
      id: uid(),
      name: String(e.comment || e.name || keys[0] || '角色书条目').slice(0, 40),
      keywords: keys.join(','),
      content,
      enabled: true,
    });
  }
  return out;
}

async function importCharCard(file) {
  const fname = String(file.name || '').toLowerCase();
  let card = null;
  try {
    if (fname.endsWith('.png') || /^image\//.test(file.type || '')) {
      const b64 = await readPngChara(file);
      if (!b64) { toast('这张 PNG 里没有角色卡数据'); return; }
      let txt = b64.trim();
      if (!txt.startsWith('{')) {
        try { txt = b64ToUtf8(b64); } catch (e) {}
      }
      card = JSON.parse(txt);
    } else {
      const txt = await readAsText(file);
      card = JSON.parse(txt);
    }
  } catch (e) {
    toast('解析失败：' + (e && e.message ? e.message : '格式不对'));
    return;
  }
  if (!card || typeof card !== 'object') { toast('角色卡内容无效'); return; }

  const { name, bio, greeting, raw } = cardToPersona(card);
  const loreAdd = cardToLore(card);

  const s = currentSession();
  if (!s) return;
  const oldP = sessionPersona();
  s.persona = {
    avatar: oldP.avatar || '🎭',
    name,
    bio,
    greeting,
    allowTime: oldP.allowTime,
    allowHistory: oldP.allowHistory,
  };
  if (!s.title || s.title === '新对话') {
    s.title = name;
    s.titled = true;
  }
  LS.sessions = sessions;

  if (loreAdd.length) {
    LS.lore = [...LS.lore, ...loreAdd];
    renderLore();
  }

  renderBrand();
  renderMessages();

  const rx = raw.extensions && (raw.extensions.regex_scripts || raw.regex_scripts);
  const rxN = Array.isArray(rx) ? rx.length : 0;
  let msg = '已导入角色卡「' + name + '」';
  if (loreAdd.length) msg += '，含 ' + loreAdd.length + ' 条世界书';
  if (rxN) msg += '（' + rxN + ' 条正则未启用）';
  toast(msg, 3200);
  closeSheet('persona');
}

/* ---------- 3. renderMsg（加「编辑 AI」「继续生成」按钮） ---------- */
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

/* ---------- 4. startEdit（支持 AI 消息） ---------- */
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

/* ---------- 5. finalize（存 raw + 支持续写合并） ---------- */
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

/* ---------- 6. runAssistant（支持续写 append） ---------- */
let continueMode = false;

runAssistant = async function () {
  const p = activeProvider();
  if (!p) return;
  const append = continueMode;

  let aMsg, idx, el;
  let base = null;

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
      if (aMsg) { const o2 = $msgs.querySelector('.msg[data-idx="' + idx + '"]'); if (o2) o2.replaceWith(renderMsg(aMsg, idx)); }
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

/* ---------- 7. send（编辑 AI 回复 = 作为你的消息重发） ---------- */
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

const _sendBtn = $('#btn-send');
if (_sendBtn) _sendBtn.onclick = send;

/* ---------- 8. 继续生成 / 重新生成（保留滚动位置） ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (!t || !t.closest) return;

  const contBtn = t.closest('.msg-actions button[data-act="continue"]');
  if (contBtn) {
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
  }
}, true);

/* ---------- 9. 对话内搜索 ---------- */
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
  const prev = $('#find-prev');
  const next = $('#find-next');
  const close = $('#find-close');
  if (prev) prev.onclick = () => jumpFind(findIdx - 1);
  if (next) next.onclick = () => jumpFind(findIdx + 1);
  if (close) close.onclick = closeFind;

  const fbtn = $('#btn-find');
  if (fbtn) fbtn.onclick = () => {
    if (fb.classList.contains('hidden')) openFind();
    else closeFind();
  };

  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (String(e.key).toLowerCase() !== 'f') return;
    if (curPage !== 'chat') return;
    e.preventDefault();
    openFind();
  });
})();

/* ---------- 10. 角色卡导入入口 ---------- */
(function bindCardImport() {
  const btn = $('#pa-import-card');
  const pick = $('#pick-card');
  if (btn && pick) {
    btn.onclick = () => pick.click();
    pick.onchange = () => {
      if (pick.files && pick.files.length) importCharCard(pick.files[0]);
      pick.value = '';
    };
  }
})();

/* ---------- 11. 初始化后刷新一次（让新按钮出现在已有消息上） ---------- */
setTimeout(() => {
  try { renderMessages(); } catch (e) {}
}, 0);
