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
    const natural = c => {
      let h = pad;
      if(c.label) h += 0.58;
      if(c.text)  h += textH(c.text, c._w - 1.0, c.small ? 30 : 40.5, 1.4) + 0.24;
      if(c.desc)  h += textH(c.desc, c._w - 1.0, 22.5, 1.45) + 0.2;
      if(c.pills) h += pillsLayout(c.pills, 0, 0, c._w - 0.96).height + 0.05;
      return h + pad;
    };
    const rowH = rows.map(row => Math.max(...row.map(natural)));
    const total = rowH.reduce((a2, b2) => a2 + b2, 0) + (rows.length - 1) * gapY;
    const extra = (bodyH() - total) / rows.length;
    if(total > bodyH())
      console.warn(`  ⚠ '${d.title}' 카드가 한 장에 넘칩니다 (${(total - bodyH()).toFixed(1)}인치). 글을 줄이거나 장을 나누세요.`);

    let y = M.top;
    rows.forEach((row, ri) => {
      const h = rowH[ri] + Math.max(0, extra);
      let x = M.x;
      row.forEach(c => {
        card(pptx, s, x, y, c._w, h);
        let ty = y + pad;
        if(c.label){
          s.addText(c.label, { x: x + 0.48, y: ty, w: c._w - 0.9, h: 0.46,
            fontFace: T.fB, fontSize: 24, bold: true, color: c.accent ? T.brown : T.label, valign: 'middle' });
          ty += 0.58;
        }
        if(c.text){
          const size = c.small ? 30 : 40.5;
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
        s.addText(runs(cell, { fontFace: i === 0 ? T.fT : T.fB, fontSize: i === 0 ? 28 : 24, color: i === 0 ? T.brown : T.muted }),
          { x: cx + 0.3, y, w: cw[i] - 0.72, h: rh - 0.15, align: i === 0 ? 'center' : 'left',
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
};

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
    fn(pptx, s, d, ctx);
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
