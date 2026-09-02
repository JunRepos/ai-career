# -*- coding: utf-8 -*-
"""
verify/lesson6-deck.py — 6차시(지능적 탐색) 덱 JSON 만들기

흐름 — **균일 비용 되짚기 → 맹목적 탐색의 한계 → 휴리스틱값 → A\\* → 8퍼즐 활동**

⚠ 숫자와 순서는 손으로 적지 않습니다. verify/lesson6.py 가 실제로 돌려 내놓은
   verify/lesson6-facts.json 을 읽어 씁니다. (CLAUDE.md 14·15)

교과서 근거
  32쪽  균일 비용 탐색 정의 · 누적 비용 · 오픈/닫힌 리스트 · 알고리즘 안내 ①~④ · 도시 지도(그림 Ⅰ-10)
  33쪽  균일 비용 진행
  34쪽  맹목적 탐색의 장단점(표 Ⅰ-1) · 상태 공간의 크기 · 탐색 방법의 평가 기준 ·
        순회 외판원 문제(AI 이야기) · 지능적 탐색 정의
  35쪽  휴리스틱·휴리스틱값 정의 · 직선거리 휴리스틱(그림 Ⅰ-11) · 틱택토 휴리스틱 함수(그림 Ⅰ-12)
  36쪽  A* 정의 · f(n)=g(n)+h(n)(그림 Ⅰ-13) · 도시 A* 진행(그림 Ⅰ-14)
  37쪽  활동3 — 8퍼즐을 A* 로 탐색

⚠ **최상 우선 탐색·언덕 오르기는 다루지 않습니다** (2026-08-28 결정, docs/course-map.md 4절).

2026-09-02 — 「설명이 빈약하다」는 지적을 받아 다시 썼습니다.
  · A* 진행을 교과서처럼 **한 단계씩** 나누고, 그때의 **오픈 리스트**를 함께 보여 줍니다
  · 틱택토는 **이길 수 있는 선을 판 위에 실제로 그립니다** (대각선이 보이게)
  · 8퍼즐 활동은 규칙 · h 세는 법 · f 계산을 **하나씩** 짚습니다
  · 처음 배우는 학생 기준으로, 정의 뒤에는 **값으로 확인하는 장**을 붙였습니다
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
F = json.load(io.open(os.path.join(HERE, 'lesson6-facts.json'), encoding='utf-8'))

CITY, PUZ, TTT = F['city'], F['puzzle'], F['ttt']
UNI, TSP, SPACE = CITY['uniform'], F['tsp'], F['space']
H = CITY['h']
STEPS = CITY['steps']


def board(state):
    return ['' if v == 0 else str(v) for v in state]


def comma(n):
    return format(n, ',')


# ── 도시 지도 (교과서 그림 Ⅰ-10) ────────────────
CITY_POS = {'a': (8, 52), 'b': (36, 10), 'c': (30, 92), 'd': (74, 76), 'e': (92, 40)}
CITY_EDGES = [('a', 'b', 5), ('a', 'c', 4), ('b', 'c', 5),
              ('b', 'd', 8), ('b', 'e', 9), ('c', 'd', 3), ('d', 'e', 5)]
START_GOAL = {'a': 'blue', 'e': 'red'}


def city_nodes(show_h=False, color=None):
    out = []
    for k, (x, y) in CITY_POS.items():
        n = {'id': k, 'label': ('%s\nh=%d' % (k, H[k])) if show_h else k, 'x': x, 'y': y}
        if color and k in color:
            n['color'] = color[k]
        out.append(n)
    return out


def city_edges():
    return [{'from': u, 'to': v, 'label': str(w)} for u, v, w in CITY_EDGES]


# ── 틱택토 — 이길 수 있는 선 여덟 줄 ─────────────
TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]


def ttt_board(pos):
    b = [''] * 9
    b[pos] = '○'
    return b


def ttt_lines(pos):
    return [ln for ln in TTT_LINES if pos in ln]


# ── 노드 40개짜리 큰 트리 ───────────────────────
def big_tree():
    nodes, edges, levels, nid = [], [], [[0]], 1
    for _ in range(3):
        cur = []
        for p in levels[-1]:
            for _ in range(3):
                cur.append(nid)
                edges.append({'from': 'n%d' % p, 'to': 'n%d' % nid})
                nid += 1
        levels.append(cur)
    ys = [6, 33, 62, 92]
    for d, lv in enumerate(levels):
        for i, k in enumerate(lv):
            n = {'id': 'n%d' % k, 'label': '',
                 'x': round(3 + 94.0 * (i + 0.5) / len(lv), 2), 'y': ys[d]}
            if k == 0:
                n['color'] = 'blue'
            if k == levels[-1][-5]:
                n['color'] = 'red'
            nodes.append(n)
    return nodes, edges


BT_NODES, BT_EDGES = big_tree()

S = []
add = S.append

# ══════════ 표지 · 되짚기 ══════════════════════
add({'type': 'title', 'title': '6. 지능적 탐색',
     'notes': '교과서 32~37쪽. 앞의 여덟 장은 지난 시간 균일 비용 탐색을 되짚는 것이고, '
              '오늘의 새 내용은 휴리스틱값과 A* 입니다.'})

add({'type': 'quiz', 'title': '지난 시간 확인',
     'items': [
         {'text': '누적 비용이란 무엇인가요?'},
         {'text': '오픈 리스트에서 어떤 상태를 먼저 골랐나요?'},
         {'text': 'a 에서 e 까지 찾은 경로와 비용은?'},
     ],
     'notes': '답 — 초기 상태에서 그 상태까지 오는 경로의 비용 합 / 누적 비용이 가장 작은 상태 / '
              '%s · %d' % (' → '.join(CITY['path']), CITY['cost'])})

add({'type': 'diagram', 'title': '도시 방문 경로 찾기',
     'nodes': city_nodes(color=START_GOAL), 'edges': city_edges(),
     'foot': '간선의 숫자는 그 길을 지나는 데 **걸리는 시간**',
     'notes': '교과서 32쪽 그림 Ⅰ-10. 지난 시간에 쓴 지도 그대로입니다. '
              'a 에서 출발해 e 로 가는데 길마다 걸리는 시간이 다릅니다.'})

add({'type': 'bullets', 'title': '누적 비용',
     'lead': '초기 상태에서 현재 상태까지 오는 경로의 **비용을 모두 더한 값**입니다.',
     'bullets': [
         'a → c 로 가면 — 누적 비용 **4**',
         'a → c → d 로 가면 — 4 + 3 = 누적 비용 **7**',
         'a → c → d → e 로 가면 — 4 + 3 + 5 = 누적 비용 **12**',
     ],
     'note': {'label': '주의', 'text': '방금 지나온 길 하나의 값이 아니라, 출발점부터 **여기까지 더한 값**입니다.'},
     'notes': '교과서 32쪽 여백. 학생들이 가장 자주 틀리는 곳입니다 — 마지막 간선 값만 보는 실수.'})

add({'type': 'cards', 'title': '오픈 리스트와 닫힌 리스트',
     'cards': [
         {'def': True, 'wide': True, 'label': '오픈 리스트',
          'text': '목표 상태인지 **테스트할 후보 상태**를 담아 두는 곳'},
         {'def': True, 'wide': True, 'label': '닫힌 리스트',
          'text': '테스트가 **끝난 상태**를 옮겨 두는 곳'},
     ],
     'notes': '교과서 32쪽 여백. 오픈 리스트는 대기실입니다. '
              '테스트가 끝나면 닫힌 리스트로 옮기고 다시는 열어 보지 않습니다.'})

add({'type': 'steps', 'title': '균일 비용 탐색 알고리즘',
     'steps': [
         {'n': '①', 'label': '초기 상태가 목표 상태이면', 'desc': '거기서 마친다'},
         {'n': '②', 'label': '자식 상태를 만든다', 'desc': '갈 수 있는 간선을 따라 만들어 오픈 리스트에 넣는다'},
         {'n': '③', 'label': '가장 싼 것을 고른다', 'desc': '오픈 리스트에서 누적 비용이 가장 작은 상태를 고른다'},
         {'n': '④', 'label': '목표인지 테스트한다', 'desc': '맞으면 끝. 아니면 자식을 만들어 넣고 ③으로 돌아간다'},
     ],
     'foot': '같은 상태가 두 번 들어오면 **비용이 작은 쪽만** 남긴다',
     'notes': '교과서 32쪽 안내. 오늘 배울 A* 는 ③ 만 바뀝니다 — 그 자리를 눈여겨보게 하세요.'})

add({'type': 'cards', 'title': '지난 시간 결과',
     'ask': '균일 비용 탐색은 **어떤 순서로** 테스트했나요?',
     'cards': [
         {'label': '테스트한 순서', 'text': ' – '.join(UNI['order']),
          'desc': '테스트한 상태 %d개' % UNI['tested']},
         {'label': '찾은 경로', 'text': ' → '.join(UNI['path']), 'desc': '비용 %d' % UNI['cost']},
     ],
     'notes': '검산값입니다. 이 두 숫자(%d개 · %d)를 기억하게 하세요 — '
              '오늘 A* 로 하면 몇 개가 되는지 견줍니다.' % (UNI['tested'], UNI['cost'])})

add({'type': 'bullets', 'title': '균일 비용 탐색이 본 것',
     'lead': '균일 비용 탐색은 **지금까지 든 비용만** 보고 다음에 열어 볼 곳을 정했습니다.',
     'bullets': [
         '지나온 길의 값은 **정확히** 알고 있다',
         '앞으로 얼마나 더 가야 하는지는 **전혀 모른다**',
         '그래서 목적지에서 멀어지는 쪽도 값이 싸면 먼저 열어 본다',
     ],
     'note': {'label': '모든 비용이 같다면', 'text': '균일 비용 탐색은 **너비 우선 탐색과 똑같이** 진행됩니다.'},
     'notes': '교과서 32쪽 본문. 오늘은 여기에 "앞으로 얼마나 남았는지"를 더합니다.'})

# ══════════ 맹목적 탐색의 한계 (34쪽) ══════════
add({'type': 'diagram', 'title': '맹목적 탐색의 장단점',
     'nodes': BT_NODES, 'edges': BT_EDGES,
     'nodeH': 0.42, 'nodeW': 0.34, 'nodeMinW': 0.28,
     'foot': '파란 노드가 **시작** · 빨간 노드가 **목표**',
     'side': [
         {'label': '좋은 점', 'text': '목표 상태를 언젠가 찾는다는 것이 보장된다', 'accent': True},
         {'label': '좋은 점', 'text': '목표가 여러 개일 때 너비 우선 탐색은 경로가 가장 짧은 목표를 찾아 준다'},
         {'label': '나쁜 점', 'text': '상태 수가 많을수록 탐색 시간이 늘어난다'},
     ],
     'notes': '교과서 34쪽 표 Ⅰ-1. 왼쪽 트리는 노드가 40개입니다. '
              '맹목적 탐색은 빨간 목표를 만날 때까지 앞에서부터 하나씩 다 테스트합니다.'})

add({'type': 'cards', 'title': '상태 공간의 크기',
     'cards': [
         {'label': '8퍼즐', 'text': '9! = %s' % comma(SPACE['p8']), 'desc': '3×3 판에 타일 8개와 빈칸'},
         {'label': '15퍼즐', 'text': '15! = %s' % comma(SPACE['p15']), 'small': True,
          'desc': '4×4 판으로 한 줄 늘렸을 뿐'},
         {'label': '24퍼즐', 'text': '6.2 × 10²³'},
         {'label': '바둑', 'text': '3³⁶¹ ≈ 10³⁶⁰', 'desc': '우주에 있는 분자의 개수는 10⁸⁰'},
     ],
     'notes': '교과서 34쪽 여백. 판이 한 줄 늘 때마다 상태 수가 폭발합니다. '
              '8퍼즐 36만 개는 컴퓨터가 다 볼 수 있지만 15퍼즐 1조 개부터는 어렵습니다.'})

add({'type': 'bars', 'title': '순회 외판원 문제',
     'items': [{'label': '도시 4곳', 'value': 24, 'show': '%s가지' % comma(TSP['4'])},
               {'label': '도시 5곳', 'value': 120, 'show': '%s가지' % comma(TSP['5'])},
               {'label': '도시 10곳', 'value': 3628800, 'show': '%s가지' % comma(TSP['10']),
                'accent': True}],
     'notes': '교과서 34쪽 AI 이야기. 모든 도시를 한 번씩 방문하고 출발 도시로 돌아오는 '
              '가장 짧은 경로를 찾는 문제입니다. 4곳이면 4!=24가지, 10곳이면 362만 가지입니다.'})

add({'type': 'bullets', 'title': '가능하지만 실제로는 불가능한 문제',
     'lead': '모든 경로를 하나씩 다 따져 보면 **답은 반드시 나옵니다.** 문제는 시간입니다.',
     'bullets': [
         '도시가 하나 늘 때마다 경로의 수가 **몇 배로** 늘어난다',
         '도시가 20곳이면 경로는 2,432,902,008,176,640,000가지',
         '방법이 있어도 **살아 있는 동안 끝나지 않으면** 쓸 수 없다',
     ],
     'notes': '교과서 34쪽. 20! 은 약 243경입니다. 1초에 1억 개씩 세어도 770년이 걸립니다.'})

add({'type': 'cards', 'title': '탐색 방법의 평가 기준',
     'cards': [
         {'label': '완전성', 'text': '목표가 있다면 **언젠가는 찾는다**'},
         {'label': '최적성', 'text': '목표가 여러 개면 **가장 좋은 것**을 찾는다'},
         {'label': '시간 복잡도', 'text': '**현실적인 시간** 안에 찾아야 한다'},
     ],
     'foot': '맹목적 탐색은 앞의 둘은 갖췄지만 **세 번째에서 막힌다**',
     'notes': '교과서 34쪽 여백. 그래서 다음 이야기가 지능적 탐색입니다.'})

# ══════════ 지능적 탐색 · 휴리스틱 (34~35쪽) ═══
add({'type': 'cards', 'title': '지능적 탐색',
     'cards': [
         {'def': True, 'wide': True, 'label': '지능적 탐색',
          'text': '주어진 비용 정보 이외에 **추정된 정보**를 함께 사용하는 탐색'},
     ],
     'foot': '탐색 시간을 줄이려고 **알고 있는 경험적 지식**을 끌어온다',
     'notes': '교과서 34쪽 본문. 여기서 "추정"이 핵심입니다 — 정확한 값이 아니라 어림값입니다.'})

add({'type': 'cards', 'title': '휴리스틱',
     'cards': [
         {'def': True, 'wide': True, 'label': '휴리스틱',
          'text': '어떤 문제 해결을 위해 알고 있는 **경험적 지식**'},
         {'def': True, 'wide': True, 'label': '휴리스틱값',
          'text': '그 상태에서 **목표 상태까지의 예상 비용**을 추정한 값'},
     ],
     'notes': '교과서 35쪽. 경험적 지식이라 사람마다 다르게 정할 수 있습니다. '
              '문제마다 무엇을 휴리스틱값으로 쓸지 정하는 것이 오늘의 두 번째 과제입니다.'})

add({'type': 'diagram', 'title': '직선거리를 휴리스틱값으로',
     'nodes': city_nodes(show_h=True, color=START_GOAL),
     'edges': [{'from': k, 'to': 'e', 'label': str(H[k]), 'dim': True} for k in ('a', 'b', 'c', 'd')],
     'side': [
         {'label': '휴리스틱값 h(n)', 'text': '각 도시에서 목표 도시 e 까지의 **직선거리**', 'accent': True},
         {'label': '값', 'big': True,
          'text': 'h(a)=%d · h(b)=%d\nh(c)=%d · h(d)=%d · h(e)=%d'
                  % (H['a'], H['b'], H['c'], H['d'], H['e'])},
     ],
     'notes': '교과서 35쪽 그림 Ⅰ-11. 점선은 도로가 아니라 지도 위에서 곧게 잰 거리입니다.'})

add({'type': 'bullets', 'title': '직선거리를 쓰는 까닭',
     'lead': '직선거리는 **실제로 가야 하는 거리보다 짧거나 같습니다.**',
     'bullets': [
         '도로는 굽어 있으므로 곧게 잰 거리보다 **길 수밖에** 없다',
         '지도만 있으면 **바로 잴 수 있다** — 길을 따라 가 보지 않아도 된다',
         '목표 도시 자신의 휴리스틱값은 **0** 이다 — 더 갈 곳이 없으므로',
     ],
     'note': {'label': '확인', 'text': 'h(c)=7 인데 c 에서 e 까지 실제로 가면 3 + 5 = **8** 입니다.'},
     'notes': '추정값이 실제보다 크면 좋은 길을 놓칠 수 있습니다. '
              '직선거리는 실제보다 클 수 없어서 안심하고 쓸 수 있습니다.'})

add({'type': 'boards', 'title': '틱택토에서 이길 수 있는 선', 'arrow': False,
     'items': [{'label': '가로 3줄 · 세로 3줄 · 대각선 2줄 = 모두 8줄',
                'board': [''] * 9, 'grid': True, 'lines': TTT_LINES}],
     'foot': '이 여덟 줄 가운데 **내 돌이 들어간 줄**을 셉니다',
     'notes': '교과서 35쪽 그림 Ⅰ-12. 먼저 판 전체에 몇 줄이 있는지부터 세어 보게 합니다.'})

add({'type': 'boards', 'title': '돌을 놓은 자리에 따라 달라진다', 'arrow': False,
     'items': [
         {'label': '모서리 — h = %d' % TTT['corner'], 'board': ttt_board(0),
          'grid': True, 'lines': ttt_lines(0)},
         {'label': '가운데 — h = %d' % TTT['center'], 'board': ttt_board(4),
          'grid': True, 'lines': ttt_lines(4), 'accent': True},
         {'label': '변 — h = %d' % TTT['edge'], 'board': ttt_board(1),
          'grid': True, 'lines': ttt_lines(1)},
     ],
     'foot': 'h(n) = 그 돌을 포함해 **이길 수 있는 선의 개수**',
     'notes': '가운데만 대각선 두 줄을 모두 지납니다 — 가로1+세로1+대각선2 = 4. '
              '모서리는 가로1+세로1+대각선1 = 3, 변은 가로1+세로1 = 2 입니다. '
              '가장 큰 값을 가진 가운데를 먼저 고르게 됩니다.'})

add({'type': 'bullets', 'title': '휴리스틱값을 어떻게 정하는가',
     'lead': '문제마다 **무엇을 추정값으로 쓸지** 사람이 정합니다.',
     'bullets': [
         '도시 방문 — 목표 도시까지의 **직선거리**',
         '틱택토 — 그 돌을 포함해 **이길 수 있는 선의 개수**',
         '8퍼즐 — 목표와 **다른 자리에 있는 타일의 수**',
     ],
     'note': {'label': '고르는 기준', 'text': '**빨리 계산할 수 있고**, 실제 비용을 **넘지 않는** 값이어야 합니다.'},
     'notes': '휴리스틱값을 잘 정할수록 탐색이 빨라집니다. 8퍼즐 것은 곧 활동에서 씁니다.'})

# ══════════ A* (36쪽) ══════════════════════════
add({'type': 'cards', 'title': 'A* 탐색',
     'cards': [
         {'def': True, 'wide': True, 'label': 'f(n) = g(n) + h(n)',
          'text': 'f 값이 **가장 작은 상태**를 먼저 테스트하는 탐색'},
     ],
     'notes': '교과서 36쪽. 균일 비용 탐색 알고리즘의 ③ 만 바뀝니다 — '
              '누적 비용 대신 f 값이 가장 작은 것을 고릅니다.'})

add({'type': 'vflow', 'title': 'f(n) 은 무엇을 더한 값인가',
     'items': [
         {'label': 'g(n)', 'text': '초기 상태에서 현재 상태까지의 비용 — 이미 쓴 값, 정확히 안다'},
         {'label': 'h(n)', 'text': '현재 상태에서 목표 상태까지 추정한 비용 — 앞으로 쓸 값, 어림한다'},
         {'label': 'f(n)', 'text': '둘을 더한 최종 비용 추정치 — 이 길로 끝까지 가면 얼마쯤 들까'},
     ],
     'notes': '교과서 36쪽 그림 Ⅰ-13. g 는 뒤를 보고 h 는 앞을 봅니다.'})

add({'type': 'table', 'title': '지난 시간과 무엇이 달라졌나',
     'head': ['보는 값', '탐색 이름', '고르는 방법'],
     'rows': [['g(n) — 지금까지 든 비용', '균일 비용 탐색', 'g 가 가장 작은 것'],
              ['f(n) = g(n) + h(n)', 'A* 탐색', 'f 가 가장 작은 것']],
     'firstCol': 6.0,
     'foot': '지도는 그대로, **고르는 기준만** 바뀝니다',
     'notes': '두 방법의 차이는 딱 한 줄입니다. 지도도 같고 알고리즘 흐름도 같습니다.'})

# ── A* 를 한 단계씩 ──
for i, st in enumerate(STEPS):
    nodes = []
    for k, (x, y) in CITY_POS.items():
        n = {'id': k, 'label': k, 'x': x, 'y': y}
        if k == st['test']:
            n['accent'] = True
        elif k in START_GOAL:
            n['color'] = START_GOAL[k]
        elif not any(o['node'] == k for o in st['open']):
            n['dim'] = True
        nodes.append(n)
    open_txt = '\n'.join('%s : %d + %d = %d' % (o['node'], o['g'], o['h'], o['f'])
                         for o in st['open']) or '비어 있음'
    last = (i == len(STEPS) - 1)
    if last:
        foot = '목적지다 → **종료** · 찾은 경로 **%s** · 비용 **%d**' % (' → '.join(CITY['path']), CITY['cost'])
        note = '목적지이므로 여기서 끝납니다. b 는 끝내 한 번도 열리지 않았습니다.'
    elif i == 0:
        foot = '목적지가 아니다 → 자식을 만들어 오픈 리스트에 넣는다'
        note = 'a 의 자식 b(5+9=14) 와 c(4+7=11) 이 오픈 리스트에 들어갔습니다.'
    else:
        nxt = st['open'][0]
        foot = '가장 작은 f 는 **%d** — 다음은 **%s** 를 테스트한다' % (nxt['f'], nxt['node'])
        note = 'b 는 f=14 라 아직 차례가 오지 않습니다. 오픈 리스트에 남아만 있습니다.'
    add({'type': 'diagram', 'title': 'A* 로 경로 찾기 — %d단계' % (i + 1),
         'nodes': nodes, 'edges': city_edges(),
         'side': [
             {'label': '지금 테스트하는 곳',
              'text': '**%s** · g=%d · h=%d · **f=%d**' % (st['test'], st['g'], st['h'], st['f']),
              'accent': True},
             {'label': '오픈 리스트 (g + h = f)', 'big': True, 'text': open_txt},
         ],
         'foot': foot,
         'notes': '교과서 36쪽 그림 Ⅰ-14. %s 를 테스트했습니다(f=%d). %s' % (st['test'], st['f'], note)})

add({'type': 'cards', 'title': '테스트한 상태의 수',
     'ask': '같은 경로를 찾는 데 **몇 개**를 테스트했나요?',
     'cards': [
         {'label': '균일 비용 탐색', 'text': '%d개' % UNI['tested'], 'desc': ' – '.join(UNI['order'])},
         {'label': 'A* 탐색', 'text': '%d개' % CITY['tested'], 'accent': True,
          'desc': ' – '.join(s['test'] for s in STEPS)},
     ],
     'foot': '찾은 경로와 비용은 **똑같습니다**',
     'notes': '교과서 36쪽. 같은 답을 더 적은 테스트로 찾았습니다.'})

add({'type': 'bullets', 'title': '왜 적게 테스트했는가',
     'lead': '**b 를 한 번도 열지 않았기 때문**입니다.',
     'bullets': [
         'b 의 누적 비용은 5 로 c 의 4 와 큰 차이가 없다',
         '그런데 b 에서 목적지까지 **직선거리가 9** 라 f = 5 + 9 = **14** 가 된다',
         'c 쪽은 끝까지 f 가 12 를 넘지 않아 **b 차례가 오지 않는다**',
     ],
     'note': {'label': '정리', 'text': '**앞으로 남은 거리**를 함께 보았기 때문에 헛걸음을 줄였습니다.'},
     'notes': '균일 비용 탐색은 b 를 두 번째로 열었습니다(a–c–b–d–e). A* 는 그 한 번을 아낀 것입니다.'})

# ══════════ 활동 — 8퍼즐 (37쪽) ═════════════════
add({'type': 'boards', 'title': '활동 — 8퍼즐을 A* 로 탐색하기',
     'items': [{'label': '초기 상태', 'board': board(PUZ['start']), 'accent': True},
               {'label': '목표 상태', 'board': board(PUZ['goal'])}],
     'foot': '이 판을 **몇 번 옮겨야** 목표가 될까요',
     'notes': '교과서 37쪽 활동3. 먼저 두 판을 눈으로 견주게 합니다.'})

add({'type': 'bullets', 'title': '8퍼즐의 규칙',
     'lead': '빈칸과 **붙어 있는** 타일 하나를 빈칸으로 밀 수 있습니다.',
     'bullets': [
         '한 번에 **한 칸**만 움직인다',
         '가지를 펼치는 순서는 **위쪽 → 아래쪽 → 왼쪽 → 오른쪽**',
         '판 밖으로는 나갈 수 없다 — 빈칸이 가장자리면 갈 수 있는 방향이 줄어든다',
     ],
     'note': {'label': '방향의 뜻', 'text': '**빈칸이** 움직이는 방향입니다. 타일은 그 반대로 밀려 들어옵니다.'},
     'notes': '교과서 37쪽 3번. 방향이 빈칸 기준이라는 것을 꼭 짚어 주세요 — 여기서 많이 헷갈립니다.'})

add({'type': 'boards', 'title': 'h 를 세는 법', 'arrow': False,
     'items': [{'label': '지금 상태', 'board': board(PUZ['tree'][0]['child']), 'accent': True},
               {'label': '목표 상태', 'board': board(PUZ['goal'])}],
     'foot': 'h(n) = 목표와 **다른 자리에 있는 타일의 수** (빈칸은 세지 않는다)',
     'notes': '교과서 37쪽 2번의 예와 같은 판입니다. 같은 자리끼리 하나씩 견주게 하세요 — '
              '3·4·5·6·7 은 제자리, 1·2·8 은 다른 자리라서 h = 3 입니다. '
              '빈칸은 세지 않는다는 것을 강조하세요.'})

t0 = PUZ['tree'][0]
add({'type': 'bullets', 'title': 'f 를 계산해 보면',
     'lead': '**f = g + h** 입니다. 8퍼즐에서 g 는 **지금까지 옮긴 횟수**입니다.',
     'bullets': [
         '초기 상태에서 한 번 옮겼으므로 **g = %d**' % t0['g'],
         '그 판에서 제자리에 없는 타일이 %d개이므로 **h = %d**' % (t0['h'], t0['h']),
         '따라서 **f = %d + %d = %d**' % (t0['g'], t0['h'], t0['f']),
     ],
     'note': {'label': '도시 문제와 다른 점',
              'text': '도시에서는 g 가 걸린 시간이었지만, 8퍼즐에서는 **옮긴 횟수**입니다.'},
     'notes': '한 번 옮길 때마다 g 가 1씩 늘어납니다. 여기까지 하고 활동으로 넘어갑니다.'})

d1 = [t for t in PUZ['tree'] if t['depth'] == 1]
add({'type': 'tree', 'title': '깊이 1 — 어디를 먼저 테스트할까',
     'nodes': [{'id': 'r', 'label': '초기 상태', 'board': board(PUZ['start']), 'accent': True}] +
              [{'id': 'c%d' % i, 'parent': 'r',
                'label': '%s · f = %d = %d+%d' % (t['dir'], t['f'], t['g'], t['h']),
                'board': board(t['child'])} for i, t in enumerate(d1)],
     'foot': 'f 값이 가장 작은 **%d** 을 먼저 테스트한다' % min(t['f'] for t in d1),
     'notes': '활동 시작! (15분 동안 진행) — 교과서 37쪽의 빈 판을 채우게 합니다. '
              '검산한 깊이 1 의 f 값은 ' +
              ' · '.join('%s %d' % (t['dir'], t['f']) for t in d1) + ' 입니다.'})

add({'type': 'cards', 'title': '활동 정리',
     'ask': 'A* 로 8퍼즐을 풀면 **몇 수**에 닿나요?',
     'cards': [
         {'label': '빈칸이 간 순서', 'text': ' → '.join(PUZ['solution']),
          'wide': True, 'accent': True, 'small': True,
          'desc': '%d수 · 테스트한 상태 %d개' % (PUZ['moves'], PUZ['expanded'])},
     ],
     'notes': '검산값입니다. 교과서 37쪽 트리의 마지막 f 값 5=5+0 과 같습니다. '
              '9! = %s 가지 중에서 %d개만 테스트했습니다.' % (comma(SPACE['p8']), PUZ['expanded'])})

add({'type': 'summary', 'title': '오늘 정리',
     'items': [
         '맹목적 탐색은 상태 수가 많아지면 시간이 감당이 안 된다',
         '휴리스틱값 — 그 상태에서 목표까지의 예상 비용을 추정한 값',
         'A* 탐색 — f(n) = g(n) + h(n) 이 가장 작은 상태를 먼저 테스트한다',
         '같은 경로를 균일 비용 %d개 대신 %d개의 테스트로 찾았다' % (UNI['tested'], CITY['tested']),
     ],
     'foot': '다음 시간 — 지식의 표현과 추론'})

deck = {
    'title': '6. 지능적 탐색',
    'kicker': '인공지능 기초 · 1-1-2',
    'out': os.path.join(ROOT, 'tools', 'samples', '인공지능기초_6차시_지능적탐색.pptx'),
    'slides': S,
}
p = os.path.join(ROOT, 'tools', 'samples', 'lesson6-smart.deck.json')
io.open(p, 'w', encoding='utf-8').write(json.dumps(deck, ensure_ascii=False, indent=2))
print('slides', len(S), '->', p)
