# -*- coding: utf-8 -*-
"""
verify/lesson6-deck.py — 6차시(지능적 탐색) 덱 JSON 만들기

■ 흐름 (2026-09-02 지시)
  1부  아무 정보 없는 탐색(너비·깊이) → 비용 정보를 쓰는 탐색(균일 비용)
  2부  반례 — 균일 비용도 헛걸음한다 → 새 정보가 필요하다
  3부  휴리스틱값 · 어떻게 추정하는가 (도시 · 틱택토 · 8퍼즐)
  4부  A* 알고리즘 f(n) = g(n) + h(n)
  5부  예시와 활동

■ 글은 교과서를 그대로 옮깁니다 (2026-09-03 지시)
  · 균일 비용 탐색 알고리즘 ①~④ — 교과서 32쪽 「안내」 원문
  · 33쪽 진행 과정 여섯 단계 — 트리 · 오픈/닫힌 리스트 · 설명을 단계마다
  · 순회 외판원 문제 — 34쪽 「AI 이야기」 문제·풀이 전문
  · 틱택토 — 35쪽 그림 Ⅰ-12 의 구성(시작 → 세 갈래 h=3·4·2 · 이길 수 있는 선)

⚠ 숫자·순서·오픈/닫힌 리스트는 손으로 적지 않습니다.
   verify/lesson6.py 가 실제로 돌려 내놓은 lesson6-facts.json 을 읽어 씁니다. (CLAUDE.md 14·15)
⚠ 최상 우선 탐색·언덕 오르기는 다루지 않습니다 (2026-08-28 결정).
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
F = json.load(io.open(os.path.join(HERE, 'lesson6-facts.json'), encoding='utf-8'))

CITY, PUZ, TTT = F['city'], F['puzzle'], F['ttt']
UNI, TSP, SPACE = CITY['uniform'], F['tsp'], F['space']
H = CITY['h']
STEPS = CITY['steps']            # A* 단계
USTEPS = UNI['steps']            # 균일 비용 단계 (교과서 33쪽)

board = lambda st: ['' if v == 0 else str(v) for v in st]
comma = lambda n: format(n, ',')
lst = lambda items: '[' + ', '.join('%s(%d)' % (x['node'], x['g']) for x in items) + ']'

# ── 도시 지도 (교과서 그림 Ⅰ-10) ────────────────
CITY_POS = {'a': (8, 52), 'b': (36, 10), 'c': (30, 92), 'd': (74, 76), 'e': (92, 40)}
CITY_EDGES = [('a', 'b', 5), ('a', 'c', 4), ('b', 'c', 5),
              ('b', 'd', 8), ('b', 'e', 9), ('c', 'd', 3), ('d', 'e', 5)]
START_GOAL = {'a': 'blue', 'e': 'red'}
city_edges = lambda: [{'from': u, 'to': v, 'label': str(w)} for u, v, w in CITY_EDGES]


def city_nodes(label=None, color=None, accent=(), dim=()):
    out = []
    for k, (x, y) in CITY_POS.items():
        n = {'id': k, 'label': label(k) if label else k, 'x': x, 'y': y}
        if k in accent:
            n['accent'] = True
        elif color and k in color:
            n['color'] = color[k]
        if k in dim:
            n['dim'] = True
        out.append(n)
    return out


# ── 교과서 33쪽 탐색 트리 — 자리를 손으로 잡습니다 ──
#    (자식 수가 제각각이라 자동 배치는 한쪽으로 쏠립니다 — deck-spec.md 참고)
TREE_POS = {
    'a':  (50, 5),
    'b':  (26, 33), 'c': (72, 33),
    'bc': (6, 63), 'bd': (20, 63), 'be': (38, 63),      # b 의 자식
    'cb': (58, 63), 'cd': (86, 63),                     # c 의 자식
    'de': (86, 93),                                     # d 의 자식
}
TREE_EDGES = [('a', 'b', '5'), ('a', 'c', '4'),
              ('b', 'bc', '5'), ('b', 'bd', '8'), ('b', 'be', '9'),
              ('c', 'cb', '5'), ('c', 'cd', '3'), ('cd', 'de', '5')]
TREE_LABEL = {
    'a': 'a\n0', 'b': 'b\n5', 'c': 'c\n4',
    'bc': 'c\n제외', 'bd': 'd\n5+8=13', 'be': 'e\n5+9=14',
    'cb': 'b\n4+5=9', 'cd': 'd\n4+3=7', 'de': 'e\n4+3+5=12',
}
# 단계마다 화면에 있는 노드 / 흐리게(제외) 표시할 노드 / 방금 고른 노드
TREE_SHOW = [
    (['a'], [], 'a'),
    (['a', 'b', 'c'], [], 'a'),
    (['a', 'b', 'c', 'cb', 'cd'], ['cb'], 'c'),
    (['a', 'b', 'c', 'cb', 'cd', 'bc', 'bd', 'be'], ['cb', 'bc', 'bd'], 'b'),
    (['a', 'b', 'c', 'cb', 'cd', 'bc', 'bd', 'be', 'de'], ['cb', 'bc', 'bd', 'be'], 'd'),
    (['a', 'b', 'c', 'cb', 'cd', 'bc', 'bd', 'be', 'de'], ['cb', 'bc', 'bd', 'be'], 'de'),
]


def tree_slide(show, dim, pick):
    nodes = []
    for k in show:
        n = {'id': k, 'label': TREE_LABEL[k], 'x': TREE_POS[k][0], 'y': TREE_POS[k][1]}
        if k in dim:
            n['dim'] = True
        elif k == pick:
            n['accent'] = True
        nodes.append(n)
    edges = [{'from': u, 'to': v, 'label': w, 'dim': v in dim}
             for u, v, w in TREE_EDGES if u in show and v in show]
    return nodes, edges


# ── 틱택토 ──────────────────────────────────────
TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
ttt_board = lambda p: ['○' if i == p else '' for i in range(9)]
ttt_lines = lambda p: [ln for ln in TTT_LINES if p in ln]


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

# ═══════════ 1부 — 지금까지 한 탐색 ═════════════
add({'type': 'title', 'title': '6. 지능적 탐색',
     'notes': '교과서 32~37쪽. 오늘의 축은 「무엇을 보고 다음에 열어 볼 곳을 고르는가」 하나입니다.'})

add({'type': 'quiz', 'title': '지난 시간 확인',
     'items': [
         {'text': '누적 비용이란 무엇인가요?'},
         {'text': '오픈 리스트에서 어떤 상태를 먼저 골랐나요?'},
         {'text': 'a 에서 e 까지 찾은 경로와 비용은?'},
     ],
     'notes': '답 — 초기 상태에서 그 상태까지 오는 경로의 비용 합 / 누적 비용이 가장 작은 상태 / '
              '%s · %d' % (' → '.join(CITY['path']), CITY['cost'])})

add({'type': 'table', 'title': '지금까지 배운 탐색',
     'head': ['탐색', '다음에 열어 볼 곳을 무엇으로 고르나'],
     'rows': [['너비 우선 탐색', '얕은 것부터 — **아무 정보도 쓰지 않는다**'],
              ['깊이 우선 탐색', '한 갈래 끝까지 — **아무 정보도 쓰지 않는다**'],
              ['균일 비용 탐색', '**누적 비용**이 가장 작은 것']],
     'firstCol': 6.0,
     'foot': '오늘은 여기에 **하나를 더** 봅니다',
     'notes': '4·5차시를 한 장으로 되짚습니다.'})

add({'type': 'bullets', 'title': '비용 정보가 주어졌을 때의 탐색',
     'lead': '하나의 상태에서 다른 상태로 이동하기 위해 필요한 **조건이나 행동의 비용이 다를 때**가 있습니다.',
     'bullets': [
         '목표 상태에 이르는 **총비용이 가장 작은 경로**를 찾고자 한다면',
         '**비용이 작은 경로를 먼저 탐색**하는 것이 더 효율적이다',
     ],
     'note': {'label': '균일 비용 탐색',
              'text': '현재 상태에서 다음 상태를 선택할 때, **누적 비용의 값을 확인하여 그 값이 가장 작은 상태를 '
                      '먼저 선택**하는 순서로 탐색을 진행하는 알고리즘'},
     'notes': '교과서 32쪽 본문 그대로입니다.'})

add({'type': 'diagram', 'title': '도시 방문 경로 찾기',
     'nodes': city_nodes(color=START_GOAL), 'edges': city_edges(),
     'foot': 'a 를 출발하여 e 까지 가는 경로 중 **시간이 가장 짧은 경로**를 찾는다',
     'notes': '교과서 32쪽 그림 Ⅰ-10. 도시 간 연결선의 숫자는 이동하는 데 걸리는 시간입니다.'})

add({'type': 'bullets', 'title': '누적 비용',
     'lead': '초기 상태에서 현재 상태까지 오는 경로의 **누적된 비용의 합**을 말합니다.',
     'bullets': [
         'a → c 로 가면 — 누적 비용 **4**',
         'a → c → d 로 가면 — 4 + 3 = 누적 비용 **7**',
         'a → c → d → e 로 가면 — 4 + 3 + 5 = 누적 비용 **12**',
     ],
     'note': {'label': '오픈 리스트 · 닫힌 리스트',
              'text': '오픈 리스트는 **목표 상태인지 테스트할 후보 상태들을 임시로 보관하고 있는 대기실**입니다. '
                      '이 중에서 테스트가 끝난 상태는 **닫힌 리스트**로 옮깁니다.'},
     'notes': '교과서 32쪽 여백 그대로. 마지막 간선 값만 보는 실수가 잦습니다.'})

add({'type': 'steps', 'title': '균일 비용 탐색 알고리즘',
     'steps': [
         {'n': '①', 'label': '초기 상태가 목표 상태이면 마친다.', 'desc': ''},
         {'n': '②', 'label': '초기 상태에서 갈 수 있는 간선에 따라 자식 상태를 생성하여',
          'desc': '오픈 리스트에 넣는다.'},
         {'n': '③', 'label': '오픈 리스트에서 누적 비용의 값이 가장 작은 상태를',
          'desc': '다음 순서로 선택한다.'},
         {'n': '④', 'label': '선택된 상태가 목표 상태인지 테스트한다.',
          'desc': '목표 상태이면 작업을 끝낸다. 목표 상태가 아니면 자식 상태를 생성하여 '
                  '오픈 리스트에 넣고 ③으로 돌아간다.'},
     ],
     'foot': '오픈 리스트에 **똑같은 상태 노드**가 있으면 그중에 **더 작은 비용**을 가지는 상태만 남겨 둔다',
     'notes': '교과서 32쪽 「안내」 원문입니다. ③ 을 손으로 짚어 주세요 — A* 는 여기만 바뀝니다.'})

# ── 교과서 33쪽 진행 과정 ──
add({'type': 'section', 'num': '33쪽', 'title': '균일 비용 탐색 알고리즘 진행 과정',
     'desc': '트리를 그려 가며 여섯 단계로 따라갑니다',
     'notes': '교과서 33쪽 그림을 그대로 옮긴 여섯 장입니다.'})

STEP_TEXT = [
    '시작점 a를 오픈 리스트에 넣는다.',
    'a를 테스트해 보니 목표 상태가 아니므로 자식 상태인 b와 c를 생성하고 모두 오픈 리스트에 넣는다. '
    '현재 상태인 a를 닫힌 리스트에 넣는다.',
    '오픈 리스트에서 누적 비용의 값이 가장 작은 상태를 선택한다. c는 목적지가 아니므로 자식 상태 b, d를 '
    '생성한다. 오픈 리스트에는 이미 b(5)가 새로운 b(4+5=9)보다 누적 비용이 작으므로 b(5)만 남긴다. '
    '현재 상태인 c를 닫힌 리스트에 넣는다.',
    '오픈 리스트에서 누적 비용의 값이 가장 작은 b(5)를 선택한다. 목적지가 아니므로 c, d, e를 생성한다. '
    '그러나 이미 테스트된 c를 제외하고 새로 생성된 d(5+8=13)는 기존에 있는 d(4+3=7)보다 크므로 제외한다. '
    'e(5+9=14)는 오픈 리스트에 넣는다. 현재 상태인 b(5)는 닫힌 리스트에 넣는다.',
    '오픈 리스트에서 누적 비용의 값이 가장 작은 d(7)를 선택한다. 목적지가 아니므로 b, c, e를 생성한다. '
    '그러나 이미 테스트된 b, c가 있으므로 제외한다. 생성된 e(4+3+5=12)는 이미 있던 e(5+9=14)보다 작으므로 '
    'e(12)가 오픈 리스트에 들어가고 e(14)는 제외한다. d(7)는 닫힌 리스트에 넣는다.',
    '오픈 리스트에서 탐색이 끝나지 않은 누적 비용의 값이 가장 작은 e(12)를 선택하고, 목적지이므로 종료한다. '
    '다섯 번의 테스트만에 가장 비용이 작은 경로를 찾았다.',
]
# ① 은 아직 아무것도 테스트하지 않은 상태 — 검산 결과 앞에 한 장을 붙입니다
PRE = {'open': [{'node': 'a', 'g': 0}], 'closed': []}
UNI_VIEW = [PRE] + USTEPS

for i, (txt, st) in enumerate(zip(STEP_TEXT, UNI_VIEW)):
    show, dim, pick = TREE_SHOW[i]
    nodes, edges = tree_slide(show, dim, pick)
    goal_q = ''
    if i == 0:
        goal_q = ''
    elif i == len(STEP_TEXT) - 1:
        goal_q = '목적지인가? **Yes → 종료**'
    else:
        goal_q = '목적지인가? **No**'
    side = [{'label': '%d' % (i + 1), 'text': txt},
            {'label': '오픈 리스트 / 테스트가 끝난 닫힌 리스트', 'big': True,
             'text': '오픈  %s\n닫힌  %s' % (lst(st['open']), lst(st['closed']))}]
    foot = goal_q
    if i == len(STEP_TEXT) - 1:
        foot = '찾은 경로 **%s** · 경로 비용 **%s = %d**' % (
            ' → '.join(CITY['path']), '+'.join(['4', '3', '5']), CITY['cost'])
    add({'type': 'diagram', 'title': '진행 과정 %d' % (i + 1),
         'nodes': nodes, 'edges': edges, 'side': side, 'foot': foot,
         'notes': '교과서 33쪽 %d번. %s' % (i + 1, txt)})

# ═══════════ 2부 — 반례 ═════════════════════════
add({'type': 'diagram', 'title': 'b 는 왜 열어 봤을까',
     'nodes': city_nodes(color=START_GOAL, accent=('b',)),
     'edges': city_edges(),
     'side': [
         {'label': '그때 오픈 리스트', 'big': True, 'text': 'c : 4\nb : 5'},
         {'label': '그래서', 'text': 'c 다음으로 **b 가 싸다** — 규칙 ③ 대로 b 를 열었다'},
     ],
     'foot': '그런데 b 는 목적지 e 에서 **가장 먼** 도시입니다',
     'notes': '테스트 순서는 a–c–b–d–e 였습니다. 세 번째로 b 를 열었지만 '
              'b 를 지나는 길은 최종 답에 들어가지 않았습니다. 헛걸음입니다.'})

add({'type': 'diagram', 'title': '지금까지 든 비용만 보면',
     'nodes': city_nodes(label=lambda k: k if k == 'e' else '%s\n남은 거리 ?' % k, color=START_GOAL),
     'edges': [{'from': k, 'to': 'e', 'label': '?', 'dim': True} for k in ('a', 'b', 'c', 'd')],
     'foot': '**앞으로 얼마나 남았는지**를 모른 채 고르고 있었다',
     'notes': '핵심 장면입니다. 지나온 값은 정확히 알지만 남은 거리는 전혀 모릅니다.'})

add({'type': 'bullets', 'title': '헛걸음이 문제가 되는 까닭',
     'lead': '도시 다섯 곳이면 한 번 헛걸음해도 티가 나지 않습니다. **문제가 커지면 다릅니다.**',
     'bullets': [
         '8퍼즐 — 9! = **%s**가지' % comma(SPACE['p8']),
         '15퍼즐 — 15! = **%s**가지' % comma(SPACE['p15']),
         '24퍼즐 — 6.2 × 10²³ · 바둑 — 3³⁶¹ ~ 10³⁶⁰ (우주에 있는 분자의 개수 10⁸⁰과 비교)',
     ],
     'notes': '교과서 34쪽 여백 「상태 공간의 크기」 그대로입니다.'})

add({'type': 'bullets', 'title': '‘순회 외판원 문제’와 시간 복잡도',
     'lead': '임의의 도시에서 출발하여 모든 도시를 한 번씩만 모두 다 방문하여 출발 도시로 돌아오는 '
             '**가장 짧은 경로를 찾는 문제**를 ‘순회 외판원 문제’라고 합니다.',
     'bullets': [
         '**문제** — 네 곳의 도시(A, B, C, D)가 있다. 모든 도시를 한 번씩 방문하는 경로는 모두 몇 개일까?',
         '**풀이** — 도시가 네 곳이므로 경로의 수는 4! = 4×3×2×1 = **%s가지**이다.' % comma(TSP['4']),
         '도시가 다섯 곳으로만 늘어나도 경로의 수는 **%s가지**로 되고, 10곳이면 **%s가지**로 급격히 늘어난다.'
         % (comma(TSP['5']), comma(TSP['10'])),
     ],
     'note': {'label': '가능하지만 실제로는 불가능한 문제',
              'text': '도시가 늘어나면 경로의 수가 너무 많아져서 **답을 얻을 수 없는 경우**가 생긴다. '
                      '이러한 문제를 ‘가능하지만 실제로는 불가능한 문제’라고 한다.'},
     'notes': '교과서 34쪽 AI 이야기 전문입니다.'})

add({'type': 'diagram', 'title': '맹목적 탐색의 장단점',
     'nodes': BT_NODES, 'edges': BT_EDGES,
     'nodeH': 0.42, 'nodeW': 0.34, 'nodeMinW': 0.28,
     'foot': '파란 노드가 **시작** · 빨간 노드가 **목표**',
     'side': [
         {'label': '좋은 점', 'text': '목표 상태를 언젠가 찾는다는 것이 보장된다', 'accent': True},
         {'label': '좋은 점', 'text': '목표 상태가 여러 개 있을 때, 너비 우선 탐색은 경로의 길이가 가장 짧은 목표를 찾아 준다'},
         {'label': '나쁜 점', 'text': '상태 수가 많을수록 탐색 시간이 늘어난다'},
     ],
     'notes': '교과서 34쪽 표 Ⅰ-1 그대로입니다.'})

add({'type': 'cards', 'title': '탐색 방법의 평가 기준',
     'cards': [
         {'label': '완전성', 'text': '목표 상태가 있다면 **언젠가는 찾는다**는 것을 보장한다'},
         {'label': '최적성', 'text': '목표 상태가 여러 개일 때는 그중에 **가장 좋은 것**을 찾는다는 것을 보장한다'},
         {'label': '시간 복잡도', 'text': '**현실적으로 가능한 시간** 내에 목표 상태를 찾아야 한다'},
     ],
     'foot': '지금까지 배운 탐색은 앞의 둘은 갖췄지만 **세 번째에서 막힌다**',
     'notes': '교과서 34쪽 여백 그대로입니다.'})

add({'type': 'cards', 'title': '필요한 것',
     'cards': [
         {'def': True, 'wide': True, 'label': '지금 쓰는 정보',
          'text': '초기 상태에서 여기까지 **이미 든 비용** — 정확히 안다'},
         {'def': True, 'wide': True, 'label': '더 있어야 하는 정보',
          'text': '여기서 목표까지 **앞으로 들 비용** — 가 보기 전에는 알 수 없다'},
     ],
     'foot': '정확히 알 수 없다면, **어림이라도** 해 보면 어떨까',
     'notes': '2부의 결론이자 3부로 넘어가는 다리입니다.'})

# ═══════════ 3부 — 휴리스틱값 ═══════════════════
add({'type': 'bullets', 'title': '지능적 탐색',
     'lead': '탐색 시간을 더 줄이기 위해 주어진 비용 정보 이외에도 **추정된 정보**를 사용할 수 있습니다.',
     'bullets': [
         '상태 수가 많아질수록 탐색 시간이 늘어나기 때문에',
         '알고 있는 여러 정보를 사용하기도 하고 **추정 지식**을 사용하여 탐색 시간을 줄이려고 노력한다',
     ],
     'note': {'label': '지능적 탐색',
              'text': '주어진 정보 외에도 문제에 대해 알고 있는 **경험적 지식을 평갓값으로 추정**하여 '
                      '탐색에 사용하는 것'},
     'notes': '교과서 34쪽 본문 그대로입니다.'})

add({'type': 'bullets', 'title': '휴리스틱값',
     'lead': '탐색 시간을 더 줄이기 위해 **경험적인 추정값**을 추가로 사용할 수도 있는데, '
             '이러한 탐색 기법을 **휴리스틱(heuristics) 탐색**이라고 합니다.',
     'bullets': [
         '**휴리스틱** — 어떤 문제 해결을 위해 알고 있는 경험적 지식',
         '탐색을 할 상태를 선택할 때 **목표 상태까지의 예상 비용을 추정**하여 사용하는데,',
         '이를 그 상태에서의 **휴리스틱값**이라고 한다',
     ],
     'note': {'label': '기억할 것',
              'text': '휴리스틱값은 경험적 지식을 말하는 것이므로 **사람마다 다르게 정의할 수 있습니다.**'},
     'notes': '교과서 35쪽 본문 그대로입니다.'})

add({'type': 'section', 'num': '?', 'title': '어떻게 추정할까',
     'desc': '문제마다 다릅니다 — 도시 · 틱택토 · 8퍼즐',
     'notes': '3부의 중심 질문입니다.'})

add({'type': 'diagram', 'title': '도시 방문 경로 찾기에서의 휴리스틱값',
     'nodes': city_nodes(label=lambda k: '%s\nh=%d' % (k, H[k]), color=START_GOAL),
     'edges': [{'from': k, 'to': 'e', 'label': str(H[k]), 'dim': True} for k in ('a', 'b', 'c', 'd')],
     'side': [
         {'label': '무엇을 추정값으로 쓰나',
          'text': '각 도시에서 목표 도시(목적지)까지의 **‘직선거리’**를 실제 거리의 추정값인 '
                  '휴리스틱값으로 사용할 수 있다', 'accent': True},
         {'label': '값', 'big': True,
          'text': 'h(a)=%d · h(b)=%d\nh(c)=%d · h(d)=%d · h(e)=%d'
                  % (H['a'], H['b'], H['c'], H['d'], H['e'])},
     ],
     'notes': '교과서 35쪽 그림 Ⅰ-11. b 의 9 가 가장 큽니다 — 아까 헛걸음한 그 도시입니다.'})

add({'type': 'bullets', 'title': '직선거리를 쓰는 까닭',
     'lead': '직선거리는 **실제로 가야 하는 거리보다 짧거나 같습니다.**',
     'bullets': [
         '도로는 굽어 있으므로 곧게 잰 거리보다 **길 수밖에** 없다',
         '지도만 있으면 **바로 잴 수 있다** — 길을 따라 가 보지 않아도 된다',
         '목표 도시 자신의 값은 **0** 이다 — 더 갈 곳이 없으므로',
     ],
     'note': {'label': '확인', 'text': 'h(c)=7 인데 c 에서 e 까지 실제로 가면 3 + 5 = **8** 입니다.'},
     'notes': '추정값이 실제보다 크면 좋은 길을 놓칠 수 있습니다.'})

add({'type': 'bullets', 'title': '틱택토 게임에서의 휴리스틱 함수',
     'lead': '틱택토 게임에서는 내가 어느 위치에 돌을 놓았을 때 **그것을 포함하여 이길 수 있는 선의 개수**를 '
             '휴리스틱 함수, 즉 **이길 수 있는 예측값**으로 사용할 수 있습니다.',
     'bullets': [
         '그것을 함수로 정의한 것을 **휴리스틱 함수**라고 한다',
         '**h(n) = 이길 수 있는 선의 개수**',
         '판 전체의 선은 가로 3줄 · 세로 3줄 · 대각선 2줄로 모두 **8줄**이다',
     ],
     'notes': '교과서 35쪽 본문 그대로. 다음 장에서 실제로 세어 봅니다.'})

add({'type': 'tree', 'title': '가장 좋은 휴리스틱값을 가진 위치를 선택하면',
     'nodeH': 2.0,
     'nodes': [
         {'id': 'root', 'label': '시작', 'board': [''] * 9, 'grid': True},
         {'id': 'p0', 'parent': 'root', 'label': 'h = %d' % TTT['corner'],
          'board': ttt_board(0), 'grid': True, 'lines': ttt_lines(0)},
         {'id': 'p4', 'parent': 'root', 'label': 'h = %d' % TTT['center'], 'accent': True,
          'board': ttt_board(4), 'grid': True, 'lines': ttt_lines(4)},
         {'id': 'p1', 'parent': 'root', 'label': 'h = %d' % TTT['edge'],
          'board': ttt_board(1), 'grid': True, 'lines': ttt_lines(1)},
     ],
     'foot': '**이길 가능성이 높다** — 가운데를 선택한다',
     'notes': '교과서 35쪽 그림 Ⅰ-12 그대로입니다. 가운데만 대각선 두 줄을 모두 지나므로 '
              '가로1+세로1+대각선2 = 4 입니다. 모서리 3, 변 2. '
              '도시와 달리 여기서는 **값이 클수록 좋다**는 것을 짚어 주세요.'})

add({'type': 'boards', 'title': '8퍼즐에서의 휴리스틱값', 'arrow': False,
     'items': [{'label': '현재 상태', 'board': board(PUZ['tree'][0]['child']), 'accent': True},
               {'label': '목표 상태', 'board': board(PUZ['goal'])}],
     'foot': 'h(n) = 목표 상태와 **일치하지 않는 숫자 타일의 수** (공백 제외)',
     'notes': '교과서 37쪽 2번. 일치하는 타일의 번호 3, 4, 5, 6, 7 / '
              '일치하지 않는 타일의 번호 1, 2, 8 → 따라서 h(n) = 3 입니다.'})

add({'type': 'cards', 'title': '추정값을 고르는 기준',
     'cards': [
         {'def': True, 'wide': True, 'label': '빨리 계산할 수 있어야 한다',
          'text': '추정하는 데 오래 걸리면 탐색을 줄인 보람이 없다'},
         {'def': True, 'wide': True, 'label': '실제 비용을 넘지 않아야 한다',
          'text': '넘게 어림하면 **좋은 길을 놓칠 수 있다**'},
     ],
     'notes': '직선거리·일치하지 않는 타일 수 둘 다 실제 비용을 넘지 않습니다.'})

# ═══════════ 4부 — A* ═══════════════════════════
add({'type': 'bullets', 'title': 'A* 탐색',
     'lead': '휴리스틱과 같은 지능적 정보를 사용하는 탐색 알고리즘으로 대표적인 것이 **A\\* 알고리즘**입니다.',
     'bullets': [
         '탐색을 진행할 때 목표 상태인지 **테스트할 상태를 선택할 때에**',
         '‘초기 상태에서 현재 상태까지의 비용 값’과 ‘현재 상태에서 목표 상태까지의 비용 추정값’을 **합한 값**을 사용한다',
         '모든 상태를 다 검토하는 대신 휴리스틱값과 누적 비용값을 사용하여 **빠르고 효율적으로** 탐색한다',
     ],
     'note': {'label': '최종 비용 추정치', 'text': '**f(n) = g(n) + h(n)**'},
     'notes': '교과서 36쪽 본문 그대로입니다.'})

add({'type': 'vflow', 'title': 'f(n) 은 무엇을 더한 값인가',
     'items': [
         {'label': 'g(n)', 'text': '초기 상태에서 현재 상태까지의 비용 — 이미 쓴 값, 정확히 안다'},
         {'label': 'h(n)', 'text': '현재 상태에서 목표 상태까지 추정한 비용 — 앞으로 쓸 값, 어림한다'},
         {'label': 'f(n)', 'text': '둘을 더한 최종 비용 추정치'},
     ],
     'notes': '교과서 36쪽 그림 Ⅰ-13.'})

add({'type': 'table', 'title': '알고리즘의 어디가 바뀌나',
     'head': ['', '균일 비용 탐색', 'A* 탐색'],
     'rows': [['①②④', '같다', '같다'],
              ['③ 고르는 기준', '누적 비용 g 가 가장 작은 것', '**f = g + h** 가 가장 작은 것']],
     'firstCol': 4.5,
     'foot': '지도도 같고 흐름도 같습니다. **③ 한 줄만** 바뀝니다',
     'notes': '앞에서 짚어 둔 ③ 으로 돌아옵니다.'})

# ═══════════ 5부 — 예시 ═════════════════════════
add({'type': 'section', 'num': '예', 'title': 'A* 탐색에서의 휴리스틱값 사용',
     'desc': '각 도시에서의 f 값은 ‘(초기 상태에서 후보 상태까지의 비용 값) + (휴리스틱값)’',
     'notes': '교과서 36쪽 그림 Ⅰ-14 를 네 단계로 나눠 봅니다. '
              '예를 들면 a 에서 b 로 간 경우 비용은 5이고 b 의 휴리스틱값은 9이므로 b 의 f 값은 5+9=14 입니다.'})

for i, st in enumerate(STEPS):
    open_nodes = [o['node'] for o in st['open']]
    dim = tuple(k for k in CITY_POS
                if k != st['test'] and k not in open_nodes and k not in st['path']
                and k not in START_GOAL)
    nodes = city_nodes(label=lambda k: '%s\nh=%d' % (k, H[k]),
                       color=START_GOAL, accent=(st['test'],), dim=dim)
    open_txt = '\n'.join('%s : %d + %d = %d' % (o['node'], o['g'], o['h'], o['f'])
                         for o in st['open']) or '비어 있음'
    last = (i == len(STEPS) - 1)
    if last:
        foot = '목적지인가? **Yes → 종료** · 경로 **%s** · 비용 **%d**' % (' → '.join(CITY['path']), CITY['cost'])
        note = '목적지이므로 종료합니다. b 는 끝내 한 번도 열리지 않았습니다.'
    elif i == 0:
        foot = '목적지인가? **No** → 자식 b·c 를 만들어 오픈 리스트에 넣는다'
        note = 'b 는 5+9=14, c 는 4+7=11 입니다. 지도의 h 값과 간선 값을 짚어 가며 함께 계산하세요.'
    else:
        nxt = st['open'][0]
        foot = 'f 값이 14 보다 **%d** 이 작으므로 **%s** 를 선택한다' % (nxt['f'], nxt['node'])
        note = 'b 는 f=14 라 아직 차례가 오지 않습니다.'
    add({'type': 'diagram', 'title': '%d단계 — %s 를 테스트' % (i + 1, st['test']),
         'nodes': nodes, 'edges': city_edges(),
         'side': [
             {'label': '지금 테스트하는 곳',
              'text': '**%s** · g=%d · h=%d · **f=%d**' % (st['test'], st['g'], st['h'], st['f']),
              'accent': True},
             {'label': '오픈 리스트 (g + h = f)', 'big': True, 'text': open_txt},
         ],
         'foot': foot,
         'notes': '교과서 36쪽 그림 Ⅰ-14. %s' % note})

add({'type': 'cards', 'title': '테스트한 상태의 수',
     'ask': '같은 경로를 찾는 데 **몇 개**를 테스트했나요?',
     'cards': [
         {'label': '균일 비용 탐색', 'text': '%d개' % UNI['tested'], 'desc': ' – '.join(UNI['order'])},
         {'label': 'A* 탐색', 'text': '%d개' % CITY['tested'], 'accent': True,
          'desc': ' – '.join(s['test'] for s in STEPS)},
     ],
     'foot': '찾은 경로와 비용은 **똑같습니다**',
     'notes': '교과서 36쪽 — 「균일 비용 탐색에서는 5개의 상태를 테스트했지만 A* 탐색에서는 4개의 상태만을 '
              '테스트해서 더 효율적으로 탐색을 진행했어요!」'})

add({'type': 'bullets', 'title': '처음의 그 헛걸음은 어떻게 됐나',
     'lead': '**b 를 한 번도 열지 않았습니다.**',
     'bullets': [
         'b 까지 가는 누적 비용은 5 로 c 의 4 와 큰 차이가 없다',
         '그런데 b 에서 목적지까지 **추정한 거리가 9** 라 f = 5 + 9 = **14**',
         'c 쪽은 끝까지 f 가 12 를 넘지 않아 **b 차례가 오지 않는다**',
     ],
     'note': {'label': '정리', 'text': '**앞으로 남은 거리를 어림한 값**을 함께 보았기 때문에 헛걸음이 사라졌습니다.'},
     'notes': '2부에서 던진 질문에 대한 답입니다.'})

# ═══════════ 활동 ═══════════════════════════════
add({'type': 'section', 'num': '활동', 'title': '8퍼즐을 A* 알고리즘으로 탐색해 보기',
     'desc': '교과서 37쪽 활동3',
     'notes': '앱의 실습 「8퍼즐 A*」 로 각자 g 와 f 를 계산해 봅니다.'})

add({'type': 'boards', 'title': '초기 상태와 목표 상태',
     'items': [{'label': '초기 상태', 'board': board(PUZ['start']), 'accent': True},
               {'label': '목표 상태', 'board': board(PUZ['goal'])}],
     'foot': 'h(n) = 목표 상태와 **일치하지 않는 숫자 타일의 수** (공백 제외)',
     'notes': '교과서 37쪽 활동3 의 1번·2번입니다.'})

add({'type': 'bullets', 'title': '8퍼즐에서 g 와 h',
     'lead': '빈 타일을 옮기는 순서는 **위쪽, 아래쪽, 왼쪽, 오른쪽**(UP, DOWN, LEFT, RIGHT)을 적용합니다.',
     'bullets': [
         '**g(n)** — 초기 상태에서 현재 상태까지의 비용, 즉 **지금까지 옮긴 횟수**',
         '**h(n)** — 휴리스틱값, 목표 상태와 **일치하지 않는 숫자 타일의 수**(공백 제외)',
         '**f(n)** — 최종 비용 추정치, g(n) + h(n)',
     ],
     'note': {'label': '방향의 뜻', 'text': '**빈칸이** 움직이는 방향입니다. 타일은 그 반대로 밀려 들어옵니다.'},
     'notes': '교과서 37쪽 2번·3번 그대로입니다.'})

d1 = [t for t in PUZ['tree'] if t['depth'] == 1]
add({'type': 'tree', 'title': '깊이 1 — 어디를 먼저 테스트할까',
     'nodes': [{'id': 'r', 'label': '초기 상태', 'board': board(PUZ['start']), 'accent': True}] +
              [{'id': 'c%d' % i, 'parent': 'r',
                'label': '%s · f = %d = %d+%d' % (t['dir'], t['f'], t['g'], t['h']),
                'board': board(t['child'])} for i, t in enumerate(d1)],
     'foot': 'f 값이 가장 작은 **%d** 을 먼저 테스트한다' % min(t['f'] for t in d1),
     'notes': '활동 시작! (15분 동안 진행) — 앱 → 실습 「8퍼즐 A*」 에서 각자 g·f 를 계산해 넣습니다.'})

add({'type': 'cards', 'title': '활동 정리',
     'ask': 'A* 로 8퍼즐을 풀면 **몇 수**에 닿나요?',
     'cards': [
         {'label': '빈칸이 간 순서', 'text': ' → '.join(PUZ['solution']),
          'wide': True, 'accent': True, 'small': True,
          'desc': '%d수 · 테스트한 상태 %d개' % (PUZ['moves'], PUZ['expanded'])},
     ],
     'notes': '검산값입니다. 9! = %s 가지 중에서 %d개만 테스트했습니다.'
              % (comma(SPACE['p8']), PUZ['expanded'])})

add({'type': 'summary', 'title': '오늘 정리',
     'items': [
         '아무 정보 없이 — 너비 우선 · 깊이 우선 탐색',
         '지나온 비용을 보고 — 균일 비용 탐색 (그런데 헛걸음을 한다)',
         '남은 비용을 어림해서 — 휴리스틱값 h(n)',
         '둘을 더해서 고른다 — A* 탐색, f(n) = g(n) + h(n)',
     ],
     'foot': '같은 경로를 균일 비용 %d개 대신 **%d개**의 테스트로 찾았다' % (UNI['tested'], CITY['tested']),
     'notes': '다음 시간은 지식의 표현과 추론입니다.'})

deck = {
    'title': '6. 지능적 탐색',
    'kicker': '인공지능 기초 · 1-1-2',
    'out': os.path.join(ROOT, 'tools', 'samples', '인공지능기초_6차시_지능적탐색.pptx'),
    'slides': S,
}
p = os.path.join(ROOT, 'tools', 'samples', 'lesson6-smart.deck.json')
io.open(p, 'w', encoding='utf-8').write(json.dumps(deck, ensure_ascii=False, indent=2))
print('slides', len(S), '->', p)
