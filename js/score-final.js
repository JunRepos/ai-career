/* ═══════════════════════════════════════
   score-final.js — 🔒 수행평가 점수 확정 · 학생 「내 점수」 (인공지능 기초)

   (2026-11-17 선생님 — 「D반은 지금 기준으로 확정했어. 수행평가 점수 이제 변동 안될꺼고
    D반은 애들이 내 점수 메뉴에서 확인 가능하게 만들어줘. … 앞으로 1차 2차 수행평가에 대해서
    변경을 할려 그러면 알림(alert)를 보내줘. D반만 그러는거야. B반도 확정되면 나중에 알려줌」)

   ━━ 어디에 무엇이 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   aiactivity/submissions/{반}/scoreFinal =
     { at, students: { 학번: { a1:{v:[①,②,③,④], t}, a2:{g:[전처리,모델,평가], e:[논술1,논술2], t}, t } },
       log: { pushId: { at, snum, what, from, to } } }
   · 확정한 순간의 점수를 **따로 떠 둔 것**입니다. 학생 화면은 이것만 읽습니다 —
     선생님 채점 화면(assess1grade · assess2grade)을 고쳐도 여기는 저절로 안 바뀝니다.
   · scoreFinal 이 있는 반은 1차 · 2차 채점 화면에서 **점수를 바꾸려 하면 확인창**이 뜹니다.
     「바꾼다」 를 고르면 채점 기록에 저장하고, 그 학생의 확정 점수도 새 값으로 고치고 log 에 남깁니다.
     (확정 점수와 채점 화면이 서로 다르게 남지 않게)
   · 반을 확정하는 것은 지금은 앱 밖에서 합니다 (scoreFinalBuild 와 같은 계산).
   ⚠ 학생 화면은 자기 학번 것만 그리지만, DB 규칙이 열려 있어 주소를 아는 사람은 다른 학번도 읽습니다
     (HANDOFF 「보안」 — 채점 기록도 같은 조건). 이름은 넣지 않습니다.
═══════════════════════════════════════ */

let SCORE_FINAL = {};          // { cid: scoreFinal | null } — undefined 면 아직 못 읽음
let SCORE_FINAL_WATCH = null;

function _sfRef(cid, sub){ return db.ref(`aiactivity/submissions/${cid}/scoreFinal${sub ? '/' + sub : ''}`); }

async function loadScoreFinal(cid){
  if(!/^ai-/.test(cid || '')) return null;
  try {
    const s = await withTimeout(_sfRef(cid).get(), 12000, '확정 점수 불러오기');
    SCORE_FINAL[cid] = s.exists() ? s.val() : null;
  } catch(err){
    console.warn('[확정 점수] 불러오기 실패:', err.message || err);
  }
  return SCORE_FINAL[cid];
}
/* 선생님 채점 화면 — 확정 여부와 점수가 바뀌면 바로 따라옵니다 */
function scoreFinalWatch(cid){
  if(!/^ai-/.test(cid || '')) return;
  if(SCORE_FINAL_WATCH && SCORE_FINAL_WATCH.cid === cid) return;
  if(SCORE_FINAL_WATCH) SCORE_FINAL_WATCH.ref.off('value', SCORE_FINAL_WATCH.fn);
  const ref = _sfRef(cid);
  const fn = s => { SCORE_FINAL[cid] = s.exists() ? s.val() : null; };
  ref.on('value', fn, err => console.warn('[확정 점수] 구독 실패:', err.message || err));
  SCORE_FINAL_WATCH = { cid, ref, fn };
}

function scoreLocked(cid){ return !!(SCORE_FINAL[cid] && SCORE_FINAL[cid].at); }

/* ── 점수 계산 — 채점 화면(views/assess1.js · assess2.js)과 같은 규칙 ──
   1차: 영역마다 선생님이 고친 값(s) > 처음 값(ai). 넷 다 있어야 합계.
   2차: 항목마다 s > ai. 묶음 기본점수 3 · 2 · 3 + 항목. 노트북 답안이 없으면 기본점수만.
        논술은 es.q1(0 · 1) + es.q2(2~5). 둘 다 있어야 합계. */
const SF_A2_GROUPS = [
  { base: 3, items: ['b1_na', 'b1_graph', 'b1_pick', 'b1_why'] },
  { base: 2, items: ['b2_xy', 'b2_split', 'b2_fit'] },
  { base: 3, items: ['b3_score', 'b3_try', 'b3_cm', 'b3_fold'] },
];
function _sfAt(x, i){
  if(Array.isArray(x)) return x[i] == null ? null : x[i];
  if(x && typeof x === 'object') return x[i] == null ? (x[String(i)] == null ? null : x[String(i)]) : x[i];
  return null;
}
function scoreFinalCalc(g1, g2){
  const out = {};
  if(g1){
    const v = [1, 2, 3, 4].map(i => { const s = _sfAt(g1.s, i); return s != null ? s : _sfAt(g1.ai, i); });
    if(v.every(x => typeof x === 'number')) out.a1 = { v, t: v.reduce((a, b) => a + b, 0) };
  }
  if(g2){
    const s = g2.s || {}, ai = g2.ai;
    const pick = k => (s[k] === 0 || s[k] === 1) ? s[k] : ((ai && ai[k]) || 0);
    const g = SF_A2_GROUPS.map(gr => gr.base + (ai ? gr.items.reduce((t, k) => t + pick(k), 0) : 0));
    const es = g2.es || {};
    if((es.q1 === 0 || es.q1 === 1) && [2, 3, 4, 5].indexOf(es.q2) >= 0){
      const e = [es.q1, es.q2];
      out.a2 = { g, e, t: g[0] + g[1] + g[2] + e[0] + e[1] };
    }
  }
  if(out.a1 && out.a2) out.t = out.a1.t + out.a2.t;
  return out;
}
function _sfSame(a, b){ return JSON.stringify(a || {}) === JSON.stringify(b || {}); }

/* ── 확정된 반에서 점수를 바꾸려 할 때 — 확인창 ──
   true 면 그대로 진행, false 면 멈춥니다. 확정 정보를 아직 못 읽었으면 막습니다. */
function scoreLockAsk(cid, what){
  if(!/^ai-/.test(cid || '')) return true;
  if(SCORE_FINAL[cid] === undefined){
    toast('확정 정보를 불러오는 중입니다. 잠시 뒤 다시 누르세요', 'err');
    loadScoreFinal(cid);
    return false;
  }
  if(!scoreLocked(cid)) return true;
  const d = String(SCORE_FINAL[cid].at || '').slice(0, 10);
  return confirm(`🔒 이 반의 수행평가 점수는 ${d} 에 확정했습니다.\n학생 「내 점수」 에 공개된 점수입니다.\n\n${what}\n\n정말 바꿀까요? 바꾸면 학생 화면의 점수도 함께 바뀌고 기록이 남습니다.`);
}

/* 바꾼 뒤 — 그 학생의 확정 점수를 새로 계산해 고치고 log 에 남깁니다 */
async function scoreFinalRefresh(cid, snum, what){
  if(!scoreLocked(cid) || !snum) return;
  try {
    const [s1, s2] = await withTimeout(Promise.all([
      db.ref(`aiactivity/submissions/${cid}/assess1grade/${snum}`).get(),
      db.ref(`aiactivity/submissions/${cid}/assess2grade/${snum}`).get(),
    ]), 12000, '확정 점수 다시 계산');
    const to = scoreFinalCalc(s1.val(), s2.val());
    const from = ((SCORE_FINAL[cid] || {}).students || {})[snum] || null;
    if(_sfSame(from, to)) return;
    await _sfRef(cid, 'students/' + snum).set(Object.keys(to).length ? to : null);
    await _sfRef(cid, 'log').push({ at: new Date().toISOString(), snum, what: what || '', from: from || null, to });
    toast('학생 「내 점수」 도 새 점수로 고쳤습니다', 'ok');
  } catch(err){
    toast('확정 점수를 고치지 못했습니다 — ' + (err.message || err), 'err');
  }
}

/* 선생님 채점 화면 위의 띠 */
function scoreFinalBanner(cid){
  if(!scoreLocked(cid)) return '';
  const f = SCORE_FINAL[cid];
  const n = Object.keys(f.students || {}).length;
  const ch = Object.keys(f.log || {}).length;
  return `<div class="a1-notice" style="border-left:4px solid #00703C">
    🔒 <b>점수 확정</b> ${esc(String(f.at || '').slice(0, 10))} · 학생 ${n}명 · 학생 「내 점수」 에 공개 중.
    점수를 바꾸려 하면 확인창이 뜹니다.${ch ? ` <span class="a1-dim">확정 뒤 바꾼 기록 ${ch}건</span>` : ''}</div>`;
}

/* ── 학생 메뉴 · 화면 ── */
function aiScoreMine(){
  if((SEL_CLS?.type) !== 'ai' || !ST_USER) return null;
  const f = SCORE_FINAL[SEL_CLS.id];
  return (f && f.at && (f.students || {})[ST_USER.number]) || null;
}

function vStAiScore(){
  const m = aiScoreMine();
  if(!m) return emptyBox('📊', '아직 확정된 점수가 없습니다.');
  const a1n = (typeof A1 !== 'undefined' && A1.scale) ? A1.scale.map(x => x.name) : ['①', '②', '③', '④'];
  const row = (name, v, max) => `<tr><td>${esc(name)}</td><td class="n"><b>${v == null ? '–' : v}</b> / ${max}</td></tr>`;
  const sum = (name, v, max) => `<tr class="sf-sum"><td>${esc(name)}</td><td class="n"><b>${v == null ? '–' : v}</b> / ${max}</td></tr>`;
  const a1 = m.a1 ? `<table class="tbl sf-tbl">${m.a1.v.map((v, i) => row(a1n[i], v, 5)).join('')}${sum('합계', m.a1.t, 20)}</table>`
                  : '<div class="a1-dim">채점 중입니다.</div>';
  const a2n = ['데이터 전처리 및 핵심 속성 선정하기', '기계학습 모델 만들고 학습시키기', '모델 성능 평가하기'];
  const a2max = [7, 5, 7];
  const a2 = m.a2 ? `<table class="tbl sf-tbl">${m.a2.g.map((v, i) => row(a2n[i], v, a2max[i])).join('')}
      ${row('논술 1', m.a2.e[0], 1)}${row('논술 2', m.a2.e[1], 5)}${sum('합계', m.a2.t, 25)}</table>`
                  : '<div class="a1-dim">채점 중입니다.</div>';
  return `<div class="section sf-wrap">
    <div class="sec-title">📊 내 점수 — 수행평가</div>
    <div class="sf-total"><span>수행평가 합계</span><b>${m.t == null ? '–' : m.t}</b><small>/ 45</small></div>
    <div class="sf-h">1차 수행평가 <span class="a1-dim">${esc(typeof A1 !== 'undefined' ? A1.title : '')}</span></div>
    ${a1}
    <div class="sf-h">2차 수행평가 <span class="a1-dim">기계학습 알고리즘을 적용하여 데이터 기반 문제 해결하기</span></div>
    ${a2}
    <div class="a1-dim" style="margin-top:10px">영역마다 기본점수가 들어 있습니다. 점수에 대해 궁금한 것은 선생님께 물어보세요.</div>
  </div>`;
}

(function _sfCss(){
  if(typeof document === 'undefined' || document.getElementById('sf-css')) return;
  const st = document.createElement('style'); st.id = 'sf-css';
  st.textContent = `
.sf-wrap{max-width:720px}
.sf-total{display:flex;align-items:baseline;gap:8px;border:1.5px solid #00703C;border-radius:12px;padding:12px 16px;margin:6px 0 14px;background:var(--surface)}
.sf-total span{font-weight:700;color:var(--text2)}
.sf-total b{font-size:30px;color:#00703C}
.sf-total small{color:var(--text3)}
.sf-h{font-weight:800;font-size:16px;margin:14px 0 6px;color:var(--text)}
.sf-h .a1-dim{font-weight:400;font-size:13px;margin-left:6px}
.sf-tbl{width:100%}
.sf-tbl td.n{text-align:right;white-space:nowrap;width:110px}
.sf-tbl tr.sf-sum td{background:var(--surface2);font-weight:800}`;
  document.head.appendChild(st);
})();
