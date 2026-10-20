/* ===== MBTI 性格测试 · 逻辑 ===== */

const STORAGE_KEY = 'mbti_answers_v1';
const AUTO_NEXT_DELAY = 320;

const state = {
  answers: new Array(QUESTIONS.length).fill(null), // 存 -2..2
  index: 0,
  showAnalysis: true,
  result: null
};

const $ = (id) => document.getElementById(id);

/* 双极量表 5 档：对应 -2 … +2 */
const SCALE_LABELS = ['完全是左端', '偏左端', '两者之间', '偏右端', '完全是右端'];
const answerLabel = (v) => (v === null || v === undefined ? '未作答' : SCALE_LABELS[v + 2]);

/* ---------- 视图切换 ---------- */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view' + name).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- 首页维度卡片 ---------- */
function renderDimGrid() {
  $('dimGrid').innerHTML = DIMENSIONS.map(d => `
    <div class="dim-item">
      <div class="dim-pair">${d.left} · ${d.right}　—　${d.title}</div>
      <h4>${d.question}</h4>
      <p><b style="color:#eef1ff">${d.left}</b> ${d.leftDesc}</p>
      <p style="margin-top:6px"><b style="color:#eef1ff">${d.right}</b> ${d.rightDesc}</p>
    </div>`).join('');
}

/* ---------- 答题页 ---------- */
function renderDimChips() {
  const dim = DIMENSIONS.find(d => d.key === QUESTIONS[state.index].dim);
  $('dimChips').innerHTML = DIMENSIONS.map(d =>
    `<span class="dim-chip ${d.key === dim.key ? 'cur' : ''}">${d.left}/${d.right} ${d.title}</span>`).join('');
}

function renderDots() {
  $('qDots').innerHTML = QUESTIONS.map((q, i) =>
    `<div class="q-dot ${state.answers[i] !== null ? 'done' : ''} ${i === state.index ? 'cur' : ''}" data-i="${i}">${i + 1}</div>`
  ).join('');
  $('qDots').querySelectorAll('.q-dot').forEach(el => {
    el.addEventListener('click', () => goTo(+el.dataset.i));
  });
}

function renderQuestion() {
  const q = QUESTIONS[state.index];
  const dim = DIMENSIONS.find(d => d.key === q.dim);
  const cur = state.answers[state.index];

  $('qIndex').textContent = `第 ${state.index + 1} / ${QUESTIONS.length} 题`;
  const done = state.answers.filter(a => a !== null).length;
  const pct = Math.round(done / QUESTIONS.length * 100);
  $('qPercent').textContent = pct + '%';
  $('progressInner').style.width = pct + '%';

  $('qDim').textContent = `${dim.title}　${dim.left} / ${dim.right}`;

  // 双极量表：左右两端为 OEJTS 原题的两个相反描述
  $('bipolar').innerHTML = `
    <div class="bp-end bp-l"><span class="bp-tag">左</span><span>${q.left}</span></div>
    <div class="bp-mid">←→</div>
    <div class="bp-end bp-r"><span>${q.right}</span><span class="bp-tag">右</span></div>`;

  $('options').innerHTML = SCALE.map((s, i) => `
    <button class="opt ${cur === s.value ? 'sel' : ''}" data-v="${s.value}">
      <span class="key">${i + 1}</span><span>${SCALE_LABELS[i]}</span>
    </button>`).join('');

  $('qSource').innerHTML =
    `<details>
       <summary>题目来源：<b>OEJTS</b> · 点击展开英文原题与区分度</summary>
       <div class="qs-body">英文原题 <i>${q.en}</i>　·　实测区分度 ${q.diff}　·　右端 = ${q.pole}</div>
     </details>`;
  $('options').querySelectorAll('.opt').forEach(btn => {
    btn.addEventListener('click', () => choose(+btn.dataset.v));
  });

  // 解析
  if (state.showAnalysis && cur !== null) {
    $('analysisBox').classList.remove('hidden');
    $('analysisText').textContent = q.note;
  } else {
    $('analysisBox').classList.add('hidden');
  }

  $('btnPrev').disabled = state.index === 0;
  const isLast = state.index === QUESTIONS.length - 1;
  $('btnNext').textContent = isLast ? '查看结果' : '下一题';
  $('btnNext').disabled = cur === null;
  $('navHint').textContent = state.showAnalysis
    ? (cur === null ? '选择一项后可查看本题解析' : '读完解析后点击下一题')
    : '选择一项后自动进入下一题';

  renderDimChips();
  renderDots();
  save();
}

function choose(value) {
  state.answers[state.index] = value;
  renderQuestion();

  if (state.showAnalysis || state.index === QUESTIONS.length - 1) return;

  setTimeout(() => {
    if (state.index < QUESTIONS.length - 1) goTo(state.index + 1);
  }, AUTO_NEXT_DELAY);
}

function goTo(i) {
  state.index = Math.max(0, Math.min(QUESTIONS.length - 1, i));
  renderQuestion();
}

/* ---------- 计分 ---------- */
function computeResult() {
  const raw = {};
  DIMENSIONS.forEach(d => {
    const sum = QUESTIONS
      .filter(q => q.dim === d.key)
      .reduce((acc, q) => acc + state.answers[q.id - 1] * (q.pole === d.left ? 1 : -1), 0);
    raw[d.key] = sum;
  });

  const max = QUESTIONS.filter(q => q.dim === DIMENSIONS[0].key).length * 2; // 单维满分
  const dims = DIMENSIONS.map(d => {
    const leftPct = Math.round((raw[d.key] + max) / (max * 2) * 100);
    const winner = raw[d.key] > 0 ? d.left : d.right;
    return {
      key: d.key, dim: d, raw: raw[d.key], leftPct, rightPct: 100 - leftPct,
      winner, strength: Math.abs(raw[d.key]) / max,
      balanced: leftPct >= 42 && leftPct <= 58
    };
  });

  const code = dims.map(x => x.winner).join('');
  return { code, dims, type: TYPES[code] };
}

/* ---------- 结果页 ---------- */
function renderResult() {
  const r = computeResult();
  state.result = r;
  const t = r.type;

  $('resultCode').textContent = r.code;
  $('resultName').textContent = t.name;
  $('resultTitle').textContent = t.title;
  $('resultTags').innerHTML = t.tags.map(x => `<span>${x}</span>`).join('') +
    `<span>人口参考占比 ${t.share}</span>`;
  $('resultSummary').textContent = t.summary;

  // 四维得分条
  $('bars').innerHTML = r.dims.map(x => {
    const lWin = x.winner === x.dim.left;
    return `
      <div class="bar-item">
        <div class="bar-head">
          <span>${x.dim.title}　<b style="color:#eef1ff">${x.dim.left}</b> vs <b style="color:#eef1ff">${x.dim.right}</b></span>
          <span class="win">偏向 ${x.winner} · ${Math.round(x.strength * 100)}% 强度</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${x.leftPct}%"></div>
          <div class="bar-mid"></div>
        </div>
        <div class="bar-legend">
          <span>${x.dim.left} ${x.leftPct}%</span>
          <span>${x.dim.right} ${x.rightPct}%</span>
        </div>
      </div>`;
  }).join('');

  const balanced = r.dims.filter(x => x.balanced);
  $('balanceNote').innerHTML = balanced.length
    ? `⚖️ 你在 <b style="color:#eef1ff">${balanced.map(x => x.dim.title).join('、')}</b> 上得分接近中线，说明这一维度较为平衡——两种模式你都能调用，可根据场景灵活切换，这也是一种优势。`
    : '你的四个维度倾向都比较明确，说明你的行为风格相对稳定、可预测。注意：偏好明确不等于"只能这样"，刻意练习另一端的行为能显著拓宽你的能力边界。';

  // Tab 内容
  $('pStrength').innerHTML = t.strengths.map(x => `<li>${x}</li>`).join('');
  $('pBlind').innerHTML = t.blindspots.map(x => `<li>${x}</li>`).join('');
  $('pCareer').innerHTML = t.careers.map(x => `<span>${x}</span>`).join('');
  $('pRelation').textContent = t.relation;
  $('pMatch').innerHTML = (TYPE_MATCH[r.code] || []).map(c => `<span>${c} · ${TYPES[c].name}</span>`).join('');
  $('pGrowth').innerHTML = t.growth.map(x => `<li>${x}</li>`).join('');
  $('pCog').textContent = t.cognitive;

  // 逐题解析
  $('reviewList').innerHTML = QUESTIONS.map((q, i) => {
    return `
      <div class="review-item">
        <div class="rq">${i + 1}. ${q.left} ←→ ${q.right}</div>
        <div class="ra">你的选择：${answerLabel(state.answers[i])}</div>
        <div class="rn">${q.note}</div>
        <div class="rs">来源：OEJTS ${q.en}（区分度 ${q.diff}，右端 = ${q.pole}）</div>
      </div>`;
  }).join('');

  showView('Result');
}

/* ---------- 存档 ---------- */
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers: state.answers,
      index: state.index,
      showAnalysis: state.showAnalysis
    }));
  } catch (e) { /* 忽略隐私模式下的写入失败 */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!Array.isArray(d.answers) || d.answers.length !== QUESTIONS.length) return null;
    return d;
  } catch (e) { return null; }
}

/* ---------- 交互绑定 ---------- */
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2000);
}

function bind() {
  $('btnStart').addEventListener('click', () => {
    state.answers = new Array(QUESTIONS.length).fill(null);
    state.index = 0;
    showView('Quiz');
    renderQuestion();
  });

  $('btnContinue').addEventListener('click', () => {
    showView('Quiz');
    renderQuestion();
  });

  $('btnPrev').addEventListener('click', () => goTo(state.index - 1));
  $('btnNext').addEventListener('click', () => {
    if (state.index === QUESTIONS.length - 1) {
      if (state.answers.some(a => a === null)) {
        toast('还有题目未作答，请先完成所有题目');
        return;
      }
      renderResult();
    } else {
      goTo(state.index + 1);
    }
  });

  $('btnToggleAnalysis').addEventListener('click', () => {
    state.showAnalysis = !state.showAnalysis;
    $('dotAnalysis').classList.toggle('on', state.showAnalysis);
    $('btnToggleAnalysis').lastChild.textContent = ' 答题解析：' + (state.showAnalysis ? '开' : '关');
    if ($('viewQuiz').classList.contains('active')) renderQuestion();
    save();
  });

  $('tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
  });

  $('btnToggleReview').addEventListener('click', () => {
    const list = $('reviewList');
    const collapsed = list.classList.toggle('collapsed');
    $('btnToggleReview').textContent = collapsed ? '展开全部' : '收起';
  });

  $('btnCopy').addEventListener('click', () => {
    const r = state.result;
    if (!r) return;
    const text =
      `我的 MBTI 测试结果：${r.code}（${r.type.name} · ${r.type.title}）\n` +
      r.dims.map(x => `· ${x.dim.title}：${x.winner} ${x.winner === x.dim.left ? x.leftPct : x.rightPct}%`).join('\n') +
      `\n特点：${r.type.tags.join('、')}`;
    const done = () => toast('结果已复制到剪贴板');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  });

  $('btnRestart').addEventListener('click', () => {
    state.answers = new Array(QUESTIONS.length).fill(null);
    state.index = 0;
    state.result = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    $('btnContinue').classList.add('hidden');
    showView('Quiz');
    renderQuestion();
  });

  document.addEventListener('keydown', e => {
    if (!$('viewQuiz').classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key >= '1' && e.key <= '5') {
      choose(SCALE[+e.key - 1].value);
    } else if (e.key === 'ArrowLeft') {
      goTo(state.index - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      $('btnNext').click();
    }
  });
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择文本'); }
  document.body.removeChild(ta);
}

/* ---------- 启动 ---------- */
(function init() {
  renderDimGrid();
  bind();

  const saved = load();
  if (saved && saved.answers.some(a => a !== null)) {
    state.answers = saved.answers;
    state.index = saved.index || 0;
    if (typeof saved.showAnalysis === 'boolean') {
      state.showAnalysis = saved.showAnalysis;
      $('dotAnalysis').classList.toggle('on', state.showAnalysis);
      $('btnToggleAnalysis').lastChild.textContent = ' 答题解析：' + (state.showAnalysis ? '开' : '关');
    }
    const done = state.answers.filter(a => a !== null).length;
    $('btnContinue').classList.remove('hidden');
    $('btnContinue').textContent = `继续上次测试（${done}/${QUESTIONS.length}）`;
  }
})();
