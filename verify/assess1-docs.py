# -*- coding: utf-8 -*-
"""
verify/assess1-docs.py — 1차 수행평가 문서 세 종

  ① assess1-guide.html  학생 배부용 안내서 (채점기준표 포함)
  ② assess1-sheet.html  평가지
  ③ assess1-key.html    교사용 정답지 · 채점 기준

⚠ **배점과 채점 기준은 제가 정하지 않습니다.**
   「2026학년도 2학년 2학기 인공지능기초과 교수학습 및 평가 운영 계획」 6-가 의
   평가요소·수행 수준(채점 기준)·기본점수를 **글자 그대로** 옮겼습니다.
     상태 공간으로 표현하기 3 · 탐색 트리 작성하기 3 · 맹목적 탐색 수행하기 3 ·
     휴리스틱 설계하고 근거 제시하기 3 · A* 탐색 적용하기 3 · 논술 5  = 20점
     기본점수 7점 (장기 미인정 결석자 6점)

⚠ 정답은 verify/assess1.py 가 실제로 돌려 만든 assess1-facts.json 에서 읽습니다.
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'tools', 'samples')
F = json.load(io.open(os.path.join(HERE, 'assess1-facts.json'), encoding='utf-8'))

W = F['size']['w']
START, GOAL = F['start'], F['goal']
BFS, TREE, AST = F['bfs'], F['tree2'], F['astar_h2']

# ── 평가 운영 계획 6-가 에서 그대로 옮긴 것 ─────────────────
AREA = '탐색 알고리즘을 적용하여 문제 해결 과정 설계하기'
FULL, BASE, BASE_ABSENT = 20, 7, 6
WHEN = '9월 3주'
STANDARDS = [
    ('[12인기01-02]', '인공지능에서 탐색의 중요성을 이해하고 문제 해결을 위한 탐색 과정을 설계한다.'),
    ('[12인기01-03]', '맹목적 탐색과 정보 이용 탐색의 차이를 중심으로 지능적 탐색의 원리를 파악한다.'),
    ('[12인기01-04]', '지능적 탐색이 필요한 문제를 찾아보고 문제 해결을 위해 정보 이용 탐색 알고리즘을 적용한다.'),
]
TASKS = [
    '제시된 2×3 슬라이딩 퍼즐의 초기 상태와 목표 상태를 정의하여 상태 공간으로 표현하기',
    '탐색 트리를 작성하고 너비 우선 탐색으로 방문 노드를 확인하기',
    '문제에 적합한 휴리스틱을 선택하고 그 근거를 제시하기',
    'A* 탐색을 적용하여 최적 경로와 확장 노드 수를 구하기',
    '두 탐색 방법의 차이를 확장 노드 수를 근거로 비교‧분석하기',
]
# (문항번호, 평가요소, 배점, [(점수, 수행 수준) …])  — 계획서 문구 그대로
RUBRIC = [
    ('①', '상태 공간으로 표현하기', 3, [
        (3, '초기 상태와 목표 상태를 정의하고, 빈칸 이동 규칙을 반영하여 가능한 다음 상태를 모두 정확하게 표현함.'),
        (2, '초기 상태와 목표 상태를 정의하고, 다음 상태를 일부 표현함.'),
        (1, '가능한 다음 상태를 표현하지 못함.')]),
    ('②', '탐색 트리 작성하기', 3, [
        (3, '탐색 트리를 정확하게 작성하고, 중복 상태를 표시하여 전개를 중단한 까닭을 설명함.'),
        (2, '탐색 트리를 작성함.'),
        (1, '탐색 트리를 작성하지 못함.')]),
    ('③', '맹목적 탐색 수행하기', 3, [
        (3, '너비 우선 탐색의 방문 순서를 정확하게 제시하고, 일정 깊이까지 전개해도 목표에 도달하지 못함을 노드 수와 함께 확인함.'),
        (2, '너비 우선 탐색의 방문 순서를 제시하고 노드 수를 셈.'),
        (1, '너비 우선 탐색의 방문 순서를 제시하지 못함.')]),
    ('④', '휴리스틱 설계하고 근거 제시하기', 3, [
        (3, '두 휴리스틱 값을 정확하게 계산하고, 실제 남은 비용을 넘지 않으면서 더 큰 값을 주는 휴리스틱이 '
            '목표에 가까운 추정이므로 탐색량을 줄인다는 근거를 들어 선택함.'),
        (2, '두 휴리스틱 값을 계산하고 하나를 선택함.'),
        (1, '휴리스틱 값을 계산하지 못함.')]),
    ('⑤', 'A* 탐색 적용하기', 3, [
        (3, 'g‧h‧f를 정확하게 계산하며 A* 탐색을 적용하여 최적 경로와 확장 노드 수를 모두 정확하게 구함.'),
        (2, 'g‧h‧f를 계산하며 A* 탐색을 적용하여 목표에 도달함.'),
        (1, 'A* 탐색을 적용하여 목표에 도달하지 못함.')]),
    ('⑥', '논술 — 두 탐색을 비교‧분석하기', 5, [
        (5, '두 탐색의 차이를 정확하게 설명하고, 확장 노드 수를 근거로 효율을 비교하며, '
            '문제 밖의 다른 사례에서도 지능적 탐색의 원리를 파악하여 분석함.'),
        (4, '두 탐색의 차이를 정확하게 설명하고, 확장 노드 수를 근거로 효율을 비교함.'),
        (3, '두 탐색의 차이를 설명하고, 지능적 탐색의 원리를 서술함.'),
        (2, '맹목적 탐색과 정보 이용 탐색의 차이를 서술하지 못함.')]),
]
assert sum(r[2] for r in RUBRIC) == FULL
assert sum(r[3][-1][0] for r in RUBRIC) == BASE          # 최저점의 합 = 기본점수 7점

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
.hint { font-size:9.3pt; color:#444; margin:1.5mm 0 }
.rule { border:1pt solid #222; padding:3mm; margin:3mm 0; background:#f7f7f7 }
.rule ol { margin:0; padding-left:5mm }
.rule li { margin:1mm 0; font-size:10pt }
.ans { border:0.8pt solid #888; min-height:18mm; margin:2mm 0; padding:2mm }
.lines div { border-bottom:0.6pt solid #999; height:7.2mm }
.bd { display:inline-block; border:1.2pt solid #222 }
.bd table { margin:0; width:auto }
.bd td { width:7.5mm; height:7.5mm; text-align:center; font-size:11pt; font-weight:700;
         border:0.8pt solid #666; padding:0 }
.bd td.blank { background:#eee }
.sm td { width:6mm; height:6mm; font-size:9pt }
.row { display:flex; gap:6mm; align-items:center; flex-wrap:wrap; margin:2mm 0 }
.cap { font-size:9pt; color:#333; text-align:center; margin-top:1mm }
.arrow { font-size:14pt; color:#444 }
.grid { display:flex; gap:4mm; flex-wrap:wrap }
.slot { text-align:center }
.note { font-size:9.2pt; color:#333; border-left:2.5pt solid #999; padding-left:2.5mm; margin:2mm 0 }
.pagebreak { page-break-before:always }
.small { font-size:9pt; color:#444 }
"""


def board_html(state, cls='', blanks=False):
    rows = ''
    for r in range(len(state) // W):
        tds = ''
        for c in range(W):
            v = state[r * W + c]
            if blanks: tds += '<td></td>'
            elif v == 0: tds += '<td class="blank"></td>'
            else: tds += '<td>%d</td>' % v
        rows += '<tr>%s</tr>' % tds
    return '<span class="bd %s"><table>%s</table></span>' % (cls, rows)


def txt(state):
    return (' '.join('_' if v == 0 else str(v) for v in state[:W]) + ' / ' +
            ' '.join('_' if v == 0 else str(v) for v in state[W:]))


def pair_html(a, b):
    return ('<div class="row"><div class="slot">%s<div class="cap">초기 상태</div></div>'
            '<div class="arrow">→</div>'
            '<div class="slot">%s<div class="cap">목표 상태</div></div></div>'
            % (board_html(a), board_html(b)))


def page(title, body):
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
            '<title>%s</title><style>%s</style></head><body>%s</body></html>'
            % (title, CSS, body))


HEAD = ('<div class="top"><div><h1>%s</h1>'
        '<div class="sub">인공지능 기초 · 1차 수행평가 · ' + AREA + '</div></div>'
        '<div class="name">%s</div></div>')

RULES = """
<div class="rule"><b>모든 문항에 공통으로 적용하는 규칙</b>
<ol>
 <li>한 번에 <b>빈칸과 붙어 있는 타일 하나</b>를 빈칸으로 밀어 판을 바꾼다.</li>
 <li>가지를 펼치는 순서는 <b>위 → 아래 → 왼 → 오른</b> 이다. (빈칸이 움직이는 방향)</li>
 <li><b>앞에서 이미 나온 상태는 다시 만들지 않는다.</b> 나오면 ✕ 로 표시하고 그 아래로 펼치지 않는다.</li>
 <li>f 값이 같으면 <b>h 가 작은 것을 먼저</b> 테스트한다.</li>
</ol></div>
"""

HEUR = """
<div class="rule"><b>휴리스틱 두 가지</b>
<ol>
 <li><b>h₁</b> = 목표 상태와 <b>다른 자리에 있는 타일의 수</b> (빈칸은 세지 않는다)</li>
 <li><b>h₂</b> = 각 타일이 제자리까지 가려면 최소 몇 칸을 움직여야 하는지를 <b>모두 더한 값</b>
     (가로로 몇 칸 + 세로로 몇 칸, 빈칸은 세지 않는다)</li>
</ol></div>
"""


# ══════════════════════════════════════════════
def rubric_table(with_scores=True):
    rows = ''
    for no, name, pt, levels in RUBRIC:
        n = len(levels)
        for i, (sc, desc) in enumerate(levels):
            first = ('<td class="center" rowspan="%d">%s</td>'
                     '<td class="center" rowspan="%d">%s<br>(%d점)</td>' % (n, no, n, name, pt)) if i == 0 else ''
            rows += '<tr>%s<td>%s</td><td class="center">%d점</td></tr>' % (first, desc, sc)
    return ('<table><tr><th style="width:8mm">문항</th><th style="width:30mm">평가요소</th>'
            '<th>수행 수준 (채점 기준)</th><th style="width:14mm">배점</th></tr>%s</table>' % rows)


def guide():
    std = '<br>'.join('%s %s' % s for s in STANDARDS)
    tasks = ''.join('<li>%s</li>' % t for t in TASKS)
    body = HEAD % ('수행평가 안내서', '2학년 &nbsp; 반 &nbsp; 번 &nbsp; 이름') + """
<div class="note">이 안내서의 <b>평가요소·배점·채점 기준·기본점수</b>는
「2026학년도 2학년 2학기 인공지능기초과 교수‧학습 및 평가 운영 계획」에 실린 것을 그대로 옮긴 것입니다.</div>

<h2>1. 무엇을 평가하는가</h2>
<table>
<tr><th style="width:26mm">평가 영역명</th><td>%s</td></tr>
<tr><th>영역 만점</th><td><b>%d점</b> · 기본점수 <b>%d점</b> (장기 미인정 결석자 %d점)</td></tr>
<tr><th>평가 시기</th><td>%s</td></tr>
<tr><th>평가 방법</th><td>■ 논술 &nbsp; ■ 교사 관찰 및 기록</td></tr>
<tr><th>성취기준</th><td>%s</td></tr>
<tr><th>수행 과제</th><td><ul style="margin:0;padding-left:5mm">%s</ul></td></tr>
</table>

<h2>2. 문제는 이렇게 나옵니다</h2>
<p class="hint">수업에서 다룬 <b>8퍼즐(3×3)과 원리가 같고, 판의 크기만 2×3 으로 작습니다.</b>
아래가 실제 평가에 나오는 판이며, 규칙과 휴리스틱 정의도 평가지에 그대로 인쇄됩니다.</p>
%s
%s
%s

<div class="pagebreak"></div>
<h2>3. 채점 기준</h2>
%s
<p class="small">최저점을 모두 받으면 %d점이 되며, 이것이 기본점수입니다.</p>

<h2>4. 이렇게 준비하세요</h2>
<table>
<tr><th style="width:26mm">이것만은</th><td>
① 빈칸을 옮겨 <b>가능한 다음 상태를 모두</b> 만들어 보기 (방향 순서 위·아래·왼·오른)<br>
② 이미 나온 상태에 ✕ 표시하고 <b>왜 멈추는지</b> 말로 설명해 보기<br>
③ 너비 우선으로 <b>깊이 2까지</b> 방문 순서를 적고 노드 수 세기<br>
④ h₁ 과 h₂ 를 <b>둘 다</b> 계산해 보고, 어느 쪽이 더 좋은 추정인지 근거 말하기<br>
⑤ f = g + h 로 A* 를 적용해 <b>최적 경로와 확장 노드 수</b> 구하기</td></tr>
<tr><th>수업 자료</th><td>앱 → 수업자료 「6. 지능적 탐색」 · 교과서 34~37쪽</td></tr>
<tr><th>연습</th><td>앱 → 실습 「8퍼즐 맞추기」 · 「도시 배달 — 지도를 보고」</td></tr>
</table>

<h2>5. 인공지능 활용에 대하여</h2>
<p class="hint">이 과목의 논술형 평가는 <b>컴퓨터 및 전자기기를 사용하지 않고 수업 중에 작성</b>합니다.
평가를 준비하는 과정에서 인공지능을 활용했다면 <b>사용 기록(사용한 인공지능 종류, 질문 내용, 출처)</b>을
평가지 마지막 칸에 적어 주세요. 적었다고 감점하지 않습니다.<br>
인공지능으로 타인의 결과물을 모방하거나 공정한 평가를 방해하는 행위는 <b>부정행위로 간주</b>합니다.</p>
""" % (AREA, FULL, BASE, BASE_ABSENT, WHEN, std, tasks,
       pair_html(START, GOAL), RULES, HEUR, rubric_table(), BASE)
    return page('수행평가 안내서', body)


# ══════════════════════════════════════════════
def qhead(no, name, pt):
    return '<div class="q"><span>%s %s</span><span>[%d점]</span></div>' % (no, name, pt)


def lines(n):
    return '<div class="ans lines">%s</div>' % ('<div></div>' * n)


def sheet():
    body = HEAD % ('수행평가 평가지', '2학년 &nbsp; 반 &nbsp; 번 &nbsp; 이름') + """
<p class="hint">아래 2×3 퍼즐을 <b>초기 상태에서 목표 상태로</b> 바꾸려고 합니다.</p>
%s
%s

%s
<p class="hint">(1) 이 문제를 탐색 문제로 볼 때 <b>상태</b>와 <b>간선(행동)</b>이 각각 무엇인지 쓰시오.</p>
<table>
<tr><th style="width:28mm">상태</th><td style="height:11mm"></td></tr>
<tr><th>간선(행동)</th><td style="height:11mm"></td></tr>
</table>
<p class="hint">(2) 초기 상태에서 <b>한 번 옮겨 만들 수 있는 상태를 모두</b> 그리고, 빈칸이 간 방향을 쓰시오.</p>
<div class="grid">%s</div>

%s
<p class="hint">규칙 ②③ 을 지켜 <b>깊이 2까지</b> 탐색 트리를 그리시오. 이미 나온 상태에는 ✕ 를 치고,
아래에 <b>왜 그 아래로 펼치지 않는지</b> 쓰시오.</p>
<div class="ans" style="min-height:72mm"></div>
%s

<div class="pagebreak"></div>
%s
<p class="hint">(1) 너비 우선 탐색으로 <b>깊이 2까지</b> 방문하는 순서를 쓰시오.
(판을 그리는 대신 빈칸이 간 방향으로 적어도 됩니다)</p>
%s
<p class="hint">(2) 깊이 2까지 전개했을 때 목표 상태가 나왔습니까? 그리고 목표 상태를 찾을 때까지
<b>모두 몇 개</b>의 상태를 방문해야 합니까?</p>
<table>
<tr><th style="width:56mm">깊이 2에서 목표가 나왔는가</th><td style="height:10mm"></td></tr>
<tr><th>목표까지 방문한 상태의 수</th><td style="height:10mm"></td></tr>
</table>

%s
<p class="hint">초기 상태에서 <b>h₁ 과 h₂ 를 모두</b> 계산하고, 둘 중 어느 것을 쓰는 편이 좋은지
<b>실제 남은 비용과 견주어</b> 근거를 들어 고르시오.</p>
<table>
<tr><th style="width:40mm">h₁ (다른 자리에 있는 타일 수)</th><td style="height:12mm"></td></tr>
<tr><th>h₂ (움직여야 할 칸 수의 합)</th><td style="height:12mm"></td></tr>
</table>
<p class="hint">고른 휴리스틱과 그 까닭:</p>
%s

<div class="pagebreak"></div>
%s
<p class="hint">④ 에서 고른 휴리스틱으로 A* 탐색을 적용하시오. (f = g + h · g 는 지금까지 옮긴 횟수)</p>
<table>
<tr><th style="width:14mm">차례</th><th style="width:44mm">테스트한 상태</th>
<th style="width:14mm">g</th><th style="width:14mm">h</th><th style="width:14mm">f</th></tr>
%s
</table>
<table>
<tr><th style="width:40mm">찾은 최적 경로</th><td style="height:11mm"></td></tr>
<tr><th>확장한 노드 수</th><td style="height:11mm"></td></tr>
</table>

%s
<p class="hint">너비 우선 탐색과 A* 탐색이 이 문제에서 <b>확장한 노드 수</b>가 왜 그렇게 차이 나는지
설명하고, <b>퍼즐이 아닌 다른 문제</b>를 하나 들어 그 문제에서는 무엇이 휴리스틱 역할을 하는지 쓰시오.</p>
%s

<h3>인공지능 활용 기록란</h3>
<p class="small">평가를 준비하며 인공지능을 활용했다면 사용한 인공지능 종류·질문 내용·출처를 적어 주세요. 감점하지 않습니다.</p>
%s
""" % (pair_html(START, GOAL), RULES,
       qhead('①', RUBRIC[0][1], RUBRIC[0][2]),
       ''.join('<div class="slot">%s<div class="cap">방향 (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div></div>'
               % board_html([0] * 6, blanks=True) for _ in range(3)),
       qhead('②', RUBRIC[1][1], RUBRIC[1][2]), lines(2),
       qhead('③', RUBRIC[2][1], RUBRIC[2][2]), lines(4),
       qhead('④', RUBRIC[3][1], RUBRIC[3][2]) + HEUR, lines(3),
       qhead('⑤', RUBRIC[4][1], RUBRIC[4][2]),
       ''.join('<tr><td class="center">%d</td><td style="height:12mm"></td><td></td><td></td><td></td></tr>'
               % i for i in range(1, 7)),
       qhead('⑥', RUBRIC[5][1], RUBRIC[5][2]), lines(12), lines(2))
    return page('수행평가 평가지', body)


# ══════════════════════════════════════════════
def key():
    d1 = [n for n in TREE if n['depth'] == 1]
    d2 = [n for n in TREE if n['depth'] == 2]

    def row_of(items):
        return '<div class="grid">%s</div>' % ''.join(
            '<div class="slot">%s<div class="cap">%s</div></div>'
            % (board_html(n['state'], 'sm'), n['dir'] or '') for n in items)

    nexts = ''.join('<div class="slot">%s<div class="cap">%s</div></div>'
                    % (board_html(n['state'], 'sm'), n['dir']) for n in F['nexts'])
    bfs2 = ''.join('<tr><td class="center">%d</td><td class="center">%s</td>'
                   '<td class="center">%d</td></tr>' % (i, txt(v['state']), v['depth'])
                   for i, v in enumerate(BFS['depth2'], 1))
    hrows = ''.join('<tr><td class="center">%s</td><td class="center">%s</td>'
                    '<td class="center">%d</td><td class="center">%d</td>'
                    '<td class="center">%d</td></tr>'
                    % (n['dir'], txt(n['state']), n['h1'], n['h2'], n['true'])
                    for n in F['nexts'])
    ast = ''.join('<tr><td class="center">%d</td><td class="center">%s</td>'
                  '<td class="center">%d</td><td class="center">%d</td>'
                  '<td class="center">%d</td></tr>'
                  % (i, txt(e['state']), e['g'], e['h'], e['f'])
                  for i, e in enumerate(AST['expanded'], 1))

    body = HEAD % ('교사용 정답지 · 채점 기준', '교사용') + """
<div class="note"><b>배점과 채점 기준은 평가 운영 계획 6-가 의 것을 그대로 옮겼습니다.</b>
정답은 <b>verify/assess1.py</b> 가 알고리즘을 실제로 돌려 만든 값입니다.
문제를 바꾸면 스크립트를 다시 돌리세요 (손으로 고치지 마세요).</div>
%s %s

<h2>① %s [%d점]</h2>
<table>
<tr><th style="width:26mm">상태</th><td>타일 5개와 빈칸이 놓인 <b>판의 배치</b> 하나하나</td></tr>
<tr><th>간선(행동)</th><td>빈칸과 붙은 타일 하나를 빈칸으로 미는 것 (위·아래·왼·오른)</td></tr>
</table>
<p class="small">초기 상태에서 한 번 옮겨 만들 수 있는 상태 — <b>%d개</b> (아래가 전부)</p>
<div class="grid">%s</div>
<p class="small">※ 아래쪽으로는 빈칸이 판 밖으로 나가므로 만들 수 없습니다. 세 개를 모두 그려야 3점입니다.</p>

<h2>② %s [%d점] — 노드 %d개 (뿌리 포함)</h2>
<h3>깊이 1 — %d개</h3>%s
<h3>깊이 2 — %d개</h3>%s
<p class="small">✕ 로 막아야 하는 곳 — 깊이 1 의 각 상태에서 <b>부모(초기 상태)로 되돌아가는 가지 %d곳</b>.
「이미 나온 상태라 다시 펼치면 같은 곳을 무한히 맴돌기 때문」 이라는 뜻이 담기면 인정합니다.</p>

<h2>③ %s [%d점]</h2>
<p class="small">깊이 2까지 방문 순서 (%d개) · <b>깊이 2까지 전개해도 목표는 나오지 않습니다</b> (최단 %d수).
목표를 찾을 때까지 방문하는 상태는 <b>%d개</b>입니다.</p>
<table><tr><th style="width:14mm">차례</th><th>상태</th><th style="width:16mm">깊이</th></tr>%s</table>
<p class="small">※ 방향(위·아래·왼·오른)으로 적은 답안도 인정합니다.</p>

<div class="pagebreak"></div>
<h2>④ %s [%d점]</h2>
<p class="small">초기 상태 %s — <b>h₁ = %d · h₂ = %d</b> · 실제 남은 비용 %d</p>
<table>
<tr><th style="width:20mm">한 번 옮기면</th><th>상태</th><th style="width:14mm">h₁</th>
<th style="width:14mm">h₂</th><th style="width:26mm">실제 남은 비용</th></tr>%s</table>
<p class="small"><b>골라야 할 것 — h₂.</b> 두 값 모두 실제 남은 비용을 넘지 않지만(허용 가능),
h₂ 가 언제나 h₁ 보다 크거나 같아 <b>목표에 더 가까운 추정</b>이고, 그래서 탐색량이 줄어듭니다.
실제로 이 문제에서 확장한 노드는 <b>h₁ 이면 %d개, h₂ 면 %d개</b>입니다.</p>
<div class="note"><b>3점 판별 질문</b> — ① 두 값을 모두 바르게 계산했는가
② <b>실제 비용을 넘지 않으면서 더 큰 값</b>이 탐색량을 줄인다는 근거를 적었는가. 둘 다 있어야 3점.</div>

<h2>⑤ %s [%d점] — 확장 %d개</h2>
<table><tr><th style="width:14mm">차례</th><th>테스트한 상태</th>
<th style="width:14mm">g</th><th style="width:14mm">h</th><th style="width:14mm">f</th></tr>%s</table>
<p class="small">최적 경로 — <b>%s</b> (%d수) · 확장 노드 수 <b>%d개</b>.
이 문제에서는 f 값이 처음부터 끝까지 <b>%d</b> 로 일정합니다. 헛걸음이 한 번도 없다는 뜻입니다.</p>

<h2>⑥ %s [%d점]</h2>
<p class="small">근거가 되는 수 — 너비 우선 <b>%d개</b> vs A*(h₂) <b>%d개</b></p>
%s

<h2>배점 합계</h2>
<table>
<tr><th>①</th><th>②</th><th>③</th><th>④</th><th>⑤</th><th>⑥</th><th>합계</th><th>기본점수</th></tr>
<tr>%s<td class="center"><b>%d</b></td><td class="center">%d</td></tr>
</table>
<p class="small">최저점의 합(1+1+1+1+1+2)이 기본점수 %d점과 같습니다. 장기 미인정 결석자는 %d점입니다.</p>
""" % (RULES, HEUR,
       RUBRIC[0][1], RUBRIC[0][2], len(F['nexts']), nexts,
       RUBRIC[1][1], RUBRIC[1][2], len(TREE), len(d1), row_of(d1), len(d2), row_of(d2), F['dup_spots'],
       RUBRIC[2][1], RUBRIC[2][2], len(BFS['depth2']), BFS['moves'], BFS['count'], bfs2,
       RUBRIC[3][1], RUBRIC[3][2], txt(START), F['h_start']['h1'], F['h_start']['h2'],
       F['h_start']['true'], hrows, F['astar_h1_count'], AST['count'],
       RUBRIC[4][1], RUBRIC[4][2], AST['count'], ast,
       ' → '.join(AST['solution']), AST['moves'], AST['count'], AST['expanded'][0]['f'],
       RUBRIC[5][1], RUBRIC[5][2], BFS['count'], AST['count'],
       rubric_table(),
       ''.join('<td class="center">%d</td>' % r[2] for r in RUBRIC), FULL, BASE,
       BASE, BASE_ABSENT)
    return page('교사용 정답지', body)


for name, html in (('assess1-guide', guide()), ('assess1-sheet', sheet()), ('assess1-key', key())):
    p = os.path.join(OUT, name + '.html')
    io.open(p, 'w', encoding='utf-8').write(html)
    print('->', p)
