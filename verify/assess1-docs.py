# -*- coding: utf-8 -*-
"""
verify/assess1-docs.py — 1차 수행평가 문서 세 종

  ① assess1-guide.html  학생 배부용 안내서 (채점 기준 포함)
  ② assess1-sheet.html  평가지
  ③ assess1-key.html    교사용 채점 기준 · 예시 답안

⚠ **평가요소·배점·수행 수준(채점 기준)·기본점수는 제가 정하지 않습니다.**
   「2026학년도 2학년 2학기 인공지능 기초 교수학습 및 평가 운영 계획 양식(최종본)신동고」
   6-가 의 것을 **글자 그대로** 옮겼습니다.
     논술 15점 = 문제 상황 탐색·구상 5 + 특성 적용 설명 5 + 도입 전후 비교·분석 5
     도식화 5점 = 인공지능 시스템의 구조로 표현하기
     기본점수 8점 (장기 미인정 결석자 7점) · 최저점의 합 2+2+2+2 = 8

⚠ 문항에 쓰는 용어는 verify/assess1-terms.py 로 **교과서 22~24쪽에 있는지 대조**했습니다.
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'tools', 'samples')
T = json.load(io.open(os.path.join(HERE, 'assess1-terms.json'), encoding='utf-8'))
assert not T['missing'], '교과서에 없는 말이 있습니다: %s' % T['missing']

AREA = '인공지능의 특성을 활용하여 문제 해결 방안 설계하기'
FULL, BASE, BASE_ABSENT = 20, 8, 7
WHEN = '9월 2주 ~ 3주'
STANDARD = ('[12인기01-01]', '인공지능의 지능적 판단에 대한 이해를 바탕으로 인공지능을 활용한 '
                             '실생활 및 다양한 학문 분야의 문제 해결 사례를 비교･분석한다.')
TASKS = ['문제 상황을 탐색하여 필요한 인공지능 구상하기',
         '인공지능의 특성을 적용하여 설명하기',
         '인공지능 도입 전후를 비교·분석하기',
         '인공지능 시스템의 구조로 표현하기']

# (갈래, 문항, 평가요소, 배점, [(점수, 수행 수준)…]) — 계획서 문구 그대로
RUBRIC = [
    ('논술 (15점)', '①', '문제 상황을 탐색하고 필요한 인공지능 구상하기', 5, [
        (5, '인공지능으로 해결할 수 있는 문제 상황을 구체적으로 탐색하고, 그 문제를 해결할 인공지능이 '
            '필요한 까닭을 문제의 특성과 연결지어 정확하게 서술함.'),
        (4, '인공지능으로 해결할 수 있는 문제 상황을 탐색하고, 인공지능이 필요한 까닭을 대략적으로 서술함.'),
        (3, '인공지능으로 해결할 수 있는 문제 상황을 탐색하고, 인공지능이 필요한 까닭을 다소 제한적으로 서술함.'),
        (2, '인공지능으로 해결할 수 있는 문제 상황을 탐색하지 못함.')]),
    ('', '②', '인공지능의 특성을 적용하여 설명하기', 5, [
        (5, '인공지능의 특성을 제시한 인공지능의 동작에 정확하게 대응시키고, 그렇게 볼 수 있는 까닭을 '
            '근거를 들어 설명함.'),
        (4, '인공지능의 특성을 제시한 인공지능의 동작에 대체로 정확하게 대응시켜 설명함.'),
        (3, '인공지능의 특성을 제시한 인공지능의 동작에 다소 제한적으로 대응시켜 설명함.'),
        (2, '인공지능의 특성을 제시한 인공지능의 동작과 연결하여 설명하지 못함.')]),
    ('', '③', '인공지능 도입 전후를 비교·분석하기', 5, [
        (5, '인공지능 도입 전후의 문제 해결 과정을 명확한 기준으로 비교하고, 기대되는 변화와 '
            '새로 발생할 수 있는 문제를 정확히 분석함.'),
        (4, '인공지능 도입 전후의 문제 해결 과정을 비교하고, 기대되는 변화와 새로 발생할 수 있는 문제를 '
            '대략적으로 분석함.'),
        (3, '인공지능 도입 전후의 문제 해결 과정을 비교하여 기대되는 변화를 다소 제한적으로 분석함.'),
        (2, '인공지능 도입 전후의 문제 해결 과정을 비교하지 못함.')]),
    ('도식화 (5점)', '④', '인공지능 시스템의 구조로 표현하기', 5, [
        (5, '제시한 인공지능이 환경과 주고받는 과정과 자율적으로 판단하는 부분이 모두 드러나도록 '
            '인공지능 시스템의 구조를 정확하게 표현함.'),
        (4, '제시한 인공지능이 환경과 주고받는 과정이 드러나도록 인공지능 시스템의 구조를 '
            '대체로 정확하게 표현함.'),
        (3, '제시한 인공지능이 환경과 주고받는 과정을 다소 제한적으로 표현함.'),
        (2, '인공지능 시스템의 구조를 제시한 인공지능의 내용으로 표현하지 못함.')]),
]
assert sum(r[3] for r in RUBRIC) == FULL
assert sum(r[4][-1][0] for r in RUBRIC) == BASE

TRAITS = T['traits']          # 교과서 23쪽 특성 세 가지
AGENT = T['agent']            # 교과서 22쪽 그림 Ⅰ-5 구조

CSS = """
@page { size: A4 portrait; margin: 12mm 14mm; }
html, body { background:#fff; color-scheme: light only; }
body { font-family:"맑은 고딕","Malgun Gothic",sans-serif; color:#111;
       font-size:10.5pt; line-height:1.55; margin:0; width:182mm; }
h1 { font-size:16pt; margin:0 0 2mm }
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
.q { margin:5mm 0 0; padding:2.5mm 3mm; border:1pt solid #222; background:#fafafa;
     font-weight:700; font-size:11pt; display:flex; justify-content:space-between }
.hint { font-size:9.3pt; color:#444; margin:1.5mm 0 }
.rule { border:1pt solid #222; padding:3mm; margin:3mm 0; background:#f7f7f7 }
.rule ol, .rule ul { margin:0; padding-left:5mm }
.rule li { margin:1mm 0; font-size:10pt }
.ans { border:0.8pt solid #888; min-height:18mm; margin:2mm 0; padding:2mm }
.lines div { border-bottom:0.6pt solid #999; height:7.4mm }
.note { font-size:9.2pt; color:#333; border-left:2.5pt solid #999; padding-left:2.5mm; margin:2mm 0 }
.pagebreak { page-break-before:always }
.small { font-size:9pt; color:#444 }
.draw { border:1pt solid #444; height:105mm; margin:2mm 0; position:relative }
.draw span { position:absolute; left:3mm; top:2mm; font-size:9pt; color:#777 }
"""


def page(title, body):
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
            '<title>%s</title><style>%s</style></head><body>%s</body></html>'
            % (title, CSS, body))


HEAD = ('<div class="top"><div><h1>%s</h1>'
        '<div class="sub">인공지능 기초 · 1차 수행평가 · ' + AREA + '</div></div>'
        '<div class="name">%s</div></div>')


def rubric_table():
    rows = ''
    for group, no, name, pt, levels in RUBRIC:
        n = len(levels)
        for i, (sc, desc) in enumerate(levels):
            first = ''
            if i == 0:
                g = '<td class="center" rowspan="%d">%s</td>' % (n * 3, group) if group == '논술 (15점)' \
                    else ('<td class="center" rowspan="%d">%s</td>' % (n, group) if group else '')
                first = g + ('<td class="center" rowspan="%d">%s<br>%s<br>(%d점)</td>'
                             % (n, no, name, pt))
            rows += '<tr>%s<td>%s</td><td class="center">%d점</td></tr>' % (first, desc, sc)
    return ('<table><tr><th style="width:20mm">갈래</th><th style="width:34mm">평가요소</th>'
            '<th>수행 수준 (채점 기준)</th><th style="width:13mm">배점</th></tr>%s</table>' % rows)


TRAIT_ROWS = ''.join('<tr><td class="center">%s</td><td>%s</td></tr>' % (n, d) for n, d in TRAITS)


# ══════════════════════════════════════════════
def guide():
    body = HEAD % ('수행평가 안내서', '2학년 &nbsp; 반 &nbsp; 번 &nbsp; 이름') + """
<div class="note">평가요소·배점·채점 기준·기본점수는
「2026학년도 2학년 2학기 인공지능 기초 교수‧학습 및 평가 운영 계획」에 실린 것을 그대로 옮긴 것입니다.</div>

<h2>1. 무엇을 평가하는가</h2>
<table>
<tr><th style="width:26mm">평가 영역명</th><td>%s</td></tr>
<tr><th>영역 만점</th><td><b>%d점</b> · 기본점수 <b>%d점</b> (장기 미인정 결석자 %d점)</td></tr>
<tr><th>평가 시기</th><td>%s</td></tr>
<tr><th>평가 방법</th><td>■ 논술 &nbsp; ■ 기타 &nbsp; ■ 교사 관찰 및 기록</td></tr>
<tr><th>성취기준</th><td>%s %s</td></tr>
<tr><th>수행 과제</th><td><ul style="margin:0;padding-left:5mm">%s</ul></td></tr>
</table>

<h2>2. 무엇을 준비해야 하는가</h2>
<p class="hint">교과서 <b>22~24쪽</b>에서 배운 것을 그대로 씁니다. 아래 두 가지는 반드시 챙기세요.</p>

<h3>인공지능 시스템의 특성 (교과서 23쪽)</h3>
<table><tr><th style="width:60mm">특성</th><th>뜻</th></tr>%s</table>

<h3>지능 에이전트의 기본 구조 (교과서 22쪽 그림 Ⅰ-5)</h3>
<div class="rule"><b>%s</b>
<p class="small" style="margin:2mm 0 0">환경·인간에게서 <b>인식</b>해 들여오고, <b>상황을 판단</b>하고
<b>행동을 결정</b>해 <b>행동</b>으로 내보내며, 이 과정을 <b>반복</b>합니다.
지능적 판단에는 문제 해결·추론·학습이 들어갑니다.</p></div>

<h2>3. 어떤 문제 상황을 골라도 되는가</h2>
<p class="hint"><b>내 주변에서 직접 고릅니다.</b> 학교·집·동네에서 겪는 불편, 또는 <b>내 진로 분야</b>에서
사람이 하기 번거롭거나 놓치기 쉬운 일이면 좋습니다.
교과서에 나온 것(챗봇, 맞춤형 도서 추천, 로봇 청소기, 공항 안내 로봇)을 <b>그대로 쓰지는 마세요</b> —
그것을 참고해 <b>내 문제 상황</b>을 찾는 것이 이 평가입니다.</p>

<div class="pagebreak"></div>
<h2>4. 채점 기준</h2>
%s
<p class="small">최저점을 모두 받으면 %d점이 되며, 이것이 기본점수입니다.</p>

<h2>5. 인공지능 활용에 대하여</h2>
<p class="hint">이 과목의 논술형 평가는 <b>컴퓨터 및 전자기기를 사용하지 않고 수업 중에 작성</b>합니다.
평가를 준비하며 인공지능을 활용했다면 <b>사용한 인공지능 종류·질문 내용·출처</b>를 평가지 마지막 칸에
적어 주세요. 적었다고 감점하지 않습니다.
인공지능으로 타인의 결과물을 모방하거나 공정한 평가를 방해하는 행위는 <b>부정행위로 간주</b>합니다.</p>
""" % (AREA, FULL, BASE, BASE_ABSENT, WHEN, STANDARD[0], STANDARD[1],
       ''.join('<li>%s</li>' % t for t in TASKS), TRAIT_ROWS,
       ' → '.join(AGENT), rubric_table(), BASE)
    return page('수행평가 안내서', body)


# ══════════════════════════════════════════════
def qhead(no, name, pt):
    return '<div class="q"><span>%s %s</span><span>[%d점]</span></div>' % (no, name, pt)


def lines(n):
    return '<div class="ans lines">%s</div>' % ('<div></div>' * n)


def sheet():
    trait_rows = ''.join(
        '<tr><td class="center" style="width:44mm">%s</td>'
        '<td style="height:20mm"></td><td style="height:20mm"></td></tr>' % n
        for n, _ in TRAITS)
    body = HEAD % ('수행평가 평가지', '2학년 &nbsp; 반 &nbsp; 번 &nbsp; 이름') + """
<p class="hint">내 주변이나 내 진로 분야에서 <b>인공지능으로 해결할 수 있는 문제 상황</b>을 하나 골라
아래 물음에 답하시오. 교과서 22~24쪽에서 배운 말을 쓰시오.</p>

%s
<p class="hint">(1) 고른 문제 상황과, 그 문제를 해결할 인공지능이 하는 일을 쓰시오.</p>
<table>
<tr><th style="width:42mm">문제 상황</th><td style="height:16mm"></td></tr>
<tr><th>지금은 어떻게 해결하고 있는가</th><td style="height:16mm"></td></tr>
<tr><th>내가 구상한 인공지능이 하는 일</th><td style="height:22mm"></td></tr>
</table>
<p class="hint">(2) 이 문제를 <b>왜 인공지능으로</b> 해결해야 하는지, <b>문제의 특성과 연결지어</b> 쓰시오.</p>
%s

%s
<p class="hint">교과서 23쪽의 <b>인공지능 시스템의 특성</b> 세 가지가 내가 구상한 인공지능의
<b>어떤 동작</b>에 해당하는지 쓰고, <b>그렇게 볼 수 있는 까닭</b>을 함께 쓰시오.</p>
<table>
<tr><th>인공지능 시스템의 특성</th><th style="width:52mm">내 인공지능의 어떤 동작인가</th>
<th>그렇게 볼 수 있는 까닭</th></tr>
%s
</table>

%s
<p class="hint">인공지능을 <b>도입하기 전과 후</b>의 문제 해결 과정을 <b>기준을 정해</b> 비교하시오.
(기준의 예 — 걸리는 시간, 사람이 하는 일, 정확도, 비용)</p>
<table>
<tr><th style="width:32mm">비교 기준</th><th>도입 전</th><th>도입 후</th></tr>
<tr><td style="height:16mm"></td><td></td><td></td></tr>
<tr><td style="height:16mm"></td><td></td><td></td></tr>
<tr><td style="height:16mm"></td><td></td><td></td></tr>
</table>
<p class="hint">기대되는 변화와, <b>새로 발생할 수 있는 문제</b>를 각각 쓰시오.</p>
%s

<div class="pagebreak"></div>
%s
<p class="hint">내가 구상한 인공지능을 <b>인공지능 시스템의 구조</b>로 그리시오.
교과서 22쪽 그림 Ⅰ-5 처럼, <b>환경·인간과 주고받는 과정</b>과 <b>자율적으로 판단하는 부분</b>이
모두 드러나야 합니다. 화살표 옆에 무엇이 오가는지 적으시오.</p>
<div class="draw"><span>이 칸 안에 그리시오</span></div>
<p class="hint">그림에서 <b>자율적으로 판단하는 부분</b>이 어디인지, 그곳에서 무엇을 판단하는지 쓰시오.</p>
%s

<h3>인공지능 활용 기록란</h3>
<p class="small">평가를 준비하며 인공지능을 활용했다면 사용한 인공지능 종류·질문 내용·출처를 적어 주세요. 감점하지 않습니다.</p>
%s
""" % (qhead('①', RUBRIC[0][2], RUBRIC[0][3]), lines(5),
       qhead('②', RUBRIC[1][2], RUBRIC[1][3]), trait_rows,
       qhead('③', RUBRIC[2][2], RUBRIC[2][3]), lines(5),
       qhead('④', RUBRIC[3][2], RUBRIC[3][3]), lines(3), lines(2))
    return page('수행평가 평가지', body)


# ══════════════════════════════════════════════
def key():
    body = HEAD % ('교사용 채점 기준 · 예시 답안', '교사용') + """
<div class="note"><b>배점과 수행 수준은 평가 운영 계획 6-가 의 것을 그대로 옮겼습니다.</b>
문항에 쓴 용어는 <b>verify/assess1-terms.py</b> 로 교과서 22~24쪽에 실제로 있는지 대조했습니다.
논술이라 정답은 없습니다 — 아래 예시는 <b>채점 눈금을 맞추기 위한 것</b>입니다.</div>

<h2>채점 기준 (계획서 그대로)</h2>
%s
<p class="small">최저점의 합 2+2+2+2 = 기본점수 <b>%d점</b> · 장기 미인정 결석자 %d점</p>

<div class="pagebreak"></div>
<h2>예시 답안 — 「급식실 대기 줄 안내」로 답한 경우</h2>

<h3>① 문제 상황을 탐색하고 필요한 인공지능 구상하기</h3>
<table>
<tr><th style="width:36mm">문제 상황</th><td>점심시간에 급식실 줄이 얼마나 긴지 몰라 교실에서 나갔다가
오래 서 있게 된다.</td></tr>
<tr><th>지금은</th><td>먼저 간 친구에게 물어보거나, 직접 가 보고 판단한다.</td></tr>
<tr><th>구상한 인공지능</th><td>급식실 입구 카메라로 줄 길이를 인식해 지금 가면 몇 분 기다릴지
예상해 알려 주고, 학년별로 언제 가면 좋을지 추천한다.</td></tr>
</table>
<p class="small"><b>5점 판별</b> — 「왜 인공지능이어야 하는가」가 <b>문제의 특성</b>과 이어져야 합니다.
예 — 줄 길이는 <b>시시각각 달라지고</b> 규칙이 고정돼 있지 않아, 정해진 계산식이 아니라
<b>상황을 보고 판단</b>해야 하므로 인공지능이 필요하다. 이 연결이 없으면 4점입니다.</p>

<h3>② 인공지능의 특성을 적용하여 설명하기</h3>
<table>
<tr><th style="width:44mm">특성</th><th style="width:52mm">어떤 동작인가</th><th>까닭</th></tr>
<tr><td class="center">%s</td><td>급식 안내 앱 안에서 대기 시간을 예상하는 기능만 인공지능이 맡는다</td>
<td>앱의 나머지 기능(식단표 보기)은 정해진 자료를 보여 줄 뿐이다</td></tr>
<tr><td class="center">%s</td><td>카메라로 줄을 인식해 스스로 판단하고 추천을 내보낸다</td>
<td>사람이 매번 세어 입력하지 않아도 판단과 행동을 자율적으로 한다</td></tr>
<tr><td class="center">%s</td><td>줄이 겹쳐 보이면 인원을 잘못 셀 수 있다</td>
<td>데이터에 맞춰 만든 모델이라 오류를 예상해야 한다</td></tr>
</table>
<p class="small"><b>5점 판별</b> — 세 특성을 <b>자기 인공지능의 동작</b>에 대응시키고 <b>까닭</b>까지 적었는가.
특성 이름만 옮겨 적고 동작이 없으면 3점입니다.</p>

<h3>③ 인공지능 도입 전후를 비교·분석하기</h3>
<table>
<tr><th style="width:32mm">비교 기준</th><th>도입 전</th><th>도입 후</th></tr>
<tr><td class="center">기다리는 시간</td><td>가 봐야 알 수 있어 평균 10분 이상 서 있는다</td>
<td>붐비지 않는 때를 골라 가서 줄이 짧다</td></tr>
<tr><td class="center">사람이 하는 일</td><td>직접 확인하거나 친구에게 묻는다</td>
<td>알림을 확인하기만 한다</td></tr>
</table>
<p class="small">기대되는 변화 — 점심시간을 더 쓸 수 있다.
<b>새로 생길 수 있는 문제</b> — 모두가 같은 시각을 추천받아 <b>그때 오히려 몰릴 수 있다</b> ·
카메라가 얼굴을 찍어 사생활 문제가 생길 수 있다.</p>
<p class="small"><b>5점 판별</b> — <b>비교 기준이 명시</b>되어 있고, <b>새로 발생할 수 있는 문제</b>까지
분석했는가. 기대되는 변화만 있으면 3점입니다.</p>

<h3>④ 인공지능 시스템의 구조로 표현하기 (도식화)</h3>
<p class="small">교과서 22쪽 그림 Ⅰ-5 의 뼈대 — <b>%s</b> — 가 자기 인공지능의 내용으로 채워져야 합니다.</p>
<table>
<tr><th style="width:30mm">환경·인간</th><td>급식실 줄, 학생</td></tr>
<tr><th>인식 (입력)</th><td>입구 카메라 영상 · 현재 시각</td></tr>
<tr><th>상황 판단</th><td>줄 인원을 세어 대기 시간을 예상</td></tr>
<tr><th>행동 결정</th><td>지금 갈지, 몇 분 뒤에 갈지 정함</td></tr>
<tr><th>행동 (출력)</th><td>교실 화면·앱으로 안내</td></tr>
<tr><th>반복</th><td>학생이 이동하면 줄이 바뀌므로 다시 인식한다</td></tr>
</table>
<p class="small"><b>5점 판별</b> — ① <b>환경과 주고받는 과정</b>(입력과 출력 화살표가 환경에 닿는가)과
② <b>자율적으로 판단하는 부분</b>(판단·결정 자리가 표시되고 무엇을 판단하는지 적혀 있는가)이
<b>둘 다</b> 있어야 5점. 화살표만 있고 판단 내용이 없으면 4점입니다.</p>

<h2>세특 기록용 표시</h2>
<p class="small">명렬표 비고란에 두 코드만 적습니다 —
<b>㉮</b> ①에서 문제의 특성과 인공지능의 필요를 연결함 ·
<b>㉯</b> ③에서 새로 발생할 수 있는 문제까지 분석함.</p>
""" % (rubric_table(), BASE, BASE_ABSENT,
       TRAITS[0][0], TRAITS[1][0], TRAITS[2][0], ' → '.join(AGENT))
    return page('교사용 채점 기준', body)


for name, html in (('assess1-guide', guide()), ('assess1-sheet', sheet()), ('assess1-key', key())):
    p = os.path.join(OUT, name + '.html')
    io.open(p, 'w', encoding='utf-8').write(html)
    print('->', p)
