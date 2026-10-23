# -*- coding: utf-8 -*-
"""tools/guide-publish.py — 가이드북을 앱 안에서 열 수 있게 내놓습니다

  python tools/guide-publish.py
    tools/samples/guidebook2.html  →  guide/index.html
    tools/samples/guidebook_media/ →  guide/media/

하는 일 두 가지입니다.

1. **자리 표지를 진짜 닻으로 바꿉니다.**
   `verify/guidebook.py` 는 쪽 번호를 세려고 `<span class="mk hid">@@c_knn@@</span>`
   같은 표지를 심습니다. 여기에 `id="c_knn"` 을 붙여 두면 `#c_knn` 으로 그 자리까지
   바로 내려갈 수 있습니다. 인쇄물에는 아무 영향이 없습니다 (mk 는 폭 0 · 숨김).

2. **좁은 칸에서도 읽히게 합니다.**
   가이드북 본문은 A4 인쇄용이라 `.book` 이 186mm 로 박혀 있습니다.
   `?panel=1` 로 열면 폭이 칸에 맞게 늘어나고, 두 단으로 된 곳은 위아래로 풀립니다.
   인쇄용 CSS 는 건드리지 않습니다 — 화면 전용 규칙만 뒤에 덧붙입니다.
"""
import io
import os
import re
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'samples', 'guidebook2.html')
MEDIA = os.path.join(ROOT, 'tools', 'samples', 'guidebook_media')
OUT_DIR = os.path.join(ROOT, 'guide')
OUT = os.path.join(OUT_DIR, 'index.html')

PANEL_CSS = '''
/* ── 앱 안 오른쪽 칸에서 열 때 (?panel=1) — 화면 전용. 인쇄물과 무관합니다 ── */
@media screen {
  html.gpanel, html.gpanel body { background: #fff; }
  html.gpanel .book { width: auto; max-width: 100%; padding: 10px 12px 40px; }
  html.gpanel body { font-size: 12.5px; line-height: 1.62; }
  html.gpanel .chap { break-before: auto; padding-top: 6px; }
  html.gpanel .chh h1 { font-size: 17px; }
  html.gpanel .chno { font-size: 20px; }
  html.gpanel .lead { font-size: 12.5px; }
  html.gpanel h2.sec { font-size: 14px; margin: 14px 0 7px; scroll-margin-top: 8px; }
  html.gpanel .card { padding: 8px 10px 9px; margin-bottom: 9px; scroll-margin-top: 8px; }
  html.gpanel .ct { font-size: 13.5px; }
  html.gpanel .ct code { font-size: 13px; padding: 1px 5px; }
  html.gpanel .cr { font-size: 12.5px; }
  html.gpanel .cmeta { font-size: 10.5px; }
  html.gpanel .code { font-size: 12px; padding: 6px 9px; }
  html.gpanel .code.mini { font-size: 11.5px; }
  html.gpanel .out { padding: 13px 8px 5px; }
  html.gpanel .out pre { font-size: 11.5px; }
  html.gpanel .sm, html.gpanel .read, html.gpanel .box { font-size: 12px; }
  /* 두 단으로 둔 곳은 좁은 칸에서 위아래로 풉니다 */
  html.gpanel .side { display: block; }
  html.gpanel .side .sl { flex: none !important; width: auto; }
  html.gpanel .side .sr { margin-top: 7px; }
  html.gpanel table.grid { font-size: 11.5px; }
  html.gpanel .figwrap img, html.gpanel .out img { max-width: 100%; height: auto; }
  /* 찾아간 자리를 잠깐 밝혀 줍니다 */
  html.gpanel :target { animation: gfound 2.4s ease-out; }
  @keyframes gfound { from { background: #cfe9dc; } to { background: transparent; } }
}
'''

PANEL_JS = '''
<script>
/* ?panel=1 이면 좁은 칸 모양으로 엽니다. #닻 으로 들어오면 그 자리로 내려갑니다.
   닻이 폭 0 인 표지라 scrollIntoView 로는 어긋나서, 품고 있는 카드를 찾아 맞춥니다. */
(function(){
  var q = new URLSearchParams(location.search);
  if(q.get('panel')) document.documentElement.classList.add('gpanel');
  function go(h){
    if(!h) return;
    var el = document.getElementById(h.replace('#',''));
    if(!el) return;
    /* 닻이 상자(box) 안에 있는 것도 있습니다 — 상자를 먼저 찾습니다.
       (c_metrics 「정확도 · 정밀도 · 재현율」 이 그렇습니다) */
    var box = el.closest('.box, .card, .chap, section, article') || el;
    /* 가이드북은 2만 px 가 넘습니다. 부드럽게 굴리면 한참 걸려 수업에 못 씁니다 —
       바로 옮기고, 찾은 자리를 잠깐 밝혀 어디로 갔는지 보여 줍니다. */
    box.scrollIntoView({block:'start', behavior:'auto'});
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = 'gfound 2.4s ease-out';
  }
  addEventListener('load', function(){ setTimeout(function(){ go(location.hash); }, 60); });
  addEventListener('hashchange', function(){ go(location.hash); });
  /* 품고 있는 앱에서 자리를 일러 줄 때 */
  addEventListener('message', function(e){
    if(e.data && e.data.guideGo) go('#' + e.data.guideGo);
  });
})();
</script>
'''


def main():
    if not os.path.exists(SRC):
        raise SystemExit('가이드북이 없습니다 — python verify/guidebook.py 를 먼저 돌리세요\n  %s' % SRC)
    s = io.open(SRC, encoding='utf-8').read()

    # 1. 자리 표지 → 진짜 닻
    pat = re.compile(r'<span class="mk( hid)?">@@([a-zA-Z_0-9]+)@@</span>')
    seen = set()

    def one(m):
        a = m.group(2)
        if a in seen:                      # 같은 닻이 두 번 나오면 앞의 것만 씁니다
            return m.group(0)
        seen.add(a)
        return '<span class="mk%s" id="%s">@@%s@@</span>' % (m.group(1) or '', a, a)

    s, n = pat.subn(one, s)
    print('닻 %d자리 (쓰인 이름 %d개)' % (n, len(seen)))
    if not seen:
        raise SystemExit('닻을 하나도 못 찾았습니다 — 가이드북 모양이 바뀐 것입니다. 멈춥니다.')

    # 2. 좁은 칸용 CSS 와 스크립트
    assert s.count('</style>') >= 1
    s = s.replace('</style>', PANEL_CSS + '</style>', 1)
    s = s.replace('src="guidebook_media/', 'src="media/')
    s = s.rstrip() + '\n' + PANEL_JS

    os.makedirs(OUT_DIR, exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(s)

    # 그림만 내놓습니다 — 같은 자리에 있는 검산 결과(facts.json 등)는 공개 쪽에 둘 것이 아닙니다
    dst = os.path.join(OUT_DIR, 'media')
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    os.makedirs(dst)
    for f in sorted(os.listdir(MEDIA)):
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.svg', '.webp')):
            shutil.copy2(os.path.join(MEDIA, f), os.path.join(dst, f))
    pngs = sorted(f for f in os.listdir(dst) if f.lower().endswith('.png'))
    miss = [m for m in re.findall(r'src="media/([^"]+)"', s) if m not in pngs]
    print('guide/index.html  %.0fKB · 그림 %d장%s'
          % (os.path.getsize(OUT) / 1024, len(pngs),
             ' · ⚠ 빠진 그림 %s' % miss if miss else ''))
    if miss:
        raise SystemExit('그림이 빠졌습니다 — 멈춥니다')
    print('닻 이름:', ' '.join(sorted(seen)))


if __name__ == '__main__':
    main()
