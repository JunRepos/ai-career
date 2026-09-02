# -*- coding: utf-8 -*-
"""
verify/assess1-docs.py — 1차 수행평가 문서 세 종을 만듭니다

  ① assess1-guide.html  학생 배부용 안내서 (채점기준표 포함, 평가 일주일 전 배부)
  ② assess1-sheet.html  평가지 (학생이 푸는 것)
  ③ assess1-key.html    교사용 정답지 · 채점 기준

⚠ 정답은 손으로 적지 않습니다. verify/assess1.py 가 실제로 돌려 만든
   verify/assess1-facts.json 을 읽어 씁니다. (CLAUDE.md 14·15)

근거
  · 「인공지능기초 수행평가 운영패키지」 수행평가 ① — 문항 구성·채점 프로토콜·이의신청 대응
  · docs/course-map.md — 성취기준 [12인기01-02][12인기01-03][12인기01-04], 20점(20%)
  · 평가 운영 계획 — 기본점수는 해당 영역 만점의 20~40%%, 모든 수행평가는 수업 중 실시
  · 교과서 37쪽 활동3 — 빈칸 이동 순서 위·아래·왼·오른, h(n)=제자리에 없는 타일 수
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'tools', 'samples')
F = json.load(io.open(os.path.join(HERE, 'assess1-facts.json'), encoding='utf-8'))

W = F['size']['w']
START, GOAL = F['start'], F['goal']
BFS, TREE, AST = F['bfs'], F['tree2'], F['astar']

# ── 배점 (합 20점) ─────────────────────────────
# 규정: 기본점수는 해당 영역 만점의 20~40%% → 20점의 20% = 4점
SCORE = {'base': 4, 1: 2, 2: 2, 3: 2, 4: 3, 5: 2, 6: 5}
assert SCORE['base'] + sum(SCORE[i] for i in range(1, 7)) == 20

CSS = """
@page { size: A4 portrait; margin: 12mm 14mm; }
html, body { background:#fff; color-scheme: light only; }
body { font-family:"맑은 고딕","Malgun Gothic",sans-serif; color:#111;
       font-size:10.5pt; line-height:1.55; margin:0; width:182mm; }
h1 { font-size:16pt; margin:0 0 2mm; letter-spacing:-0.3px }
h2 { font-size:12pt; margin:6mm 0 2mm; padding-bottom:1mm; border-bottom:1.4pt solid #222 }
h3 { font-size:11pt; margin:4mm 0 1.5mm }
.top { display:flex; justify-content:space-between; align-items:flex-end;
       border-bottom:2.2pt solid #111; padding-bottom:2mm; margin-bottom:3mm }
.top .sub { font-size:9.5pt; color:#444 }
.name { font-size:10pt; border:1pt solid #444; padding:2mm 3mm; white-space:nowrap }
table { border-collapse:collapse; width:100%; margin:2mm 0 }
th, td { border:0.8pt solid #666; padding:1.6mm 2mm; font-size:9.8pt; vertical-align:top }
th { background:#f0f0f0; font-weight:700; text-align:center }
.center { text-align:center }
.q { margin:4mm 0 0; padding:2.5mm 3mm; border:1pt solid #222; background:#fafafa;
     font-weight:700; font-size:11pt; display:flex; justify-content:space-between }
.q .pt { font-weight:700; color:#333 }
.hint { font-size:9.3pt; color:#444; margin:1.5mm 0 }
.rule { border:1pt solid #222; padding:3mm; margin:3mm 0; background:#f7f7f7 }
.rule ol { margin:0; padding-left:5mm }
.rule li { margin:1mm 0; font-size:10pt }
.ans { border:0.8pt solid #888; min-height:18mm; margin:2mm 0; padding:2mm }
.lines div { border-bottom:0.6pt solid #999; height:7.2mm }
.bd { display:inline-block; border:1.2pt solid #222; border-collapse:collapse }
.bd table { margin:0; width:auto }
.bd td { width:7.5mm; height:7.5mm; text-align:center; font-size:11pt; font-weight:700;
         border:0.8pt solid #666; padding:0 }
.bd td.blank { background:#eee }
.sm td { width:6mm; height:6mm; font-size:9pt }
.row { display:flex; gap:6mm; align-items:center; flex-wrap:wrap; margin:2mm 0 }
.cap { font-size:9pt; color:#333; text-align:center; margin-top:1mm }
.pair { display:flex; gap:3mm; align-items:center }
.arrow { font-size:14pt; color:#444 }
.grid { display:flex; gap:4mm; flex-wrap:wrap }
.slot { text-align:center }
.note { font-size:9.2pt; color:#333; border-left:2.5pt solid #999; padding-left:2.5mm; margin:2mm 0 }
.pagebreak { page-break-before:always }
.small { font-size:9pt; color:#444 }
"""


def board_html(state, cls='', blanks=False):
    """2×3 판. blanks=True 면 숫자를 지우고 빈 칸으로 (학생이 채우는 자리)"""
    rows = ''
    for r in range(len(state) // W):
        tds = ''
        for c in range(W):
            v = state[r * W + c]
            if blanks:
                tds += '<td></td>'
            elif v == 0:
                tds += '<td class="blank"></td>'
            else:
                tds += '<td>%d</td>' % v
        rows += '<tr>%s</tr>' % tds
    return '<span class="bd %s"><table>%s</table></span>' % (cls, rows)


def pair_html(a, b, cap_a='초기 상태', cap_b='목표 상태'):
    return ('<div class="row"><div class="slot">%s<div class="cap">%s</div></div>'
            '<div class="arrow">→</div>'
            '<div class="slot">%s<div class="cap">%s</div></div></div>'
            % (board_html(a), cap_a, board_html(b), cap_b))


def page(title, body):
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
            '<title>%s</title><style>%s</style></head><body>%s</body></html>'
            % (title, CSS, body))


HEAD = ('<div class="top"><div><h1>%s</h1>'
        '<div class="sub">인공지능 기초 · 1차 수행평가 · 탐색 알고리즘을 적용하여 문제 해결 과정 설계하기</div></div>'
        '<div class="name">%s</div></div>')

RULES = """
<div class="rule"><b>모든 문항에 공통으로 적용하는 규칙</b>
<ol>
 <li>한 번에 <b>빈칸과 붙어 있는 타일 하나</b>를 빈칸으로 밀어 판을 바꾼다.</li>
 <li>가지를 펼치는 순서는 <b>위 → 아래 → 왼 → 오른</b> 이다. (빈칸이 움직이는 방향)</li>
 <li><b>앞에서 이미 나온 상태는 다시 만들지 않는다.</b> 나오면 ✕ 로 표시하고 그 아래로 펼치지 않는다.</li>
 <li>휴리스틱값 <b>h(n) = 목표 상태와 다른 자리에 있는 타일의 수</b> (빈칸은 세지 않는다)</li>
 <li>f 값이 같으면 <b>h 가 작은 것을 먼저</b> 테스트한다.</li>
</ol></div>
"""


# ══════════════════════════════════════════════
# ① 안내서
# ══════════════════════════════════════════════
def guide():
    rub = [
        ('①', '상태 공간 표현', SCORE[1],
         '상태·간선·초기 상태·목표 상태를 이 문제에 맞게 짚었다',
         '넷 중 둘 이상을 바르게 적었다', '넷 중 하나만 적었거나 못 적었다'),
        ('②', '탐색 트리 (깊이 2)', SCORE[2],
         '규칙 ②③ 을 지켜 깊이 2까지 빠짐없이 그렸다',
         '깊이 1까지 맞거나, 깊이 2에서 한두 개를 놓쳤다', '규칙을 지키지 못했다'),
        ('③', '너비 우선 탐색', SCORE[3],
         '방문 순서와 테스트한 상태 수를 모두 바르게 적었다',
         '둘 중 하나만 바르다', '둘 다 틀렸다'),
        ('④', '휴리스틱값', SCORE[4],
         'h 값을 바르게 계산하고, <b>왜 그 상태를 고르는지</b>를 h 의 크기로 설명했다',
         'h 값은 맞으나 고르는 근거를 못 적었다', 'h 계산이 틀렸다'),
        ('⑤', 'A* 적용', SCORE[5],
         'f = g + h 를 적용해 확장 순서를 바르게 적었다',
         'g 또는 h 중 하나만 바르게 적었다', 'f 를 적용하지 못했다'),
        ('⑥', '논술 — 두 탐색의 차이', SCORE[6],
         '두 방법의 테스트 수를 근거로 들고, <b>퍼즐 밖의 사례</b>에서 무엇이 휴리스틱 역할을 하는지 짚었다',
         '두 방법의 차이는 설명했으나 퍼즐 밖 사례가 없다', '한쪽 방법만 서술했다'),
    ]
    rows = ''
    for no, name, pt, a, b, c in rub:
        rows += ('<tr><td class="center">%s</td><td>%s</td><td class="center">%d</td>'
                 '<td>%s</td><td>%s</td><td>%s</td></tr>' % (no, name, pt, a, b, c))

    body = HEAD % ('수행평가 안내서', '2학년 &nbsp; 반 &nbsp; 번 &nbsp; 이름') + """
<h2>1. 무엇을 평가하는가</h2>
<table>
<tr><th style="width:26mm">평가 요소</th><td>탐색 알고리즘을 적용하여 문제 해결 과정을 설계하기</td></tr>
<tr><th>성취기준</th><td>[12인기01-02] 탐색의 중요성을 이해하고 문제 해결을 위한 탐색 과정을 설계한다<br>
[12인기01-03] 맹목적 탐색과 정보 이용 탐색의 차이를 중심으로 지능적 탐색의 원리를 파악한다<br>
[12인기01-04] 지능적 탐색이 필요한 문제를 찾고 정보 이용 탐색 알고리즘을 적용한다</td></tr>
<tr><th>배점</th><td><b>20점</b> (학기 성적의 20%%) · 기본점수 <b>%d점</b> (응시하면 받습니다)</td></tr>
<tr><th>방식</th><td>수업 시간에 <b>종이로</b> 봅니다. 두 차시에 나누어 봅니다 (1차시 ①~③ · 2차시 ④~⑥)</td></tr>
<tr><th>준비물</th><td>필기구 · 자 (컴퓨터·휴대전화 사용하지 않습니다)</td></tr>
</table>

<h2>2. 문제는 이렇게 나옵니다</h2>
<p class="hint">수업에서 다룬 <b>8퍼즐(3×3)과 원리가 같고, 판의 크기만 2×3 으로 작습니다.</b>
아래가 실제 평가에 나오는 판입니다. 규칙도 평가지에 그대로 인쇄됩니다.</p>
%s
%s

<h2>3. 채점 기준표</h2>
<table>
<tr><th style="width:8mm">문항</th><th style="width:32mm">무엇을 보는가</th><th style="width:10mm">배점</th>
<th>잘함 (배점 전부)</th><th>보통 (절반)</th><th>노력 요함 (0점)</th></tr>
%s
</table>
<p class="small">기본점수 %d점을 더해 <b>20점 만점</b>입니다. 결시자는 학교 학업성적관리규정에 따릅니다.</p>

<h2>4. 이렇게 준비하세요</h2>
<table>
<tr><th style="width:26mm">이것만은</th><td>
① 빈칸을 옮겨 다음 상태를 만드는 연습 — 방향 순서(위·아래·왼·오른)를 지켜서<br>
② 이미 나온 상태에 ✕ 표시하기 — 안 하면 트리가 무한히 늘어납니다<br>
③ h 세기 — 목표와 <b>다른 자리</b>에 있는 타일 수 (빈칸 제외)<br>
④ f = g + h 계산 — g 는 지금까지 옮긴 횟수</td></tr>
<tr><th>수업 자료</th><td>앱 → 수업자료 「6. 지능적 탐색」 과 교과서 34~37쪽</td></tr>
<tr><th>연습</th><td>앱 → 실습 「8퍼즐 맞추기」 — 맞추면 내가 지나온 탐색 트리를 보여 줍니다</td></tr>
</table>

<h2>5. 인공지능 사용에 대하여</h2>
<p class="hint">이 평가는 수업 중에 종이로 봅니다. 생성형 인공지능을 <b>쓸 수 없습니다.</b>
평가 전 연습 과정에서 인공지능의 도움을 받았다면, 평가지 맨 뒤 <b>「인공지능 활용 기록란」</b>에
무엇을 물어봤는지 적어 주세요. 적었다고 감점하지 않습니다.</p>
""" % (SCORE['base'], pair_html(START, GOAL), RULES, rows, SCORE['base'])
    return page('수행평가 안내서', body)


# ══════════════════════════════════════════════
# ② 평가지
# ══════════════════════════════════════════════
def qhead(no, title, pt):
    return '<div class="q"><span>%s %s</span><span class="pt">[%d점]</span></div>' % (no, title, pt)


def lines(n):
    return '<div class="ans lines">%s</div>' % ('<div></div>' * n)


def blank_boards(n, cap=''):
    out = ''
    for i in range(n):
        out += ('<div class="slot">%s<div class="cap">%s</div></div>'
                % (board_html([0] * 6, blanks=True), cap))
    return '<div class="grid">%s</div>' % out


def sheet():
    body = HEAD % ('수행평가 평가지', '2학년 &nbsp; 반 &nbsp; 번 &nbsp; 이름') + """
<p class="hint">아래 2×3 퍼즐을 <b>초기 상태에서 목표 상태로</b> 바꾸려고 합니다.
수업에서 다룬 8퍼즐과 원리가 같고 판만 작습니다.</p>
%s
%s

%s
<p class="hint">이 문제를 탐색 문제로 보았을 때, 아래 네 가지가 각각 무엇인지 쓰시오.</p>
<table>
<tr><th style="width:28mm">상태</th><td style="height:11mm"></td></tr>
<tr><th>간선(행동)</th><td style="height:11mm"></td></tr>
<tr><th>초기 상태</th><td style="height:11mm"></td></tr>
<tr><th>목표 상태</th><td style="height:11mm"></td></tr>
</table>

%s
<p class="hint">규칙 ②③ 을 지켜 <b>깊이 2까지</b> 탐색 트리를 그리시오.
판 안에 숫자를 적고, 화살표 옆에 빈칸이 간 방향(위·아래·왼·오른)을 쓰시오.</p>
<div class="ans" style="min-height:78mm"></div>

%s
<p class="hint">너비 우선 탐색으로 <b>깊이 2까지</b> 방문하는 순서를 차례대로 쓰고(판 대신
「위·아래·왼·오른」 으로 가는 길을 적어도 됩니다), 목표 상태를 찾을 때까지
<b>테스트해야 하는 상태가 모두 몇 개</b>인지 쓰시오.</p>
%s
<table><tr><th style="width:56mm">테스트한 상태의 수</th><td style="height:11mm"></td></tr></table>

<div class="pagebreak"></div>
%s
<p class="hint">초기 상태에서 한 번 옮겨 만들 수 있는 상태들의 <b>h 값을 각각 구하고</b>,
그중 어느 것을 먼저 테스트해야 하는지 <b>h 값을 근거로</b> 설명하시오.</p>
<table>
<tr><th style="width:22mm">옮긴 방향</th><th style="width:38mm">만들어진 상태</th><th style="width:16mm">h 값</th></tr>
<tr><td style="height:13mm"></td><td></td><td></td></tr>
<tr><td style="height:13mm"></td><td></td><td></td></tr>
<tr><td style="height:13mm"></td><td></td><td></td></tr>
</table>
<p class="hint">먼저 테스트할 상태와 그 까닭:</p>
%s

%s
<p class="hint">A* 탐색으로 목표 상태를 찾는 과정을 표에 쓰시오.
(f = g + h · g 는 지금까지 옮긴 횟수)</p>
<table>
<tr><th style="width:14mm">차례</th><th style="width:44mm">테스트한 상태</th>
<th style="width:14mm">g</th><th style="width:14mm">h</th><th style="width:14mm">f</th></tr>
%s
</table>

%s
<p class="hint">너비 우선 탐색과 A* 탐색이 이 문제에서 <b>테스트한 상태의 수</b>가 왜 그렇게 차이 나는지
설명하고, <b>퍼즐이 아닌 다른 문제</b>를 하나 들어 그 문제에서는 무엇이 휴리스틱값 역할을 하는지 쓰시오.
(12줄 안팎)</p>
%s

<h3>인공지능 활용 기록란</h3>
<p class="small">평가를 준비하면서 생성형 인공지능의 도움을 받았다면 무엇을 물어봤는지 적어 주세요. 감점하지 않습니다.</p>
%s
""" % (pair_html(START, GOAL), RULES,
       qhead('①', '상태 공간으로 나타내기', SCORE[1]),
       qhead('②', '탐색 트리 그리기', SCORE[2]),
       qhead('③', '너비 우선 탐색', SCORE[3]),
       lines(4),
       qhead('④', '휴리스틱값 구하기', SCORE[4]),
       lines(3),
       qhead('⑤', 'A* 탐색 적용', SCORE[5]),
       ''.join('<tr><td class="center">%d</td><td style="height:12mm"></td><td></td><td></td><td></td></tr>'
               % i for i in range(1, 6)),
       qhead('⑥', '두 탐색을 견주어 서술하기', SCORE[6]),
       lines(12), lines(2))
    return page('수행평가 평가지', body)


# ══════════════════════════════════════════════
# ③ 교사용 정답지
# ══════════════════════════════════════════════
def key():
    d1 = [n for n in TREE if n['depth'] == 1]
    d2 = [n for n in TREE if n['depth'] == 2]

    def small_row(items):
        out = ''
        for n in items:
            out += ('<div class="slot">%s<div class="cap">%s</div></div>'
                    % (board_html(n['state'], 'sm'), n['dir'] or ''))
        return '<div class="grid">%s</div>' % out

    bfs_d2 = [v for v in BFS['order'] if v['depth'] <= 2]
    bfs_rows = ''
    for i, v in enumerate(BFS['order'], 1):
        bfs_rows += ('<tr><td class="center">%d</td><td class="center">%s</td>'
                     '<td class="center">%s</td></tr>'
                     % (i, ' '.join('_' if x == 0 else str(x) for x in v['state'][:W]) + ' / ' +
                        ' '.join('_' if x == 0 else str(x) for x in v['state'][W:]),
                        v['depth']))
    ast_rows = ''
    for i, e in enumerate(AST['expanded'], 1):
        ast_rows += ('<tr><td class="center">%d</td><td class="center">%s</td>'
                     '<td class="center">%d</td><td class="center">%d</td>'
                     '<td class="center">%d</td></tr>'
                     % (i, ' '.join('_' if x == 0 else str(x) for x in e['state'][:W]) + ' / ' +
                        ' '.join('_' if x == 0 else str(x) for x in e['state'][W:]),
                        e['g'], e['h'], e['f']))
    hrows = ''
    for c in F['h_children']:
        hrows += ('<tr><td class="center">%s</td><td class="center">%s</td>'
                  '<td class="center">%d</td></tr>'
                  % (c['dir'], ' '.join('_' if x == 0 else str(x) for x in c['state'][:W]) + ' / ' +
                     ' '.join('_' if x == 0 else str(x) for x in c['state'][W:]), c['h']))

    body = HEAD % ('교사용 정답지 · 채점 기준', '교사용') + """
<div class="note">이 정답지는 <b>verify/assess1.py</b> 가 실제로 알고리즘을 돌려 만든 것입니다.
값을 손으로 고치지 말고, 문제를 바꾸면 스크립트를 다시 돌리세요.</div>
%s

<h2>① 상태 공간 표현 [%d점]</h2>
<table>
<tr><th style="width:28mm">상태</th><td>타일 5개와 빈칸이 놓인 <b>판의 배치</b> 하나하나</td></tr>
<tr><th>간선(행동)</th><td>빈칸과 붙은 타일 하나를 빈칸으로 미는 것 (위·아래·왼·오른)</td></tr>
<tr><th>초기 상태</th><td>%s</td></tr>
<tr><th>목표 상태</th><td>%s</td></tr>
</table>
<p class="small">채점 — 넷 다 맞으면 %d점 · 둘 이상 맞으면 %d점 · 그 아래 0점.
'상태 = 판의 배치' 라는 뜻이 담겼으면 표현이 달라도 인정합니다.</p>

<h2>② 깊이 2 탐색 트리 [%d점] — 노드 %d개 (뿌리 포함)</h2>
<h3>깊이 1 — %d개</h3>
%s
<h3>깊이 2 — %d개</h3>
%s
<p class="small">채점 — 규칙 ②③ 을 지켜 빠짐없이 그렸으면 %d점 · 깊이 1 까지만 맞거나 깊이 2 에서
한두 개를 놓쳤으면 %d점. <b>중복 상태를 지우지 않아 노드가 늘어난 답안은 감점</b>합니다.</p>
<p class="small">※ 깊이 2 에서 <b>1 2 3 / _ 4 5</b> 가 나옵니다. 목표와 한 수 차이지만 아직 목표가 아닙니다.</p>

<h2>③ 너비 우선 탐색 [%d점]</h2>
<p class="small">깊이 2까지의 방문 순서(정답)와, 목표를 찾을 때까지 테스트하는 상태 수 <b>%d개</b>.</p>
<table>
<tr><th style="width:14mm">차례</th><th>상태</th><th style="width:16mm">깊이</th></tr>
%s
</table>
<p class="small">채점 — 방문 순서(깊이 2까지)와 개수(%d) 둘 다 맞으면 %d점 · 하나만 맞으면 %d점.
<b>순서를 방향(위·아래·왼·오른)으로 적은 답안도 인정</b>합니다.</p>

<h2>④ 휴리스틱값 [%d점]</h2>
<p class="small">h(초기 상태) = <b>%d</b></p>
<table>
<tr><th style="width:22mm">옮긴 방향</th><th>만들어진 상태</th><th style="width:16mm">h</th></tr>
%s
</table>
<p class="small"><b>먼저 테스트할 상태</b> — 「왼」 으로 옮긴 %s (h=%d).
h 가 가장 작다 = 목표에 가장 가까울 것으로 추정된다.</p>
<div class="note"><b>3점 판별 질문</b> — ① h 값 세 개를 모두 바르게 구했는가
② <b>h 가 작은 것을 먼저</b> 라는 근거를 적었는가. 둘 다 있어야 %d점, 하나만 있으면 %d점.</div>

<h2>⑤ A* 탐색 [%d점] — 확장 %d개</h2>
<table>
<tr><th style="width:14mm">차례</th><th>테스트한 상태</th>
<th style="width:14mm">g</th><th style="width:14mm">h</th><th style="width:14mm">f</th></tr>
%s
</table>
<p class="small">찾은 해 — <b>%s</b> (%d수). 이 문제에서는 f 값이 처음부터 끝까지 %d 로 일정합니다.
즉 <b>휴리스틱이 정확해서 헛걸음이 한 번도 없습니다.</b></p>
<p class="small">채점 — 확장 순서가 맞으면 %d점 · g 또는 h 한쪽만 맞으면 %d점.</p>

<h2>⑥ 논술 [%d점]</h2>
<table>
<tr><th style="width:16mm">%d점</th><td>① 너비 우선 <b>%d개</b> vs A* <b>%d개</b> 라는 수를 근거로 들고,
② 그 까닭을 <b>목표까지의 추정값(휴리스틱)을 쓰기 때문</b>이라고 설명하고,
③ <b>퍼즐 밖 사례</b>를 하나 들어 그 문제에서 무엇이 휴리스틱 역할을 하는지 짚었다
(예 — 길 찾기의 직선거리, 병 진단에서 증상의 수)</td></tr>
<tr><th>%d점</th><td>①②는 있으나 퍼즐 밖 사례가 없다</td></tr>
<tr><th>%d점</th><td>두 방법의 차이를 언급했으나 근거가 되는 수가 없다</td></tr>
<tr><th>0점</th><td>한쪽 방법만 서술했거나 백지</td></tr>
</table>
<div class="note"><b>5점 판별 질문</b>(운영 패키지) — 「퍼즐 밖 사례가 있는가 +
그 사례에서 무엇이 휴리스틱 역할을 하는지 짚었는가」 둘 다 있어야 5점.</div>

<h2>배점 합계</h2>
<table>
<tr><th>기본점수</th><th>①</th><th>②</th><th>③</th><th>④</th><th>⑤</th><th>⑥</th><th>합계</th></tr>
<tr><td class="center">%d</td><td class="center">%d</td><td class="center">%d</td>
<td class="center">%d</td><td class="center">%d</td><td class="center">%d</td>
<td class="center">%d</td><td class="center"><b>20</b></td></tr>
</table>

<h2>세특 기록용 표시 (운영 패키지)</h2>
<p class="small">명렬표 비고란에 두 코드만 적습니다 — <b>㉮</b> 문항 ④ 만점(근거까지 완성)
· <b>㉯</b> 문항 ⑥ 에서 진로와 이어지는 사례를 들었음.</p>
""" % (RULES,
       SCORE[1],
       board_html(START), board_html(GOAL), SCORE[1], SCORE[1] // 2 + SCORE[1] % 2,
       SCORE[2], len(TREE), len(d1), small_row(d1), len(d2), small_row(d2),
       SCORE[2], 1,
       SCORE[3], BFS['count'], bfs_rows, BFS['count'], SCORE[3], 1,
       SCORE[4], F['h_start'], hrows,
       ' '.join('_' if x == 0 else str(x) for x in F['h_children'][1]['state'][:W]) + ' / ' +
       ' '.join('_' if x == 0 else str(x) for x in F['h_children'][1]['state'][W:]),
       F['h_children'][1]['h'], SCORE[4], SCORE[4] - 1,
       SCORE[5], AST['count'], ast_rows,
       ' → '.join(AST['solution']), AST['moves'], AST['expanded'][0]['f'],
       SCORE[5], 1,
       SCORE[6], SCORE[6], BFS['count'], AST['count'], SCORE[6] - 2, SCORE[6] - 3,
       SCORE['base'], SCORE[1], SCORE[2], SCORE[3], SCORE[4], SCORE[5], SCORE[6])
    return page('교사용 정답지', body)


for name, html in (('assess1-guide', guide()), ('assess1-sheet', sheet()), ('assess1-key', key())):
    p = os.path.join(OUT, name + '.html')
    io.open(p, 'w', encoding='utf-8').write(html)
    print('->', p)
