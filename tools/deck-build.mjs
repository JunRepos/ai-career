/* ═══════════════════════════════════════
   tools/deck-build.mjs — 수업자료(슬라이드) 만들기

   옵시디언 차시 노트를 정리한 '덱 JSON' 을 받아 pptx 로 뽑습니다.
   뽑은 pptx 를 PowerPoint 에서 손본 뒤 PNG 로 내보내고, 앱의 수업자료에 올리면 됩니다.

   쓰는 법
     node tools/deck-build.mjs <덱.json> [-o 나올파일.pptx] [--media <이미지폴더>]

   디자인은 지금까지 올린 덱(0·1·2차시)에서 그대로 가져왔습니다.
   슬라이드 20×11.25인치 · 제목 Jua · 본문 Gothic A1 · 크림색 배경.
   ⚠ 두 폰트가 설치돼 있어야 PowerPoint 에서 같은 모양으로 보입니다.

   덱 JSON 모양 (자세한 건 tools/deck-spec.md)
     { title, kicker, media, slides: [ {type, ...}, ... ] }
     type: title · section · quiz · cards · bullets · steps · fill · table · summary · image

   글 안에서 쓸 수 있는 표시
     **강조**    굵게 + 갈색
     [[    ]]    학생이 채울 빈칸 (밑줄)
═══════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

/* 옵시디언에 붙여넣은 이미지가 모이는 곳 — 덱 JSON 의 media 로 바꿀 수 있습니다 */
const DEFAULT_MEDIA = 'D:/Google drive/Obsidian Vault/04_Archive/99_media';

function die(msg){ console.error('✖ ' + msg); process.exit(1); }

/* ── 테마 — 기존 덱에서 뽑아낸 값 그대로 ── */
const T = {
  bg:    'FDF9F3',  // 배경 크림
  ink:   '2E2A26',  // 본문 검정
  muted: '6E6459',  // 설명 글
  label: '8A7F71',  // 카드 위 작은 라벨
  brown: '8B6B4A',  // 강조 갈색
  gold:  'C4A26A',  // 제목 밑줄 왼쪽
  gold2: 'E0CDA2',  // 제목 밑줄 오른쪽
  pill:  'F7E9C6',  // 알약 배경
  soft:  'F2EDE4',  // 옅은 상자
  line:  'C9B79F',  // 카드 테두리
  line2: 'E0D2BF',  // 옅은 테두리
  white: 'FFFFFF',
  /* diagram·tree 노드에 color:"blue"|"red" 를 주면 씁니다 (2026-09-01 추가)
     — 큰 탐색 트리에서 시작 노드와 목표 노드를 가려 보이게 하려고 넣었습니다 */
  blue:   '3B6EA5', blueBg: 'E4EDF7',
  red:    'C0504D', redBg:  'FAE5E3',
  fT:    'Jua',       // 제목·강조
  fB:    'Gothic A1', // 본문
};

/* ── 자리 — 인치 ── */
const M = {
  W: 20, H: 11.25,
  x: 1.15, right: 18.85, w: 17.70,
  titleY: 0.94, titleH: 0.83,
  barY: 2.06, barW: 4.40, barH: 0.13,
  top: 2.60, bottom: 10.62,
};
const bodyH = () => M.bottom - M.top;

/* ── 글자 너비 어림 — 줄 수를 세어 상자 높이를 정할 때 씁니다 ──
     한글은 글자 하나가 대략 한 칸(em), 영문·숫자·공백은 반 칸으로 봅니다. */
function textWidth(s, size){
  let em = 0;
  for(const ch of String(s)){
    if(/[\uAC00-\uD7A3\u3130-\u318F\u4E00-\u9FFF]/.test(ch)) em += 1;
    else if(ch === ' ') em += 0.32;
    else em += 0.52;
  }
  return em * size / 72;
}
function lineCount(s, boxW, size){
  const words = String(s).split(' ');
  let lines = 1, cur = 0;
  for(const wd of words){
    const w = textWidth(wd + ' ', size);
    if(cur + w > boxW && cur > 0){ lines++; cur = w; } else cur += w;
  }
  return lines;
}
/* 글 상자 높이 — 줄 수 × 줄 높이 */
const textH = (s, boxW, size, lh = 1.35) => lineCount(s, boxW, size) * size * lh / 72;

/* ── **강조** 와 [[빈칸]] 을 조각으로 나눕니다 ── */
function runs(text, base = {}){
  const out = [];
  const re = /(\*\*[^*]+\*\*|\[\[[^\]]*\]\])/g;
  let last = 0, m;
  while((m = re.exec(text))){
    if(m.index > last) out.push({ text: text.slice(last, m.index), options: { ...base } });
    const tok = m[0];
    if(tok.startsWith('**')){
      out.push({ text: tok.slice(2, -2), options: { ...base, bold: true, color: T.brown } });
    }else{
      /* 빈칸 — PowerPoint 가 공백을 줄여 버리므로 줄지 않는 공백(U+00A0)으로 채웁니다 */
      const inner = tok.slice(2, -2).trim();
      const pad = ' '.repeat(Math.max(8, tok.length - 4));
      out.push({ text: inner ? ` ${inner} ` : pad, options: { ...base, underline: { style: 'sng', color: T.line }, color: T.brown } });
    }
    last = re.lastIndex;
  }
  if(last < text.length) out.push({ text: text.slice(last), options: { ...base } });
  return out.length ? out : [{ text: String(text), options: { ...base } }];
}

/* ── 조각들 ────────────────────────────── */

function bg(s){ s.background = { color: T.bg }; }

/* 제목 + 금색 밑줄.
   pptxgenjs 는 그라데이션을 못 채워서, 얇은 조각을 이어 붙여 흉내 냅니다. */
function heading(pptx, s, text, opt = {}){
  if(!text) return;                          // ask 상자를 쓸 때는 제목을 이미 그렸습니다
  const num = opt.num;                       // '②' 처럼 제목 앞에 붙는 번호
  let x = M.x;
  if(num){
    s.addText(num, { x: M.x, y: M.titleY, w: 0.9, h: M.titleH, fontFace: T.fT, fontSize: 44,
                     color: T.gold, valign: 'middle' });
    x = M.x + 0.91;
  }
  s.addText(runs(text, { fontFace: T.fT, fontSize: opt.size || 54, color: T.ink }),
            { x, y: M.titleY, w: M.right - x, h: M.titleH, valign: 'middle' });

  /* 옅은 색 막대를 깔고, 그 위에 짧고 진한 막대를 겹쳐 그라데이션처럼 보이게 합니다 */
  const N = 16;
  for(let i = N; i >= 1; i--){
    s.addShape(pptx.ShapeType.roundRect, {
      x: M.x, y: M.barY, w: M.barW * i / N, h: M.barH,
      fill: { color: mix(T.gold, T.gold2, (i - 1) / (N - 1)) }, line: { type: 'none' },
      rectRadius: M.barH / 2,
    });
  }
}
function mix(a, b, t){
  const p = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = v => Math.round(v).toString(16).padStart(2, '0').toUpperCase();
  return c(r1 + (r2 - r1) * t) + c(g1 + (g2 - g1) * t) + c(b1 + (b2 - b1) * t);
}

/* 흰 카드 */
function card(pptx, s, x, y, w, h, opt = {}){
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: opt.fill || T.white },
    line: opt.line === false ? { type: 'none' } : { color: opt.border || T.line, width: 1.5 },
    rectRadius: 0.3,
  });
}

/* 알약 자리 재기 — 몇 줄이 되는지 미리 알아야 상자 높이를 정할 수 있습니다 */
function pillsLayout(list, x, y, maxW, size = 28.5){
  const h = 0.83, gap = 0.17;
  let cx = x, cy = y;
  const out = [];
  for(const t of list){
    const w = Math.max(1.1, textWidth(t, size) + 0.52);
    if(cx + w > x + maxW && cx > x){ cx = x; cy += h + gap; }
    out.push({ t, x: cx, y: cy, w, h });
    cx += w + gap;
  }
  return { boxes: out, bottom: cy + h, height: cy + h - y };
}
/* 알약 줄 — 여러 줄로 자동으로 넘어갑니다. 마지막 y 를 돌려줍니다. */
function pills(pptx, s, list, x, y, maxW, size = 28.5){
  const { boxes, bottom } = pillsLayout(list, x, y, maxW, size);
  for(const b of boxes){
    s.addShape(pptx.ShapeType.roundRect, { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: T.pill }, line: { type: 'none' }, rectRadius: b.h / 2 });
    s.addText(b.t, { x: b.x, y: b.y, w: b.w, h: b.h, fontFace: T.fT, fontSize: size, color: T.ink, align: 'center', valign: 'middle' });
  }
  return bottom;
}

/* 질문 상자 — 물어본 질문을 위에 그대로 띄워 둔 채 아래에서 답을 확인할 때.
   어느 배치에나 `ask: "질문"` 한 줄을 더하면 붙습니다. 본문이 시작될 y 를 돌려줍니다. */
function askBox(pptx, s, text){
  const h = 3.0;
  card(pptx, s, M.x, M.top, M.w, h, { border: T.line2 });
  s.addText('“', { x: M.x + 0.5, y: M.top + 0.1, w: 2, h: 1.8,
    fontFace: T.fT, fontSize: 110, color: T.gold2, valign: 'middle' });
  s.addText(runs(text, { fontFace: T.fT, fontSize: 48, color: T.ink }),
    { x: M.x + 2.0, y: M.top + 0.6, w: M.w - 4.0, h: h - 1.2,
      align: 'center', valign: 'middle', lineSpacingMultiple: 1.3 });
  return M.top + h + 0.5;
}

/* 이미지 — 흰 카드 안에 넣습니다 (기존 덱과 같은 모양) */
function picture(pptx, s, file, x, y, w, h, mediaDir){
  const p = path.isAbsolute(file) ? file : path.join(mediaDir, file);
  if(!fs.existsSync(p)) die(`이미지를 못 찾았습니다: ${p}`);
  card(pptx, s, x, y, w, h, { border: T.line2 });
  const pad = 0.22;
  s.addImage({ path: p, x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2,
               sizing: { type: 'contain', w: w - pad * 2, h: h - pad * 2 } });
}

/* ── 슬라이드 종류 ───────────────────────── */
const LAYOUT = {

  /* 표지 — 왼쪽 글, 오른쪽 그림 */
  title(pptx, s, d, ctx){
    if(d.kicker || ctx.kicker)
      s.addText(d.kicker || ctx.kicker, { x: M.x, y: 3.85, w: 10, h: 0.6,
        fontFace: T.fT, fontSize: 30, color: T.brown, valign: 'middle' });
    s.addText(d.title, { x: M.x, y: 4.45, w: d.image ? 10.4 : M.w, h: 1.9,
      fontFace: T.fT, fontSize: 96, color: T.ink, valign: 'middle' });
    if(d.subtitle)
      s.addText(d.subtitle, { x: M.x, y: 6.55, w: d.image ? 10.4 : M.w, h: 0.8,
        fontFace: T.fB, fontSize: 30, color: T.muted, valign: 'middle' });
    if(d.image) picture(pptx, s, d.image, 11.8, 2.6, 7.05, 6.9, ctx.media);
  },

  /* 큰 구분 — 01 / 제목 */
  section(pptx, s, d){
    if(d.num)
      s.addText(d.num, { x: M.x, y: 4.0, w: 4, h: 1.5, fontFace: T.fT, fontSize: 96, color: T.gold, valign: 'middle' });
    s.addText(d.title, { x: M.x, y: 5.4, w: M.w, h: 1.5, fontFace: T.fT, fontSize: 72, color: T.ink, valign: 'middle' });
    if(d.desc)
      s.addText(d.desc, { x: M.x, y: 7.0, w: M.w, h: 0.9, fontFace: T.fB, fontSize: 28, color: T.muted });
  },

  /* 질문 목록 — 지난 시간 확인 */
  quiz(pptx, s, d, ctx){
    heading(pptx, s, d.title || '지난 시간 확인');
    const n = d.items.length;
    const h = Math.min(1.9, (bodyH() - (n - 1) * 0.3) / n);
    let y = M.top;
    d.items.forEach((it, i) => {
      card(pptx, s, M.x, y, M.w, h);
      s.addText(it.tag || `Q${i + 1}`, { x: M.x + 0.55, y, w: 1.6, h,
        fontFace: T.fT, fontSize: 34, color: T.gold, valign: 'middle' });
      s.addText(runs(it.text, { fontFace: T.fT, fontSize: 36, color: T.ink }),
        { x: M.x + 2.1, y, w: M.w - 2.7, h, valign: 'middle' });
      y += h + 0.3;
    });
    void ctx;
  },

  /* 카드 묶음 — 1~2단으로 자동 배치. wide:true 면 한 줄 전체.
     카드마다 필요한 높이를 먼저 재고, 남는 자리는 고르게 나눠 채웁니다. */
  cards(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const gapY = 0.5, gapX = 0.37;

    /* 줄 나누기 */
    const rows = [];
    for(const c of d.cards){
      const last = rows[rows.length - 1];
      if(c.wide || !last || last.length === 2 || last[0].wide) rows.push([c]);
      else last.push(c);
    }
    /* 칸 너비 */
    for(const row of rows){
      const sum = row.reduce((a2, b2) => a2 + (b2.grow || 0.5), 0);
      row.forEach(c => { c._w = row.length === 1 ? M.w : (M.w - gapX) * (c.grow || 0.5) / sum; });
    }
    /* 줄이 많으면 안쪽 여백을 조금 줄여 한 장에 들어가게 합니다 */
    const pad = rows.length >= 3 ? 0.36 : 0.48;

    /* 카드 하나에 필요한 높이 */
    /* 정의를 적는 카드(def)는 라벨·본문을 키웁니다 — 교실 뒤에서도 읽혀야 합니다.
       (2026-08-28 선생님 요청: "정의 같은 글자는 키워줘") */
    const labelH = c => c.def ? 0.82 : 0.58;
    const labelSz = c => c.def ? 36 : 24;
    const textSz = c => c.small ? 30 : 40.5;
    const natural = c => {
      let h = pad;
      if(c.label) h += labelH(c);
      if(c.text)  h += textH(c.text, c._w - 1.0, textSz(c), 1.4) + 0.24;
      if(c.desc)  h += textH(c.desc, c._w - 1.0, 22.5, 1.45) + 0.2;
      if(c.pills) h += pillsLayout(c.pills, 0, 0, c._w - 0.96).height + 0.05;
      return h + pad;
    };
    const rowH = rows.map(row => Math.max(...row.map(natural)));
    const total = rowH.reduce((a2, b2) => a2 + b2, 0) + (rows.length - 1) * gapY;
    const extra = (bodyH() - total) / rows.length;
    if(total > bodyH())
      console.warn(`  ⚠ '${d.title || d.ask || '제목 없음'}' 카드가 한 장에 넘칩니다 (${(total - bodyH()).toFixed(1)}인치). 글을 줄이거나 장을 나누세요.`);

    let y = M.top;
    rows.forEach((row, ri) => {
      const h = rowH[ri] + Math.max(0, extra);
      let x = M.x;
      row.forEach(c => {
        card(pptx, s, x, y, c._w, h);
        let ty = y + pad;
        if(c.label){
          s.addText(c.label, { x: x + 0.48, y: ty, w: c._w - 0.9, h: labelH(c) - 0.12,
            fontFace: T.fB, fontSize: labelSz(c), bold: true, color: c.accent ? T.brown : T.label, valign: 'middle' });
          ty += labelH(c);
        }
        if(c.text){
          const size = textSz(c);
          const th = textH(c.text, c._w - 1.0, size, 1.4);
          s.addText(runs(c.text, { fontFace: T.fT, fontSize: size, color: T.ink }),
            { x: x + 0.48, y: ty, w: c._w - 0.96, h: th, valign: 'top', lineSpacingMultiple: 1.25 });
          ty += th + 0.24;
        }
        if(c.desc){
          const th = textH(c.desc, c._w - 1.0, 22.5, 1.45);
          s.addText(runs(c.desc, { fontFace: T.fB, fontSize: 22.5, color: T.muted }),
            { x: x + 0.48, y: ty, w: c._w - 0.96, h: th, valign: 'top', lineSpacingMultiple: 1.3 });
          ty += th + 0.2;
        }
        if(c.pills) pills(pptx, s, c.pills, x + 0.48, ty + 0.05, c._w - 0.96);
        x += c._w + gapX;
      });
      y += h + gapY;
    });
    void ctx;
  },

  /* 글 + 그림 — 가장 많이 쓰는 본문.
     내용이 적으면 위아래 여백을 나눠 가운데쯤에 오게 합니다. */
  bullets(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const hasImg = !!d.image;
    const colW = hasImg ? 8.05 : M.w;
    const tx = hasImg && d.imageSide !== 'right' ? 10.8 : M.x;
    const w = hasImg ? M.w - colW - 0.75 : M.w;
    if(hasImg) picture(pptx, s, d.image, d.imageSide === 'right' ? 10.8 : M.x, M.top + 0.2, colW, bodyH() - 0.4, ctx.media);

    /* ① 높이부터 재기 */
    const items = [];
    if(d.lead) items.push({ kind: 'lead', h: textH(d.lead, w - 0.2, 34, 1.45), gap: 0.45 });
    for(const b of (d.bullets || [])){
      const [head, ...restArr] = String(b).split(' — ');
      const rest = restArr.join(' — ');
      const h1 = textH(head, w - 0.6, 28, 1.4);
      const h2 = rest ? textH(rest, w - 0.6, 24, 1.4) : 0;
      items.push({ kind: 'bullet', head, rest, h1, h2, h: h1 + 0.08 + (rest ? h2 + 0.1 : 0), gap: 0.24 });
    }
    if(d.pills) items.push({ kind: 'pills', h: pillsLayout(d.pills, 0, 0, w).height, gap: 0.4 });
    if(d.note){
      const nh = 0.76 + textH(d.note.text, w - 1.0, 24, 1.45) + 0.3;
      items.push({ kind: 'note', h: nh, gap: 0 });
    }
    const total = items.reduce((a, it) => a + it.h + it.gap, 0);

    /* ② 남는 자리를 조금 위로 몰아 배치 */
    let y = M.top + 0.3 + Math.max(0, (bodyH() - 0.3 - total) * 0.3);

    for(const it of items){
      if(it.kind === 'lead'){
        s.addText(runs(d.lead, { fontFace: T.fT, fontSize: 34, color: T.ink }),
          { x: tx, y, w, h: it.h, valign: 'top', lineSpacingMultiple: 1.3 });
      }else if(it.kind === 'bullet'){
        s.addShape(pptx.ShapeType.ellipse, { x: tx + 0.06, y: y + 0.16, w: 0.16, h: 0.16, fill: { color: T.gold }, line: { type: 'none' } });
        s.addText(runs(it.head, { fontFace: T.fB, fontSize: 28, bold: true, color: T.ink }),
          { x: tx + 0.42, y, w: w - 0.5, h: it.h1, valign: 'top', lineSpacingMultiple: 1.25 });
        if(it.rest)
          s.addText(runs(it.rest, { fontFace: T.fB, fontSize: 24, color: T.muted }),
            { x: tx + 0.42, y: y + it.h1 + 0.08, w: w - 0.5, h: it.h2, valign: 'top', lineSpacingMultiple: 1.3 });
      }else if(it.kind === 'pills'){
        pills(pptx, s, d.pills, tx, y, w);
      }else if(it.kind === 'note'){
        s.addShape(pptx.ShapeType.roundRect, { x: tx, y, w, h: it.h, fill: { color: T.soft }, line: { type: 'none' }, rectRadius: 0.25 });
        s.addText(d.note.label || '', { x: tx + 0.42, y: y + 0.26, w: w - 0.8, h: 0.44,
          fontFace: T.fB, fontSize: 24, bold: true, color: T.label, valign: 'middle' });
        s.addText(runs(d.note.text, { fontFace: T.fB, fontSize: 24, color: T.muted }),
          { x: tx + 0.42, y: y + 0.76, w: w - 0.8, h: it.h - 0.9, valign: 'top', lineSpacingMultiple: 1.3 });
      }
      y += it.h + it.gap;
    }
  },

  /* 단계 — ① 입력 → ② 판단 … 세로로 쌓기. image 를 주면 왼쪽에 그림 */
  steps(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const hasImg = !!d.image;
    if(hasImg) picture(pptx, s, d.image, M.x, M.top, 8.05, bodyH(), ctx.media);
    const sx = hasImg ? 9.55 : M.x;
    const sw = M.right - sx;

    let y = M.top;
    if(d.lead){
      const th = textH(d.lead, sw - 0.4, hasImg ? 28 : 32, 1.45);
      s.addText(runs(d.lead, { fontFace: T.fT, fontSize: hasImg ? 28 : 32, color: T.ink }),
        { x: sx, y, w: sw, h: th, valign: 'top', lineSpacingMultiple: 1.3 });
      y += th + 0.45;
    }
    const n = d.steps.length;
    const footH = d.foot ? 0.8 : 0;
    const h = Math.min(1.35, (M.bottom - y - footH - (n - 1) * 0.22) / n);
    for(const st of d.steps){
      card(pptx, s, sx, y, sw, h, { border: T.line2 });
      s.addText(st.n || '', { x: sx + 0.4, y, w: 0.9, h, fontFace: T.fT, fontSize: 32, color: T.gold, valign: 'middle' });
      s.addText(st.label, { x: sx + 1.3, y, w: 3.5, h, fontFace: T.fT, fontSize: 30, color: T.brown, valign: 'middle' });
      if(st.desc)
        s.addText(runs(st.desc, { fontFace: T.fB, fontSize: 24, color: T.muted }),
          { x: sx + 4.9, y, w: sw - 5.3, h, valign: 'middle' });
      y += h + 0.22;
    }
    if(d.foot)
      s.addText(runs(d.foot, { fontFace: T.fT, fontSize: 26, color: T.brown }),
        { x: sx, y: y + 0.05, w: sw, h: 0.6, valign: 'middle' });
  },

  /* 그림 여러 장 — 교과서 사진처럼 나란히 놓고 아래에 이름 붙이기 */
  gallery(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const n = d.items.length;
    const gap = 0.5;
    const w = (M.w - gap * (n - 1)) / n;
    let x = M.x;
    for(const it of d.items){
      const capH = (it.label ? 0.6 : 0) + (it.text ? textH(it.text, w - 0.4, 26, 1.4) + 0.2 : 0);
      picture(pptx, s, it.image, x, M.top, w, bodyH() - capH - 0.2, ctx.media);
      let y = M.bottom - capH;
      if(it.label){
        s.addText(it.label, { x, y, w, h: 0.55, fontFace: T.fT, fontSize: 30, color: T.brown, align: 'center', valign: 'middle' });
        y += 0.6;
      }
      if(it.text)
        s.addText(runs(it.text, { fontFace: T.fB, fontSize: 26, color: T.muted }),
          { x, y, w, h: capH - (it.label ? 0.6 : 0), align: 'center', valign: 'top', lineSpacingMultiple: 1.3 });
      x += w + gap;
    }
  },

  /* 빈칸 채우기 — 왼쪽 그림, 오른쪽 라벨 + 빈 상자 */
  fill(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const hasImg = !!d.image;
    if(hasImg) picture(pptx, s, d.image, M.x, 3.96, 9.25, 5.41, ctx.media);
    const x = hasImg ? 10.81 : M.x;
    const labelW = 2.64, boxX = hasImg ? 13.42 : M.x + 3.0;
    const boxW = M.right - boxX;
    const n = d.rows.length;
    const pitch = Math.min(1.105, (M.bottom - 3.99 - 0.92) / Math.max(1, n - 1));
    let y = hasImg ? 4.20 : M.top + 0.5;
    d.rows.forEach(r => {
      const label = typeof r === 'string' ? r : r.label;
      const answer = typeof r === 'string' ? '' : (r.answer || '');
      s.addText(label, { x, y, w: labelW, h: 0.54, fontFace: T.fT, fontSize: 28.5, color: T.brown, valign: 'middle' });
      card(pptx, s, boxX, y - 0.21, boxW, 0.92, { border: T.line2 });
      if(answer)
        s.addText(runs(answer, { fontFace: T.fB, fontSize: 24, color: T.muted }),
          { x: boxX + 0.35, y: y - 0.21, w: boxW - 0.7, h: 0.92, valign: 'middle' });
      y += pitch;
    });
  },

  /* 비교표 */
  table(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const cols = d.head.length;
    const rowsN = d.rows.length;
    const footH = d.foot ? 1.0 : 0;
    const th = 1.0;
    const rh = (bodyH() - th - footH - 0.3) / rowsN;
    const cw = [];
    const first = d.firstCol || 3.4;
    for(let i = 0; i < cols; i++) cw.push(i === 0 ? first : (M.w - first) / (cols - 1));

    let x = M.x;
    d.head.forEach((hd, i) => {
      s.addShape(pptx.ShapeType.roundRect, { x, y: M.top, w: cw[i] - 0.12, h: th,
        fill: { color: i === 0 ? T.soft : T.pill }, line: { type: 'none' }, rectRadius: 0.2 });
      s.addText(hd, { x, y: M.top, w: cw[i] - 0.12, h: th, fontFace: T.fT, fontSize: 30,
        color: T.ink, align: 'center', valign: 'middle' });
      x += cw[i];
    });
    let y = M.top + th + 0.2;
    d.rows.forEach(row => {
      let cx = M.x;
      row.forEach((cell, i) => {
        card(pptx, s, cx, y, cw[i] - 0.12, rh - 0.15, { border: T.line2, fill: i === 0 ? T.soft : T.white });
        /* 기호나 숫자처럼 짧은 칸은 가운데로 */
        const mid = i === 0 || String(cell).trim().length <= 3;
        s.addText(runs(cell, { fontFace: i === 0 ? T.fT : T.fB, fontSize: i === 0 ? 28 : 24, color: i === 0 ? T.brown : T.muted }),
          { x: cx + 0.3, y, w: cw[i] - 0.72, h: rh - 0.15, align: mid ? 'center' : 'left',
            valign: 'middle', lineSpacingMultiple: 1.3 });
        cx += cw[i];
      });
      y += rh;
    });
    if(d.foot)
      s.addText(runs(d.foot, { fontFace: T.fT, fontSize: 30, color: T.brown }),
        { x: M.x, y: y + 0.1, w: M.w, h: 0.8, valign: 'middle' });
    void ctx;
  },

  /* 오늘 정리 — 번호 붙은 문장 */
  summary(pptx, s, d, ctx){
    heading(pptx, s, d.title || '오늘 정리');
    const n = d.items.length;
    const gap = 0.34;
    let y = M.top;
    const h = (bodyH() - (n - 1) * gap - (d.foot ? 1.0 : 0)) / n;
    d.items.forEach((it, i) => {
      card(pptx, s, M.x, y, M.w, h);
      s.addText(String(i + 1), { x: M.x + 0.5, y, w: 0.8, h, fontFace: T.fT, fontSize: 40, color: T.gold, valign: 'middle' });
      s.addText(runs(it, { fontFace: T.fT, fontSize: 32, color: T.ink }),
        { x: M.x + 1.5, y, w: M.w - 2.1, h, valign: 'middle', lineSpacingMultiple: 1.3 });
      y += h + gap;
    });
    if(d.foot)
      s.addText(runs(d.foot, { fontFace: T.fT, fontSize: 30, color: T.brown }),
        { x: M.x, y: y + 0.05, w: M.w, h: 0.8, valign: 'middle' });
    void ctx;
  },

  /* 그림 한 장 크게 */
  image(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const capH = d.caption ? 0.9 : 0;
    picture(pptx, s, d.image, M.x + 1.6, M.top, M.w - 3.2, bodyH() - capH, ctx.media);
    if(d.caption)
      s.addText(runs(d.caption, { fontFace: T.fB, fontSize: 26, color: T.muted }),
        { x: M.x, y: M.bottom - capH + 0.15, w: M.w, h: 0.7, align: 'center', valign: 'middle' });
  },

  /* ══ 아래는 템플릿(makeitsimple)에서 뼈대만 배워 온 배치들 ══
        색·글꼴은 전부 우리 것(크림 배경·Jua·흰 카드)입니다. */

  /* 목차 — 번호 붙은 항목 목록. 오른쪽에 그림을 붙일 수 있음 */
  agenda(pptx, s, d, ctx){
    heading(pptx, s, d.title || '목차');
    const hasImg = !!d.image;
    if(hasImg) picture(pptx, s, d.image, 10.9, M.top, 7.95, bodyH(), ctx.media);
    const w = hasImg ? 9.3 : M.w;
    const items = d.items;
    const pitch = Math.min(1.7, bodyH() / items.length);
    let y = M.top + (bodyH() - pitch * items.length) / 2;
    items.forEach((it, i) => {
      const t = typeof it === 'string' ? it : it.text;
      s.addText(String((typeof it === 'object' && it.n) || i + 1).padStart(2, '0'),
        { x: M.x, y, w: 1.5, h: pitch, fontFace: T.fT, fontSize: 34, color: T.gold, valign: 'middle' });
      s.addText(runs(t, { fontFace: T.fT, fontSize: 40, color: T.ink }),
        { x: M.x + 1.7, y, w: w - 2.2, h: pitch, valign: 'middle' });
      y += pitch;
    });
  },

  /* 가로 흐름 — 카드 사이에 화살표. 단계가 옆으로 흘러갈 때 */
  flow(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const n = d.items.length;
    const arrow = 0.85, gap = 0.25;
    const w = (M.w - (n - 1) * (arrow + gap * 2)) / n;
    /* 카드 높이는 글에 맞춰 — 짧은 글에 빈 상자가 커지지 않게 */
    const th = Math.max(...d.items.map(it => it.text ? textH(it.text, w - 1.0, 24, 1.35) : 0));
    const h = Math.min(bodyH(), Math.max(2.8, 1.5 + th + 0.9));
    const y = M.top + (bodyH() - h) / 2;
    let x = M.x;
    d.items.forEach((it, i) => {
      card(pptx, s, x, y, w, h);
      s.addShape(pptx.ShapeType.roundRect, { x: x + 0.3, y: y + 0.35, w: w - 0.6, h: 0.85,
        fill: { color: T.pill }, line: { type: 'none' }, rectRadius: 0.42 });
      s.addText(it.label, { x: x + 0.3, y: y + 0.35, w: w - 0.6, h: 0.85,
        fontFace: T.fT, fontSize: 26, color: T.ink, align: 'center', valign: 'middle' });
      if(it.text)
        s.addText(runs(it.text, { fontFace: T.fB, fontSize: 24, color: T.muted }),
          { x: x + 0.5, y: y + 1.5, w: w - 1.0, h: h - 2.0, valign: 'top', align: 'center', lineSpacingMultiple: 1.35 });
      if(i < n - 1)
        s.addShape(pptx.ShapeType.rightArrow, { x: x + w + gap, y: y + h / 2 - 0.28, w: arrow, h: 0.56,
          fill: { color: T.gold2 }, line: { type: 'none' } });
      x += w + arrow + gap * 2;
    });
    void ctx;
  },

  /* 세로 흐름 — 위에서 아래로 떨어지는 단계 */
  vflow(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const n = d.items.length;
    const arrow = 0.5, gap = 0.18;
    const h = (bodyH() - (n - 1) * (arrow + gap * 2)) / n;
    let y = M.top;
    d.items.forEach((it, i) => {
      card(pptx, s, M.x, y, M.w, h);
      s.addText(it.label, { x: M.x + 0.7, y, w: 5.4, h, fontFace: T.fT, fontSize: 32, color: T.brown, valign: 'middle' });
      if(it.text)
        s.addText(runs(it.text, { fontFace: T.fB, fontSize: 25, color: T.muted }),
          { x: M.x + 6.3, y, w: M.w - 7.0, h, valign: 'middle', lineSpacingMultiple: 1.3 });
      if(i < n - 1)
        s.addShape(pptx.ShapeType.triangle, { x: M.W / 2 - 0.35, y: y + h + gap, w: 0.7, h: arrow,
          fill: { color: T.gold2 }, line: { type: 'none' }, rotate: 180 });
      y += h + arrow + gap * 2;
    });
    void ctx;
  },

  /* 큰 한마디 — 개념 한 문장을 화면 가득 */
  quote(pptx, s, d, ctx){
    if(d.title) heading(pptx, s, d.title, { num: d.num });
    const top = d.title ? M.top : 3.4;
    const h = (d.title ? M.bottom : 9.6) - top;
    s.addShape(pptx.ShapeType.roundRect, { x: M.x, y: top, w: M.w, h, fill: { color: T.white },
      line: { color: T.line2, width: 1.5 }, rectRadius: 0.4 });
    s.addText('“', { x: M.x + 0.5, y: top + 0.1, w: 2, h: 1.8, fontFace: T.fT, fontSize: 110, color: T.gold2, valign: 'middle' });
    s.addText('”', { x: M.right - 2.5, y: top + h - 1.9, w: 2, h: 1.8, fontFace: T.fT, fontSize: 110, color: T.gold2, align: 'right', valign: 'middle' });
    const descH = d.desc ? 1.3 : 0;
    s.addText(runs(d.text, { fontFace: T.fT, fontSize: d.small ? 48 : 60, color: T.ink }),
      { x: M.x + 2.0, y: top + 0.6, w: M.w - 4.0, h: h - 1.2 - descH, align: 'center', valign: 'middle', lineSpacingMultiple: 1.3 });
    if(d.desc)
      s.addText(runs(d.desc, { fontFace: T.fB, fontSize: 26, color: T.muted }),
        { x: M.x + 2.0, y: top + h - 1.6, w: M.w - 4.0, h: 1.0, align: 'center', valign: 'middle' });
    void ctx;
  },

  /* 겹치는 원 — 두세 개념이 겹치는 부분을 보여줄 때 */
  venn(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const n = Math.min(3, d.items.length);
    const D = n === 2 ? 5.6 : 5.2;
    const overlap = D * 0.32;
    const totalW = D * n - overlap * (n - 1);
    const y = M.top + (bodyH() - D) / 2 - (d.center ? 0.4 : 0);
    let x = M.x + (M.w - totalW) / 2;
    const tint = [T.pill, 'EFE3CE', 'E4D6BE'];
    d.items.slice(0, n).forEach((it, i) => {
      s.addShape(pptx.ShapeType.ellipse, { x, y, w: D, h: D, fill: { color: tint[i % 3], transparency: 25 },
        line: { color: T.line, width: 1.5 } });
      const lx = i === 0 ? x + 0.3 : (i === n - 1 ? x + D - 3.3 : x + D / 2 - 1.5);
      s.addText(it.label, { x: lx, y: y + D / 2 - 0.5, w: 3.0, h: 1.0,
        fontFace: T.fT, fontSize: 28, color: T.ink, align: 'center', valign: 'middle' });
      x += D - overlap;
    });
    if(d.center)
      s.addText(runs(d.center, { fontFace: T.fT, fontSize: 26, color: T.brown }),
        { x: M.x, y: y + D + 0.35, w: M.w, h: 1.0, align: 'center', valign: 'middle' });
    void ctx;
  },

  /* A + B — 두 가지가 합쳐져 무엇이 되는지 */
  plus(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const has3 = !!d.result;
    const sym = 1.15;
    const n = has3 ? 3 : 2;
    const w = (M.w - (n - 1) * (sym + 0.7)) / n;
    const h = Math.min(5.4, bodyH() - 0.8);
    const y = M.top + (bodyH() - h) / 2;
    const boxes = has3 ? [d.a, d.b, d.result] : [d.a, d.b];
    let x = M.x;
    boxes.forEach((b, i) => {
      card(pptx, s, x, y, w, h, i === boxes.length - 1 && has3 ? { fill: T.pill, border: T.gold2 } : {});
      /* 이름이 길면 한 줄에 들어가도록 글자를 줄입니다 */
      const lsz = textWidth(b.label, 36) > w - 0.8 ? 28 : 36;
      s.addText(runs(b.label, { fontFace: T.fT, fontSize: lsz, color: T.ink }),
        { x: x + 0.4, y: y + h / 2 - (b.text ? 1.1 : 0.6), w: w - 0.8, h: 1.2, align: 'center', valign: 'middle' });
      if(b.text)
        s.addText(runs(b.text, { fontFace: T.fB, fontSize: 24, color: T.muted }),
          { x: x + 0.5, y: y + h / 2 + 0.15, w: w - 1.0, h: 1.6, align: 'center', valign: 'top', lineSpacingMultiple: 1.3 });
      if(i < boxes.length - 1){
        const cx = x + w + 0.35, cy = y + h / 2 - sym / 2;
        if(i === 1 && has3)
          s.addText('=', { x: cx, y: cy, w: sym, h: sym, fontFace: T.fT, fontSize: 54, color: T.gold, align: 'center', valign: 'middle' });
        else
          s.addShape(pptx.ShapeType.mathPlus, { x: cx + 0.15, y: cy + 0.15, w: sym - 0.3, h: sym - 0.3,
            fill: { color: T.gold }, line: { type: 'none' } });
      }
      x += w + sym + 0.7;
    });
    void ctx;
  },

  /* 4분면 — 2×2 로 나눠 보기 */
  quad(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const gap = 0.4;
    const w = (M.w - gap) / 2, h = (bodyH() - gap) / 2;
    d.items.slice(0, 4).forEach((it, i) => {
      const x = M.x + (i % 2) * (w + gap);
      const y = M.top + Math.floor(i / 2) * (h + gap);
      card(pptx, s, x, y, w, h, it.accent ? { fill: T.soft, border: T.line } : {});
      s.addText(it.label, { x: x + 0.55, y: y + 0.45, w: w - 1.1, h: 0.7,
        fontFace: T.fT, fontSize: 30, color: T.brown, valign: 'middle' });
      if(it.text)
        s.addText(runs(it.text, { fontFace: T.fB, fontSize: 24, color: T.muted }),
          { x: x + 0.55, y: y + 1.25, w: w - 1.1, h: h - 1.8, valign: 'top', lineSpacingMultiple: 1.35 });
    });
    void ctx;
  },

  /* 연표 — 가로선 위에 점을 찍고 위아래로 설명 */
  timeline(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const n = d.items.length;
    const midY = M.top + bodyH() / 2 - 0.3;
    s.addShape(pptx.ShapeType.roundRect, { x: M.x, y: midY, w: M.w, h: 0.09,
      fill: { color: T.line2 }, line: { type: 'none' }, rectRadius: 0.045 });
    const step = M.w / n;
    d.items.forEach((it, i) => {
      const cx = M.x + step * (i + 0.5);
      s.addShape(pptx.ShapeType.ellipse, { x: cx - 0.24, y: midY - 0.19, w: 0.48, h: 0.48,
        fill: { color: T.gold }, line: { color: T.bg, width: 3 } });
      const up = i % 2 === 0;
      s.addText(it.label, { x: cx - step / 2, y: up ? midY - 1.15 : midY + 0.55, w: step, h: 0.7,
        fontFace: T.fT, fontSize: 28, color: T.brown, align: 'center', valign: 'middle' });
      if(it.text)
        s.addText(runs(it.text, { fontFace: T.fB, fontSize: 22, color: T.muted }),
          { x: cx - step / 2 + 0.2, y: up ? midY - 3.0 : midY + 1.25, w: step - 0.4, h: 1.8,
            align: 'center', valign: up ? 'bottom' : 'top', lineSpacingMultiple: 1.3 });
    });
    void ctx;
  },

  /* 막대 비교 — 수치를 눈으로 견주기 (가장 큰 값 기준) */
  bars(pptx, s, d, ctx){
    heading(pptx, s, d.title, { num: d.num });
    const items = d.items;
    const max = Math.max(...items.map(i => i.value));
    const baseY = M.bottom - 1.15;
    const top = M.top + 0.5;
    const gap = 0.5;
    const w = Math.min(2.6, (M.w - gap * (items.length - 1)) / items.length);
    const totalW = w * items.length + gap * (items.length - 1);
    let x = M.x + (M.w - totalW) / 2;
    items.forEach(it => {
      const h = Math.max(0.5, (baseY - top) * (it.value / max));
      s.addShape(pptx.ShapeType.roundRect, { x, y: baseY - h, w, h,
        fill: { color: it.accent ? T.gold : T.pill }, line: { type: 'none' }, rectRadius: 0.2 });
      s.addText(it.show || String(it.value), { x: x - 0.4, y: baseY - h - 0.85, w: w + 0.8, h: 0.7,
        fontFace: T.fT, fontSize: 26, color: T.brown, align: 'center', valign: 'middle' });
      s.addText(it.label, { x: x - 0.4, y: baseY + 0.12, w: w + 0.8, h: 0.8,
        fontFace: T.fB, fontSize: 24, bold: true, color: T.ink, align: 'center', valign: 'middle' });
      x += w + gap;
    });
    void ctx;
  },

  /* 노드-간선 그림 — 지도처럼 동그라미를 선으로 잇습니다.
     nodes: [{id,label,x,y,accent,dim}]  x,y 는 본문 영역 안 비율(0~100)
     edges: [{from,to,label,dim}] */
  diagram(pptx, s, d){
    heading(pptx, s, d.title, { num: d.num });
    drawGraph(pptx, s, d, d.nodes, d.edges || []);
  },

  /* 탐색 트리 — parent 만 적으면 자리는 알아서 잡습니다.
     nodes: [{id,label,parent,edge,accent,dim}]  (dim=이미 나온 상태를 흐리게) */
  tree(pptx, s, d){
    heading(pptx, s, d.title, { num: d.num });
    const kids = {}, depth = {};
    d.nodes.forEach(n => { if(n.parent) (kids[n.parent] ||= []).push(n.id); });
    const byId = Object.fromEntries(d.nodes.map(n => [n.id, n]));
    const dep = id => depth[id] ??= (byId[id].parent ? dep(byId[id].parent) + 1 : 0);
    d.nodes.forEach(n => dep(n.id));
    const maxD = Math.max(...d.nodes.map(n => depth[n.id]));

    /* 잎부터 자리를 나눠 주고, 부모는 자식들 가운데에 놓습니다 */
    let slot = 0; const col = {};
    const place = id => {
      const ch = kids[id] || [];
      if(!ch.length){ col[id] = slot++; return; }
      ch.forEach(place);
      col[id] = (col[ch[0]] + col[ch[ch.length - 1]]) / 2;
    };
    d.nodes.filter(n => !n.parent).forEach(n => place(n.id));
    const cols = Math.max(1, slot - 1);

    const nodes = d.nodes.map(n => ({
      ...n,
      x: cols === 0 ? 50 : (col[n.id] / cols) * 100,
      y: maxD === 0 ? 50 : (depth[n.id] / maxD) * 100,
    }));
    const edges = d.nodes.filter(n => n.parent)
      .map(n => ({ from: n.parent, to: n.id, label: n.edge, dim: n.dim }));
    drawGraph(pptx, s, {
      ...d, compress: true,
      nodeW: d.nodeW || Math.min(2.6, (M.w - 0.6) / (slot || 1) - 0.15),
    }, nodes, edges);
  },

  /* 판 여러 개 나란히 — 8-퍼즐의 처음과 목표를 견주어 볼 때 */
  boards(pptx, s, d){
    heading(pptx, s, d.title, { num: d.num });
    const n = d.items.length;
    const gap = d.arrow === false ? 1.0 : 2.0;
    const capH = d.items.some(i => i.label) ? 0.75 : 0;
    const size = Math.min(4.8, (M.w - gap * (n - 1)) / n, bodyH() - capH - (d.foot ? 1.0 : 0));
    const totalW = size * n + gap * (n - 1);
    let x = M.x + (M.w - totalW) / 2;
    const y = M.top + capH + (bodyH() - (d.foot ? 1.0 : 0) - size - capH) / 2;
    d.items.forEach((it, i) => {
      if(it.label)
        s.addText(it.label, { x: x - 0.6, y: y - 0.7, w: size + 1.2, h: 0.6,
          fontFace: T.fT, fontSize: 28, color: it.accent ? T.brown : T.label, align: 'center', valign: 'middle' });
      drawBoard(pptx, s, x, y, size, it.board, {
        border: it.accent ? T.gold : T.line, lw: it.accent ? 2.5 : 1.5,
        tile: it.accent ? T.gold2 : T.pill,
      });
      if(i < n - 1 && d.arrow !== false)
        s.addShape(pptx.ShapeType.rightArrow, { x: x + size + 0.5, y: y + size / 2 - 0.3, w: 1.0, h: 0.6,
          fill: { color: T.gold2 }, line: { type: 'none' } });
      x += size + gap;
    });
    if(d.foot)
      s.addText(runs(d.foot, { fontFace: T.fT, fontSize: 26, color: T.brown }),
        { x: M.x, y: M.bottom - 0.85, w: M.w, h: 0.8, align: 'center', valign: 'middle' });
  },
};

/* 8-퍼즐 같은 3×3 판 하나 */
function drawBoard(pptx, s, x, y, size, board, opt = {}){
  const N = 3, pad = 0.09;
  const cell = (size - pad * 2) / N;
  s.addShape(pptx.ShapeType.roundRect, { x, y, w: size, h: size,
    fill: { color: opt.fill || T.white },
    line: { color: opt.border || T.line, width: opt.lw || 1.5 }, rectRadius: 0.16 });
  board.forEach((v, i) => {
    if(v === '' || v == null) return;                 // 빈칸은 그리지 않음
    const cx = x + pad + (i % N) * cell, cy = y + pad + Math.floor(i / N) * cell;
    s.addShape(pptx.ShapeType.roundRect, { x: cx + 0.03, y: cy + 0.03, w: cell - 0.06, h: cell - 0.06,
      fill: { color: opt.tile || T.pill }, line: { type: 'none' }, rectRadius: 0.09 });
    s.addText(String(v), { x: cx, y: cy, w: cell, h: cell, fontFace: T.fT,
      fontSize: Math.round(cell * 46), color: opt.dim ? T.label : T.ink, align: 'center', valign: 'middle' });
  });
}

/* 노드와 간선을 실제로 그리는 부분 — diagram 과 tree 가 같이 씁니다 */
function drawGraph(pptx, s, d, nodesIn, edges){
  const footH = d.foot ? 0.95 : 0;
  const pad = 0.75;                                   // 가장자리에 붙지 않게
  const boardMode = nodesIn.some(n => n.board);
  const NH = d.nodeH || (boardMode ? 1.75 : 0.92);
  const sideW = d.side ? 5.9 : 0;                     // 오른쪽 설명 칸
  const gW = M.w - (sideW ? sideW + 0.55 : 0);

  /* 원본을 건드리지 않도록 복사해서 씁니다 */
  const nodes = nodesIn.map(n => ({ ...n }));

  /* 자리가 남는다고 끝까지 벌리면 간선만 길어집니다 — 최대 간격을 정해 두고 가운데로 모읍니다 */
  if(d.compress){
    const squeeze = (key, span, maxGap) => {
      const vals = [...new Set(nodes.map(n => n[key]))].sort((a, b) => a - b);
      if(vals.length < 2) return;
      let minGap = Infinity;
      for(let i = 1; i < vals.length; i++) minGap = Math.min(minGap, vals[i] - vals[i - 1]);
      const cur = minGap / 100 * span;
      if(cur <= maxGap) return;
      const sc = maxGap / cur;
      nodes.forEach(n => { n[key] = 50 + (n[key] - 50) * sc; });
    };
    squeeze('x', gW - pad * 2, d.maxGapX || (boardMode ? NH + 1.1 : 3.5));
    squeeze('y', bodyH() - footH - NH - 0.3, d.maxGapY || (boardMode ? NH + 1.0 : 2.3));
  }

  /* 동그라미가 반쯤 잘리지 않게 위아래로 반 칸씩 비워 둡니다 */
  const A = { x: M.x + pad, y: M.top + NH / 2 + 0.1, w: gW - pad * 2,
              h: bodyH() - footH - NH - 0.3 };
  /* 이웃한 칸 사이 거리 — 이보다 넓은 동그라미는 서로 겹칩니다 */
  const xs = [...new Set(nodes.map(n => n.x))].sort((a, b) => a - b);
  let colGap = Infinity;
  for(let i = 1; i < xs.length; i++) colGap = Math.min(colGap, (xs[i] - xs[i - 1]) / 100 * A.w);
  /* nodeMinW — 노드가 아주 많은 큰 트리에서 동그라미를 더 작게 (2026-09-01 추가) */
  const minW = d.nodeMinW || 1.1;
  const maxW = colGap === Infinity ? 99 : Math.max(minW, colGap - 0.22);

  const pos = {};
  const wOf = n => n.board ? NH
    : Math.min(maxW, Math.max(d.nodeW || 1.9, textWidth(n.label, 24) + 0.85));
  nodes.forEach(n => { pos[n.id] = { cx: A.x + A.w * n.x / 100, cy: A.y + A.h * n.y / 100, w: wOf(n) }; });

  /* 오른쪽 설명 칸 — 트리를 보면서 용어를 짚을 수 있게 */
  if(d.side){
    const gap = 0.3;
    const sh = (bodyH() - gap * (d.side.length - 1)) / d.side.length;
    let sy = M.top;
    for(const it of d.side){
      card(pptx, s, M.right - sideW, sy, sideW, sh, it.accent ? { fill: T.pill, border: T.gold2 } : {});
      s.addText(it.label, { x: M.right - sideW + 0.45, y: sy + 0.22, w: sideW - 0.9, h: 0.55,
        fontFace: T.fT, fontSize: 26, color: T.brown, valign: 'middle' });
      if(it.text){
        /* 상자를 넘치지 않게 글자를 줄여 맞춥니다.
           big:true 는 오픈/닫힌 리스트처럼 **값 자체를 읽어야 하는** 칸입니다 —
           30pt 에서 시작해 필요한 만큼만 줄입니다 (2026-08-28 선생님 요청) */
        const top = it.big ? 30 : 21, bottom = it.big ? 19 : 15;
        let fs = top;
        while(fs > bottom && textH(it.text, sideW - 0.9, fs, 1.4) > sh - 1.0) fs -= 1;
        s.addText(runs(it.text, { fontFace: T.fB, fontSize: fs,
                                  color: it.big ? T.ink : T.muted }),
          { x: M.right - sideW + 0.45, y: sy + 0.8, w: sideW - 0.9, h: sh - 1.0,
            valign: 'top', lineSpacingMultiple: 1.3 });
      }
      sy += sh + gap;
    }
  }

  /* 간선을 먼저 그려야 노드 밑에 깔립니다 */
  for(const e of edges){
    const a = pos[e.from], b = pos[e.to];
    if(!a || !b) continue;
    /* 위아래로 이어진 선은 동그라미의 위·아래에, 옆으로 이어진 선은 좌·우에 붙입니다 */
    const vertical = Math.abs(b.cy - a.cy) >= Math.abs(b.cx - a.cx);
    const sgnY = b.cy > a.cy ? 1 : -1, sgnX = b.cx > a.cx ? 1 : -1;
    const x1 = vertical ? a.cx : a.cx + sgnX * a.w / 2;
    const y1 = vertical ? a.cy + sgnY * NH / 2 : a.cy;
    const x2 = vertical ? b.cx : b.cx - sgnX * b.w / 2;
    const y2 = vertical ? b.cy - sgnY * NH / 2 : b.cy;
    const dx = x2 - x1, dy = y2 - y1;
    s.addShape(pptx.ShapeType.line, {
      x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(dx), h: Math.abs(dy),
      line: { color: e.dim ? T.line2 : T.line, width: e.dim ? 1.25 : 1.75,
              dashType: e.dim ? 'dash' : 'solid' },
      flipV: dx * dy < 0,
    });
    if(e.label){
      /* 글자 상자가 넓으면 선이 뭉텅 끊겨 보입니다 — 글자에 딱 맞춥니다 */
      const lw = textWidth(e.label, 19) + 0.38;
      s.addText(e.label, { x: (x1 + x2) / 2 - lw / 2, y: (y1 + y2) / 2 - 0.23, w: lw, h: 0.46,
        fontFace: T.fB, fontSize: 19, color: T.muted, align: 'center', valign: 'middle',
        fill: { color: T.bg } });
    }
  }

  /* color:"blue"|"red" — 시작·목표를 가려 보이게 (없으면 기존 accent/dim 규칙 그대로) */
  const hue = n => n.color === 'blue' ? { line: T.blue, fill: T.blueBg, text: T.blue }
                 : n.color === 'red'  ? { line: T.red,  fill: T.redBg,  text: T.red }
                 : null;

  for(const n of nodes){
    const p = pos[n.id];
    const H = hue(n);
    if(n.board){
      drawBoard(pptx, s, p.cx - NH / 2, p.cy - NH / 2, NH, n.board, {
        fill: H ? H.fill : (n.dim ? T.bg : T.white),
        border: H ? H.line : (n.accent ? T.gold : (n.dim ? T.line2 : T.line)),
        lw: H ? 2.5 : (n.accent ? 2.5 : 1.5),
        tile: n.dim ? T.soft : (n.accent ? T.gold2 : T.pill),
        dim: n.dim,
      });
      if(n.label)
        s.addText(n.label, { x: p.cx - NH / 2 - 0.5, y: p.cy + NH / 2 + 0.05, w: NH + 1.0, h: 0.45,
          fontFace: T.fT, fontSize: 21, color: H ? H.text : (n.accent ? T.brown : T.muted), align: 'center', valign: 'middle' });
      continue;
    }
    s.addShape(pptx.ShapeType.roundRect, {
      x: p.cx - p.w / 2, y: p.cy - NH / 2, w: p.w, h: NH,
      fill: { color: H ? H.fill : (n.dim ? T.bg : (n.accent ? T.pill : T.white)) },
      line: { color: H ? H.line : (n.dim ? T.line2 : (n.accent ? T.gold : T.line)),
              width: H ? 2.75 : (n.accent ? 2.25 : 1.5),
              dashType: n.dim ? 'dash' : 'solid' },
      rectRadius: NH / 2,
    });
    /* 좁은 자리에서는 글자를 줄여 한 줄에 넣습니다 */
    let fs = 24;
    while(fs > 15 && textWidth(n.label, fs) > p.w - 0.3) fs -= 1;
    s.addText(runs(n.label, { fontFace: T.fT, fontSize: fs, color: H ? H.text : (n.dim ? T.label : T.ink) }),
      { x: p.cx - p.w / 2, y: p.cy - NH / 2, w: p.w, h: NH, align: 'center', valign: 'middle' });
  }

  if(d.foot)
    s.addText(runs(d.foot, { fontFace: T.fT, fontSize: 26, color: T.brown }),
      { x: M.x, y: M.bottom - footH + 0.1, w: M.w, h: 0.8, valign: 'middle' });
}

/* ── 만들기 ────────────────────────────── */
async function build(deck, outFile){
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CLASS20', width: M.W, height: M.H });
  pptx.layout = 'CLASS20';
  pptx.title = deck.title || '수업자료';

  const ctx = { kicker: deck.kicker || '', media: deck.media || DEFAULT_MEDIA };

  deck.slides.forEach((d, i) => {
    const fn = LAYOUT[d.type];
    if(!fn) die(`${i + 1}번째 슬라이드의 type '${d.type}' 을 모르겠습니다.`);
    const s = pptx.addSlide();
    bg(s);
    if(d.ask){
      /* 질문 상자를 먼저 그리고, 본문은 그 아래에서 시작하게 합니다 */
      heading(pptx, s, d.title, { num: d.num });
      const top = askBox(pptx, s, d.ask);
      const save = M.top;
      M.top = top;
      fn(pptx, s, { ...d, title: '' }, ctx);   // 제목은 이미 그렸으니 비웁니다
      M.top = save;
    }else{
      fn(pptx, s, d, ctx);
    }
    if(d.notes) s.addNotes(d.notes);   // 발표자 대본 — 앱의 '내 대본 메모'에 옮겨 쓸 수 있습니다
  });

  await pptx.writeFile({ fileName: outFile });
  return outFile;
}

/* ── 실행 ────────────────────────────── */
const argv = process.argv.slice(2);
if(!argv.length){
  console.log('쓰는 법: node tools/deck-build.mjs <덱.json> [-o 나올파일.pptx] [--media <폴더>]');
  process.exit(0);
}
const src = argv[0];
if(!fs.existsSync(src)) die(`파일이 없습니다: ${src}`);

const deck = JSON.parse(fs.readFileSync(src, 'utf8'));
const oi = argv.indexOf('-o');
const mi = argv.indexOf('--media');
if(mi > 0 && argv[mi + 1]) deck.media = argv[mi + 1];

const out = oi > 0 && argv[oi + 1]
  ? path.resolve(argv[oi + 1])
  : path.resolve(path.dirname(src), (deck.out || path.basename(src).replace(/\.json$/, '')) + (deck.out?.endsWith('.pptx') ? '' : '.pptx'));

await build(deck, out);
console.log(`✔ ${deck.slides.length}장 — ${out}`);
console.log('  PowerPoint 에서 손본 뒤  node tools/deck-png.mjs "' + out + '"  로 PNG 를 뽑으세요.');
void ROOT;
