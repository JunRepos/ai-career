# -*- coding: utf-8 -*-
"""
verify/problem-cards.py — 진로 분야별 · 실생활 「문제 상황 카드」 (1차 수행평가 1번 「문제 상황 선정」 도움 자료)

■ 2026-09-14 선생님 지시 — 학생이 검색으로 문제 상황을 찾기 어려워한다. 생성형 AI 대신
  미리 만든 카드를 보고 고르게 한다. **카드마다 실제 기사(제목 · 매체 · 날짜 · 주소)가 있어야 한다.**
  · 분야는 1차 수행평가 안내서의 「분야별 문제 상황 예시」(교과서 17~19쪽 분야 표) 열한 개 + 실생활
  · 카드에는 **문제만** 쓴다. 어떤 인공지능을 만들지는 학생이 2 · 3번 문항에서 직접 구상한다.
  · 기사는 조사하면서 페이지를 열어 제목 · 날짜를 확인한 것만 넣었다(verified 칸).
    이 파일은 한 번 더 — 주소가 지금도 열리는지 — 확인해 problem-cards-check.txt 에 적는다.

입력  scratchpad/cards/g1~g4.json (조사 결과) → verify/problem-cards.json 으로 모음
출력  tools/samples/problem-cards.html (선생님 검토용 · 인쇄 가능)
"""
import io, os, json, sys, glob, html, urllib.request, ssl, concurrent.futures as cf
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIELDS = ['보건 · 의료', '교육', '농업 · 환경', '공학 · 제조', '예술 · 미디어', '체육', '경영 · 금융',
          '사회 · 복지 · 행정', '교통', '언어 · 소통', '학교생활', '실생활']
KEYS = ('field', 'title', 'who', 'situation', 'fact', 'source')

# 2026-09-14 선생님 — 카드가 너무 자세하다(누가? 기사 속 사실?) → 제목 + 간단 요약만.
#   요약은 조사 때 기사에서 확인한 사실(situation · fact)만으로 한 문장씩 줄여 쓴 것.
SUMMARY = {
    '응급환자가 받아 줄 병원을 찾지 못해 다시 옮겨진다': '구급차가 환자를 태우고 가도 전문의나 병상이 없어 다른 병원으로 다시 옮기는 일이 하루 13건꼴로 일어난다.',
    '혼자 살다 숨지는 고독사가 해마다 늘고 있다': '가족 · 이웃과 떨어져 혼자 지내다 숨지는 사람이 2024년 3,924명으로 해마다 늘고 있다.',
    '길을 잃은 치매 환자의 실종 신고가 늘고 있다': '치매 환자 실종 신고가 4년 새 31.8% 늘어, 경찰이 많은 인력과 드론을 들여 오래 수색한다.',
    '한국어가 서툰 학생이 수업을 따라가기 어렵다': '다문화 학생이 8년 새 2배로 늘었지만, 한국어가 서툰 학생은 수업을 따라가기 어렵다.',
    '행정 업무에 밀려 수업 준비 시간이 부족하다': '교사가 성적 처리 · 보고서 같은 행정 업무에 밀려 수업 준비 시간이 부족하다.',
    '고등학교를 그만두는 학생이 늘고 있다': '학령인구는 줄지만 학업을 그만두는 고등학생 비율은 2.1%로 2002년 이후 가장 높다.',
    '여름마다 강과 호수에 녹조가 번진다': '여름마다 강과 호수에 유해 남조류가 크게 늘어 조류경보가 내려진다.',
    '폭염에 가축이 폐사하고 농업인이 쓰러진다': '2026년 여름 폭염으로 가축 68만여 마리가 폐사하고 농업인 361명이 온열질환을 겪었다.',
    '농촌에 농사지을 사람이 부족하다': '농가 인구의 절반이 65세 이상이라 농사지을 사람을 구하기 어렵다.',
    '위험한 노후 교량을 제때 가려내기 어렵다': '전국 공공 교량 가운데 안전등급 D · E를 받은 노후 교량이 115개로, 위험한 곳을 제때 가려내기 어렵다.',
    '숙련 기술을 물려받을 사람이 없다': '작은 제조업체 경영자의 37.3%가 숙련 기술을 물려줄 후계자가 없다고 답했다.',
    '전기차 배터리 화재는 번지기 시작하면 끄기 어렵다': '전기차 배터리에 불이 나면 물을 뿌려도 번져, 끄는 데 약 1시간 반이 걸렸다.',
    '불법 웹툰 사이트는 막아도 다시 생긴다': '불법 웹툰 사이트는 막아도 주소만 바꿔 다시 생기고, 불법 시장 규모가 약 7215억 원에 이른다.',
    'AI가 만든 음악과 사람의 음악을 구별하기 어렵다': 'AI가 만든 곡이 하루 5만 곡씩 올라오지만, 듣는 사람의 97%가 사람의 음악과 구별하지 못한다.',
    '전통 예능·공예를 이을 사람이 줄고 있다': '국가무형유산 보유자의 평균 나이가 75세를 넘었고, 보유자가 1명뿐인 종목이 39%다.',
    '폭염 속 야구장에서 관중이 쓰러진다': '폭염 속 프로야구 경기에서 관중 25명이 온열질환 증상을 보였고 2명이 쓰러졌다.',
    '매크로로 표를 싹쓸이해 비싸게 되판다': '암표상이 매크로 프로그램으로 표를 한꺼번에 예매한 뒤 최고 5배 값에 되팔았다.',
    '체조 점수가 바뀌어 메달 주인이 뒤바뀌었다': '파리올림픽 체조 경기에서 점수가 바뀌어 동메달 주인이 뒤바뀌는 다툼이 벌어졌다.',
    '수사기관을 사칭한 보이스피싱 피해가 커지고 있다': '수사기관을 사칭한 보이스피싱 피해액이 2025년 1분기에만 3116억 원으로 1년 전의 2.2배가 되었다.',
    '예약하고 나타나지 않는 손님 때문에 식당이 손해를 본다': '단체 예약을 해 두고 나타나지 않는 손님 때문에 식당이 준비한 음식과 자리를 버린다.',
    '한 해에 문을 닫는 자영업자가 100만 명을 넘었다': '2024년 폐업한 자영업자가 처음으로 100만 명을 넘었고, 절반이 사업 부진 때문이었다.',
    '도움이 필요한 위기 가구를 제때 찾기 어렵다': '형편이 어려운데도 복지를 신청하지 못한 위기 가구를 제때 찾아내기 어렵다.',
    '민원 공무원이 폭언 전화에 시달린다': '민원인을 직접 응대하는 공무원이 욕설 · 협박 같은 폭언 전화에 시달린다.',
    '눈비가 온 뒤 도로 파임이 한꺼번에 생긴다': '눈비가 온 뒤 도로 파임이 한꺼번에 생겨 광주에서만 1만 2천 개가 넘었다.',
    '브레이크 대신 가속 페달을 밟는 사고가 늘고 있다': '브레이크 대신 가속 페달을 밟는 사고가 5년 새 2.3배로 늘었고, 70%가 60대 이상 운전자다.',
    '고속도로에서 야생동물과 차가 부딪치는 사고가 난다': '고속도로에서 야생동물과 차가 부딪치는 사고가 5년간 6078건 일어났고, 절반 가까이가 새벽에 몰렸다.',
    '병원에서 수어 통역을 받기 어렵다': '수어를 쓰는 청각장애인의 83%가 병원에서 수어 통역이 가장 필요하다고 답했다.',
    '말이 통하지 않아 이주노동자가 산재 위험에 놓인다': '한국어가 서툰 이주노동자는 안전교육을 제대로 알아듣기 어렵고, 산재 사망률이 한국인 노동자의 약 3배다.',
    '안내문을 읽고 이해하기 어려운 성인이 있다': '성인 146만 명이 안내문 같은 일상 문서를 읽고 이해하기 어려운 수준이다.',
    '고2 수학 기초학력 미달 학생이 늘고 있다': '고2 수학 기초학력 미달 비율이 16.6%로 해마다 늘고 있다.',
    '고등학생이 겪는 학교폭력 중 사이버폭력이 많다': '학교폭력 피해 가운데 사이버폭력 비중이 고등학교에서 10.4%로 가장 높다.',
    '분리배출한 쓰레기의 3분의 1이 다시 버려진다': '분리배출한 쓰레기의 3분의 1이 선별장에서 일반 쓰레기로 다시 버려진다.',
    '구조된 유기동물 절반이 보호소에서 죽는다': '해마다 11만 마리가 넘는 유기 · 유실 동물 가운데 절반이 보호소에서 죽는다.',
    '폭우가 오면 반지하 주택이 물에 잠길 위험이 있다': '폭우가 오면 반지하 주택이 물에 잠길 위험이 있지만, 서울 약 22만 호 가운데 대책이 먼저 가는 곳은 2만 호다.',
    '해외 직구 어린이 옷에서 유해물질이 나온다': '해외 직구로 산 어린이 옷에서 국내 기준의 약 622배가 넘는 유해물질이 나왔다.',
    '여름철에 식중독이 몰려서 생긴다': '식중독 환자의 절반이 폭염과 장마가 이어지는 7~9월에 몰린다.',
}


def load(src_dir):
    cards = []
    for f in sorted(glob.glob(os.path.join(src_dir, 'g*.json'))):
        for c in json.load(io.open(f, encoding='utf-8')):
            miss = [k for k in KEYS if not c.get(k)] + [k for k in ('title', 'outlet', 'date', 'url') if not c['source'].get(k)]
            assert not miss, '%s — 빈 칸 %s' % (c.get('title'), miss)
            assert c['field'] in FIELDS, c['field']
            cards.append(c)
    cards.sort(key=lambda c: FIELDS.index(c['field']))
    return cards


def alive(url):
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return type(e).__name__


CSS = """
@page { size: A4 portrait; margin: 10mm 12mm; }
* { box-sizing: border-box; }
body { margin:0; font-family:'Pretendard','맑은 고딕','Malgun Gothic',sans-serif; color:#1c1c1c; background:#fff;
       font-size:10pt; line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.wrap { max-width:186mm; margin:0 auto; padding:6mm 0; }
header { border-bottom:2.2px solid #1c1c1c; padding-bottom:2mm; margin-bottom:3mm; }
header h1 { margin:0; font-size:15pt; letter-spacing:-.3px; }
header .sub { font-size:9pt; color:#555; margin-top:1mm; }
.how { border:1px solid #999; border-radius:2mm; background:#faf8f4; padding:2mm 3mm; font-size:9.3pt; margin-bottom:3mm; }
.how b { background:#efeae1; padding:0 1mm; }
nav { display:flex; flex-wrap:wrap; gap:1.5mm; margin:0 0 3mm; }
nav button { font:inherit; font-size:9pt; border:1px solid #1c1c1c; border-radius:3mm; background:#fff; padding:.6mm 2.4mm; cursor:pointer; }
nav button.on { background:#1c1c1c; color:#fff; }
h2 { font-size:11pt; margin:4mm 0 1.6mm; padding-left:2mm; border-left:4px solid #1c1c1c;  break-after:avoid; page-break-after:avoid; }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:2.4mm; }
.card { border:1px solid #888; border-radius:2mm; padding:2.2mm 2.8mm; break-inside:avoid; page-break-inside:avoid; background:#fff; }
.card .no { font-size:8pt; color:#888; }
.card h3 { margin:.4mm 0 1mm; font-size:10.6pt; line-height:1.4; }
.card .who { font-size:8.8pt; margin-bottom:1mm; }
.card .who b, .card .fact b { background:#efeae1; padding:0 1mm; }
.card p { margin:0 0 1mm; font-size:9.2pt; }
.card .fact { font-size:8.8pt; margin-bottom:1.2mm; }
.src { border-top:1px dotted #aaa; padding-top:1mm; font-size:8.4pt; color:#333; }
.src .t { font-weight:700; color:#1c1c1c; }
.src a { color:#1c1c1c; word-break:break-all; }
@media print { nav, .noprint { display:none } .src a::after { content:''; } }
@media (max-width: 640px) { .grid { grid-template-columns:1fr; } .wrap { padding:4mm 3mm; } }
"""

JS = """
const bs = document.querySelectorAll('nav button');
bs.forEach(b => b.onclick = () => {
  bs.forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('section').forEach(s => s.hidden = b.dataset.f !== '*' && s.dataset.f !== b.dataset.f);
});
"""


def page(cards):
    e = html.escape
    out = ['<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
           '<title>문제 상황 카드</title><style>%s</style><div class="wrap">' % CSS,
           '<header><h1>문제 상황 카드 — 진로 분야별 · 실생활</h1>'
           '<div class="sub">인공지능 기초 · 1차 수행평가 1번 「문제 상황 선정」 · 카드 %d장</div></header>' % len(cards),
           '<div class="how"><b>스스로 찾은 문제 상황</b>으로 쓰면 선정한 동기가 더 잘 드러나 좋다 (점수와는 관계없음). '
           '카드를 골랐다면 기사를 직접 읽고, 1번 「링크」 칸에 <b>기사 주소</b>를 붙여 넣는다.</div>',
           '<nav class="noprint"><button class="on" data-f="*">전체</button>%s</nav>'
           % ''.join('<button data-f="%s">%s</button>' % (e(f), e(f)) for f in FIELDS if any(c['field'] == f for c in cards))]
    n = 0
    for f in FIELDS:
        cs = [c for c in cards if c['field'] == f]
        if not cs:
            continue
        out.append('<section data-f="%s"><h2>%s</h2><div class="grid">' % (e(f), e(f)))
        for c in cs:
            n += 1
            s = c['source']
            out.append(
                '<div class="card"><div class="no">%d</div><h3>%s</h3><p>%s</p>'
                '<div class="src"><a href="%s" target="_blank" rel="noopener"><span class="t">%s</span></a><br>%s · %s</div></div>'
                % (n, e(c['title']), e(c['summary']), e(s['url']), e(s['title']), e(s['outlet']), e(s['date'])))
        out.append('</div></section>')
    out.append('</div><script>%s</script></html>' % JS)
    return '\n'.join(out)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if src:
        cards = load(src)
        io.open(os.path.join(HERE, 'problem-cards.json'), 'w', encoding='utf-8').write(
            json.dumps(cards, ensure_ascii=False, indent=1))
    cards = json.load(io.open(os.path.join(HERE, 'problem-cards.json'), encoding='utf-8'))
    for c in cards:
        assert c['title'] in SUMMARY, '요약 없음: ' + c['title']
        c['summary'] = SUMMARY[c['title']]
    assert len(SUMMARY) == len(cards), (len(SUMMARY), len(cards))

    # 주소가 지금도 열리는지 — 조사 때 WebFetch 로 확인했고, 여기서 한 번 더
    urls = [c['source']['url'] for c in cards]
    with cf.ThreadPoolExecutor(8) as ex:
        st = list(ex.map(alive, urls))
    dup = sorted({u for u in urls if urls.count(u) > 1})
    log = ['%s  %s  %s' % (s, c['field'], c['source']['url']) for s, c in zip(st, cards)]
    io.open(os.path.join(HERE, 'problem-cards-check.txt'), 'w', encoding='utf-8').write(
        '\n'.join(log) + ('\n중복 주소: %s\n' % dup if dup else '\n'))
    bad = [(s, c['title']) for s, c in zip(st, cards) if s != 200]

    io.open(os.path.join(ROOT, 'tools', 'samples', 'problem-cards.html'), 'w', encoding='utf-8').write(page(cards))
    # 사이트 — 1차 수행평가 화면의 「문제 상황 카드」 팝업 (js/views/assess1.js)
    app = dict(fields=[f for f in FIELDS if any(c['field'] == f for c in cards)],
               cards=[dict(field=c['field'], title=c['title'], summary=c['summary'],
                           src=dict(title=c['source']['title'], outlet=c['source']['outlet'],
                                    date=c['source']['date'], url=c['source']['url'])) for c in cards])
    io.open(os.path.join(ROOT, 'js', 'problem-cards-data.js'), 'w', encoding='utf-8', newline='\n').write(
        '/* 자동 생성 — verify/problem-cards.py 가 만듭니다. 직접 고치지 마세요. (1차 수행평가 「문제 상황 카드」) */\n'
        'const PC_CARDS = %s;\n' % json.dumps(app, ensure_ascii=False, indent=1))
    by = {f: sum(1 for c in cards if c['field'] == f) for f in FIELDS}
    print('cards %d  %s' % (len(cards), ' '.join('%s:%d' % (f.split(' ')[0], n) for f, n in by.items())))
    print('link 200: %d / %d%s' % (len(cards) - len(bad), len(cards), ('  ⚠ ' + str(bad)) if bad else ''))
    if dup:
        print('⚠ 중복 주소', dup)


if __name__ == '__main__':
    main()
