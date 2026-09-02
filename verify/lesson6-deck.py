# -*- coding: utf-8 -*-
"""
verify/lesson6-deck.py — 6차시(지능적 탐색) 덱 JSON 만들기

■ 흐름 (2026-09-02 선생님이 지시한 순서)

  1부  아무 정보 없는 탐색(너비·깊이 우선) → 비용 정보를 쓰는 탐색(균일 비용)
  2부  **반례** — 균일 비용도 헛걸음을 한다 → 새로운 정보가 필요하다
  3부  휴리스틱값 — 그 새로운 정보가 무엇인가 / **어떻게 추정하는가**(도시·틱택토·8퍼즐)
  4부  A* 알고리즘 — f(n)=g(n)+h(n)
  5부  예시와 활동 — 도시 경로 4단계 · 8퍼즐

⚠ 숫자와 순서는 손으로 적지 않습니다. verify/lesson6.py 가 실제로 돌려 내놓은
   verify/lesson6-facts.json 을 읽어 씁니다. (CLAUDE.md 14·15)

교과서 근거
  30~31쪽 너비 우선·깊이 우선 (4차시에서 다룸 — 여기서는 이름만 되짚음)
  32쪽  균일 비용 탐색 정의 · 누적 비용 · 오픈/닫힌 리스트 · 알고리즘 안내 ①~④ · 도시 지도(그림 Ⅰ-10)
  33쪽  균일 비용 진행
  34쪽  맹목적 탐색의 장단점(표 Ⅰ-1) · 상태 공간의 크기 · 탐색 방법의 평가 기준 ·
        순회 외판원 문제(AI 이야기) · 지능적 탐색 정의
  35쪽  휴리스틱·휴리스틱값 정의 · 직선거리 휴리스틱(그림 Ⅰ-11) · 틱택토 휴리스틱 함수(그림 Ⅰ-12)
  36쪽  A* 정의 · f(n)=g(n)+h(n)(그림 Ⅰ-13) · 도시 A* 진행(그림 Ⅰ-14)
  37쪽  활동3 — 8퍼즐을 A* 로 탐색

⚠ **최상 우선 탐색·언덕 오르기는 다루지 않습니다** (2026-08-28 결정).
⚠ A* 진행 지도에는 **모든 도시에 h 값을 적어 둡니다.** 추정치가 안 보이면
   오픈 리스트의 계산이 어디서 나온 값인지 학생이 알 수 없습니다. (2026-09-02 지적)
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


def city_edges():
    return [{'from': u, 'to': v, 'label': str(w)} for u, v, w in CITY_EDGES]


def city_nodes(label=None, color=None, accent=(), dim=()):
    """label(k) 로 각 도시의 글자를 정합니다. 기본은 이름만."""
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


# ── 틱택토 — 이길 수 있는 선 여덟 줄 ─────────────
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

# ═══════════════════════════════════════════════
# 1부 — 지금까지 한 탐색
# ═══════════════════════════════════════════════
add({'type': 'title', 'title': '6. 지능적 탐색',
     'notes': '교과서 32~37쪽. 오늘은 「무엇을 보고 다음에 열어 볼 곳을 고르는가」 하나로 갑니다. '
              '아무것도 안 보던 것 → 지나온 비용을 보던 것 → 남은 거리까지 보는 것 순서입니다.'})

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
     'notes': '4·5차시를 한 장으로 되짚습니다. 앞의 둘은 맹목적 탐색, 세 번째가 지난 시간 것입니다. '
              '「무엇을 보고 고르는가」가 오늘의 축이라는 것을 여기서 심어 주세요.'})

add({'type': 'diagram', 'title': '도시 방문 경로 찾기',
     'nodes': city_nodes(color=START_GOAL), 'edges': city_edges(),
     'foot': '간선의 숫자는 그 길을 지나는 데 **걸리는 시간**',
     'notes': '교과서 32쪽 그림 Ⅰ-10. 지난 시간에 쓴 지도 그대로입니다.'})

add({'type': 'bullets', 'title': '누적 비용',
     'lead': '초기 상태에서 현재 상태까지 오는 경로의 **비용을 모두 더한 값**입니다.',
     'bullets': [
         'a → c 로 가면 — 누적 비용 **4**',
         'a → c → d 로 가면 — 4 + 3 = 누적 비용 **7**',
         'a → c → d → e 로 가면 — 4 + 3 + 5 = 누적 비용 **12**',
     ],
     'note': {'label': '주의', 'text': '방금 지나온 길 하나의 값이 아니라, 출발점부터 **여기까지 더한 값**입니다.'},
     'notes': '교과서 32쪽 여백. 마지막 간선 값만 보는 실수가 잦습니다.'})

add({'type': 'steps', 'title': '균일 비용 탐색이 고르는 법',
     'steps': [
         {'n': '①', 'label': '초기 상태가 목표 상태이면', 'desc': '거기서 마친다'},
         {'n': '②', 'label': '자식 상태를 만든다', 'desc': '갈 수 있는 간선을 따라 만들어 오픈 리스트에 넣는다'},
         {'n': '③', 'label': '누적 비용이 가장 작은 것', 'desc': '오픈 리스트에서 그것을 골라 테스트한다'},
         {'n': '④', 'label': '목표인지 테스트한다', 'desc': '맞으면 끝. 아니면 자식을 만들어 넣고 ③으로'},
     ],
     'foot': '오늘 바뀌는 곳은 **③ 하나뿐**입니다',
     'notes': '교과서 32쪽 안내. ③ 을 손으로 짚어 주세요. A* 는 여기만 바뀝니다.'})

add({'type': 'cards', 'title': '지난 시간 결과',
     'ask': '균일 비용 탐색은 **어떤 순서로** 테스트했나요?',
     'cards': [
         {'label': '테스트한 순서', 'text': ' – '.join(UNI['order']),
          'desc': '테스트한 상태 %d개' % UNI['tested']},
         {'label': '찾은 경로', 'text': ' → '.join(UNI['path']), 'desc': '비용 %d' % UNI['cost']},
     ],
     'notes': '검산값입니다. 순서에서 **세 번째가 b** 라는 것을 짚어 두세요 — 바로 다음 장의 이야기입니다.'})

# ═══════════════════════════════════════════════
# 2부 — 반례 : 무엇이 부족한가
# ═══════════════════════════════════════════════
add({'type': 'diagram', 'title': 'b 는 왜 열어 봤을까',
     'nodes': city_nodes(color=START_GOAL, accent=('b',)),
     'edges': city_edges(),
     'side': [
         {'label': '오픈 리스트에 있던 값', 'big': True, 'text': 'c : 4\nb : 5'},
         {'label': '그래서', 'text': 'c 다음으로 **b 가 싸다** — 규칙대로 b 를 열었다'},
     ],
     'foot': '그런데 b 는 목적지 e 에서 **가장 먼** 도시입니다',
     'notes': '균일 비용 탐색의 테스트 순서는 a–c–b–d–e 였습니다. '
              '세 번째로 b 를 열었는데, b 를 지나는 길은 최종 답에 들어가지 않았습니다. 헛걸음입니다.'})

add({'type': 'diagram', 'title': '지금까지 든 비용만 보면',
     'nodes': city_nodes(label=lambda k: k if k == 'e' else '%s\n남은 거리 ?' % k,
                         color=START_GOAL),
     'edges': [{'from': k, 'to': 'e', 'label': '?', 'dim': True} for k in ('a', 'b', 'c', 'd')],
     'foot': '**앞으로 얼마나 남았는지**를 모른 채 고르고 있었다',
     'notes': '핵심 장면입니다. 지나온 값은 정확히 알지만 남은 거리는 전혀 모릅니다. '
              '그래서 목적지에서 멀어지는 쪽도 싸기만 하면 열어 봅니다.'})

add({'type': 'bullets', 'title': '헛걸음이 문제가 되는 까닭',
     'lead': '도시 다섯 곳이면 한 번 헛걸음해도 티가 나지 않습니다. **문제가 커지면 다릅니다.**',
     'bullets': [
         '8퍼즐의 상태는 9! = **%s**가지' % comma(SPACE['p8']),
         '15퍼즐은 15! = **%s**가지' % comma(SPACE['p15']),
         '바둑은 3³⁶¹ ≈ 10³⁶⁰ — 우주에 있는 분자의 개수가 10⁸⁰',
     ],
     'notes': '교과서 34쪽 여백. 헛걸음 한 번이 문제가 아니라, 헛걸음의 비율이 문제입니다.'})

add({'type': 'bars', 'title': '순회 외판원 문제',
     'items': [{'label': '도시 4곳', 'value': 24, 'show': '%s가지' % comma(TSP['4'])},
               {'label': '도시 5곳', 'value': 120, 'show': '%s가지' % comma(TSP['5'])},
               {'label': '도시 10곳', 'value': 3628800, 'show': '%s가지' % comma(TSP['10']),
                'accent': True}],
     'foot': '도시가 하나 늘 때마다 경로의 수가 **몇 배로** 늘어난다',
     'notes': '교과서 34쪽 AI 이야기. 모든 도시를 한 번씩 방문하고 돌아오는 가장 짧은 경로 찾기입니다. '
              '20곳이면 약 243경 가지 — 1초에 1억 개씩 세어도 770년입니다.'})

add({'type': 'diagram', 'title': '맹목적 탐색의 장단점',
     'nodes': BT_NODES, 'edges': BT_EDGES,
     'nodeH': 0.42, 'nodeW': 0.34, 'nodeMinW': 0.28,
     'foot': '파란 노드가 **시작** · 빨간 노드가 **목표**',
     'side': [
         {'label': '좋은 점', 'text': '목표 상태를 언젠가 찾는다는 것이 보장된다', 'accent': True},
         {'label': '좋은 점', 'text': '목표가 여러 개일 때 너비 우선 탐색은 경로가 가장 짧은 목표를 찾아 준다'},
         {'label': '나쁜 점', 'text': '상태 수가 많을수록 탐색 시간이 늘어난다'},
     ],
     'notes': '교과서 34쪽 표 Ⅰ-1. 노드 40개짜리 트리입니다. 목표를 만날 때까지 하나씩 다 테스트합니다.'})

add({'type': 'cards', 'title': '탐색 방법의 평가 기준',
     'cards': [
         {'label': '완전성', 'text': '목표가 있다면 **언젠가는 찾는다**'},
         {'label': '최적성', 'text': '목표가 여러 개면 **가장 좋은 것**을 찾는다'},
         {'label': '시간 복잡도', 'text': '**현실적인 시간** 안에 찾아야 한다'},
     ],
     'foot': '지금까지 배운 탐색은 앞의 둘은 갖췄지만 **세 번째에서 막힌다**',
     'notes': '교과서 34쪽 여백. 그래서 헛걸음을 줄일 새로운 정보가 필요합니다.'})

add({'type': 'cards', 'title': '필요한 것',
     'cards': [
         {'def': True, 'wide': True, 'label': '지금 쓰는 정보',
          'text': '초기 상태에서 여기까지 **이미 든 비용** — 정확히 안다'},
         {'def': True, 'wide': True, 'label': '더 있어야 하는 정보',
          'text': '여기서 목표까지 **앞으로 들 비용** — 가 보기 전에는 알 수 없다'},
     ],
     'foot': '정확히 알 수 없다면, **어림이라도** 해 보면 어떨까',
     'notes': '2부의 결론이자 3부로 넘어가는 다리입니다. '
              '"정확한 값은 못 구한다. 대신 추정한다" 가 오늘의 핵심 전환입니다.'})

# ═══════════════════════════════════════════════
# 3부 — 휴리스틱값 : 어떻게 추정하는가
# ═══════════════════════════════════════════════
add({'type': 'cards', 'title': '지능적 탐색',
     'cards': [
         {'def': True, 'wide': True, 'label': '지능적 탐색',
          'text': '주어진 비용 정보 이외에 **추정된 정보**를 함께 사용하는 탐색'},
     ],
     'notes': '교과서 34쪽 본문. "추정"이 핵심입니다 — 정확한 값이 아니라 어림값입니다.'})

add({'type': 'cards', 'title': '휴리스틱값',
     'cards': [
         {'def': True, 'wide': True, 'label': '휴리스틱',
          'text': '어떤 문제 해결을 위해 알고 있는 **경험적 지식**'},
         {'def': True, 'wide': True, 'label': '휴리스틱값 h(n)',
          'text': '그 상태에서 **목표 상태까지의 예상 비용**을 추정한 값'},
     ],
     'notes': '교과서 35쪽. 경험적 지식이라 사람마다 다르게 정할 수 있습니다. '
              '그러면 무엇으로 추정할지가 다음 문제입니다.'})

add({'type': 'section', 'num': '?', 'title': '어떻게 추정할까',
     'desc': '문제마다 다릅니다. 세 가지를 봅니다 — 도시 · 틱택토 · 8퍼즐',
     'notes': '3부의 중심 질문입니다. 세 사례를 차례로 봅니다.'})

add({'type': 'diagram', 'title': '도시 — 목적지까지의 직선거리',
     'nodes': city_nodes(label=lambda k: '%s\nh=%d' % (k, H[k]), color=START_GOAL),
     'edges': [{'from': k, 'to': 'e', 'label': str(H[k]), 'dim': True} for k in ('a', 'b', 'c', 'd')],
     'side': [
         {'label': '추정한 값 h(n)', 'text': '각 도시에서 목표 도시 e 까지 **곧게 잰 거리**', 'accent': True},
         {'label': '값', 'big': True,
          'text': 'h(a)=%d · h(b)=%d\nh(c)=%d · h(d)=%d · h(e)=%d'
                  % (H['a'], H['b'], H['c'], H['d'], H['e'])},
     ],
     'notes': '교과서 35쪽 그림 Ⅰ-11. 점선은 도로가 아니라 지도 위에서 곧게 잰 거리입니다. '
              'b 의 9 가 가장 큽니다 — 아까 헛걸음한 그 도시입니다.'})

add({'type': 'bullets', 'title': '직선거리를 쓰는 까닭',
     'lead': '직선거리는 **실제로 가야 하는 거리보다 짧거나 같습니다.**',
     'bullets': [
         '도로는 굽어 있으므로 곧게 잰 거리보다 **길 수밖에** 없다',
         '지도만 있으면 **바로 잴 수 있다** — 길을 따라 가 보지 않아도 된다',
         '목표 도시 자신의 값은 **0** 이다 — 더 갈 곳이 없으므로',
     ],
     'note': {'label': '확인', 'text': 'h(c)=7 인데 c 에서 e 까지 실제로 가면 3 + 5 = **8** 입니다.'},
     'notes': '추정값이 실제보다 크면 좋은 길을 놓칠 수 있습니다. 직선거리는 그럴 일이 없습니다.'})

add({'type': 'boards', 'title': '틱택토 — 이길 수 있는 선의 개수', 'arrow': False,
     'items': [{'label': '가로 3줄 · 세로 3줄 · 대각선 2줄 = 모두 8줄',
                'board': [''] * 9, 'grid': True, 'lines': TTT_LINES}],
     'foot': '이 여덟 줄 가운데 **내 돌이 들어간 줄**을 셉니다',
     'notes': '교과서 35쪽 그림 Ⅰ-12. 먼저 판 전체에 몇 줄이 있는지부터 세게 합니다.'})

add({'type': 'boards', 'title': '돌을 놓은 자리에 따라 달라진다', 'arrow': False,
     'items': [
         {'label': '모서리 — h = %d' % TTT['corner'], 'board': ttt_board(0),
          'grid': True, 'lines': ttt_lines(0)},
         {'label': '가운데 — h = %d' % TTT['center'], 'board': ttt_board(4),
          'grid': True, 'lines': ttt_lines(4), 'accent': True},
         {'label': '변 — h = %d' % TTT['edge'], 'board': ttt_board(1),
          'grid': True, 'lines': ttt_lines(1)},
     ],
     'foot': '값이 **클수록** 이길 가능성이 높다 → 가운데를 고른다',
     'notes': '가운데만 대각선 두 줄을 모두 지납니다 — 가로1+세로1+대각선2 = 4. '
              '모서리 3, 변 2. 도시와 달리 여기서는 값이 클수록 좋습니다. '
              '무엇을 추정하느냐에 따라 크고 작음의 방향이 달라진다는 것을 짚어 주세요.'})

add({'type': 'boards', 'title': '8퍼즐 — 제자리에 없는 타일의 수', 'arrow': False,
     'items': [{'label': '지금 상태', 'board': board(PUZ['tree'][0]['child']), 'accent': True},
               {'label': '목표 상태', 'board': board(PUZ['goal'])}],
     'foot': 'h(n) = 목표와 **다른 자리에 있는 타일의 수** (빈칸은 세지 않는다)',
     'notes': '교과서 37쪽 2번의 예와 같은 판입니다. 같은 자리끼리 하나씩 견주면 '
              '3·4·5·6·7 은 제자리, 1·2·8 은 다른 자리라서 h = 3 입니다. '
              '이 값은 잠시 뒤 활동에서 그대로 씁니다.'})

add({'type': 'cards', 'title': '추정값을 고르는 기준',
     'cards': [
         {'def': True, 'wide': True, 'label': '빨리 계산할 수 있어야 한다',
          'text': '추정하는 데 오래 걸리면 탐색을 줄인 보람이 없다'},
         {'def': True, 'wide': True, 'label': '실제 비용을 넘지 않아야 한다',
          'text': '넘게 어림하면 **좋은 길을 놓칠 수 있다**'},
     ],
     'notes': '직선거리·제자리에 없는 타일 수 둘 다 실제 비용을 넘지 않습니다. '
              '이 기준이 왜 필요한지는 다음 단원(A*)에서 값으로 확인됩니다.'})

# ═══════════════════════════════════════════════
# 4부 — A* 알고리즘
# ═══════════════════════════════════════════════
add({'type': 'cards', 'title': 'A* 탐색',
     'cards': [
         {'def': True, 'wide': True, 'label': 'f(n) = g(n) + h(n)',
          'text': 'f 값이 **가장 작은 상태**를 먼저 테스트하는 탐색'},
     ],
     'notes': '교과서 36쪽. 이미 든 비용과 앞으로 들 추정 비용을 **더해서** 봅니다.'})

add({'type': 'vflow', 'title': 'f(n) 은 무엇을 더한 값인가',
     'items': [
         {'label': 'g(n)', 'text': '초기 상태에서 현재 상태까지의 비용 — 이미 쓴 값, 정확히 안다'},
         {'label': 'h(n)', 'text': '현재 상태에서 목표 상태까지 추정한 비용 — 앞으로 쓸 값, 어림한다'},
         {'label': 'f(n)', 'text': '둘을 더한 최종 비용 추정치 — 이 길로 끝까지 가면 얼마쯤 들까'},
     ],
     'notes': '교과서 36쪽 그림 Ⅰ-13. g 는 뒤를 보고 h 는 앞을 봅니다.'})

add({'type': 'table', 'title': '알고리즘의 어디가 바뀌나',
     'head': ['', '균일 비용 탐색', 'A* 탐색'],
     'rows': [['①②④', '같다', '같다'],
              ['③ 고르는 기준', '누적 비용 g 가 가장 작은 것', '**f = g + h** 가 가장 작은 것']],
     'firstCol': 4.5,
     'foot': '지도도 같고 흐름도 같습니다. **③ 한 줄만** 바뀝니다',
     'notes': '앞에서 짚어 둔 ③ 으로 돌아옵니다. 새 알고리즘을 외우는 게 아니라 한 줄이 바뀐 것입니다.'})

# ═══════════════════════════════════════════════
# 5부 — 예시 : 도시 경로를 A* 로
# ═══════════════════════════════════════════════
add({'type': 'section', 'num': '예', 'title': 'A* 로 도시 경로 찾기',
     'desc': '지도의 각 도시에 h 값이 적혀 있습니다. g + h 로 골라 갑니다',
     'notes': '교과서 36쪽 그림 Ⅰ-14 를 네 단계로 나눠 봅니다.'})

for i, st in enumerate(STEPS):
    open_nodes = [o['node'] for o in st['open']]
    # 출발·목표는 흐리게 하지 않습니다 — 늘 보여야 하는 두 곳입니다
    dim = tuple(k for k in CITY_POS
                if k != st['test'] and k not in open_nodes and k not in st['path']
                and k not in START_GOAL)
    nodes = city_nodes(label=lambda k: '%s\nh=%d' % (k, H[k]),
                       color=START_GOAL, accent=(st['test'],), dim=dim)
    open_txt = '\n'.join('%s : %d + %d = %d' % (o['node'], o['g'], o['h'], o['f'])
                         for o in st['open']) or '비어 있음'
    last = (i == len(STEPS) - 1)
    if last:
        foot = '목적지다 → **종료** · 찾은 경로 **%s** · 비용 **%d**' % (' → '.join(CITY['path']), CITY['cost'])
        note = '목적지이므로 여기서 끝납니다. b 는 끝내 한 번도 열리지 않았습니다.'
    elif i == 0:
        foot = '목적지가 아니다 → 자식 b·c 를 만들어 오픈 리스트에 넣는다'
        note = 'b 는 5+9=14, c 는 4+7=11 입니다. 지도의 h 값과 간선 값을 짚어 가며 함께 계산하세요.'
    else:
        nxt = st['open'][0]
        foot = '가장 작은 f 는 **%d** — 다음은 **%s** 를 테스트한다' % (nxt['f'], nxt['node'])
        note = 'b 는 f=14 라 아직 차례가 오지 않습니다. 오픈 리스트에 남아만 있습니다.'
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
     'notes': '교과서 36쪽. 같은 답을 더 적은 테스트로 찾았습니다.'})

add({'type': 'bullets', 'title': '처음의 그 헛걸음은 어떻게 됐나',
     'lead': '**b 를 한 번도 열지 않았습니다.**',
     'bullets': [
         'b 까지 가는 누적 비용은 5 로 c 의 4 와 큰 차이가 없다',
         '그런데 b 에서 목적지까지 **추정한 거리가 9** 라 f = 5 + 9 = **14**',
         'c 쪽은 끝까지 f 가 12 를 넘지 않아 **b 차례가 오지 않는다**',
     ],
     'note': {'label': '정리', 'text': '**앞으로 남은 거리를 어림한 값**을 함께 보았기 때문에 헛걸음이 사라졌습니다.'},
     'notes': '2부에서 던진 질문("b 는 왜 열어 봤을까")에 대한 답입니다. 여기서 매듭을 지어 주세요.'})

# ═══════════════════════════════════════════════
# 활동 — 8퍼즐
# ═══════════════════════════════════════════════
add({'type': 'section', 'num': '활동', 'title': '8퍼즐을 A* 로 탐색하기',
     'desc': '교과서 37쪽 활동3',
     'notes': '도시에서 한 것을 판이 바뀐 문제에 그대로 적용해 봅니다.'})

add({'type': 'boards', 'title': '초기 상태와 목표 상태',
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
     'notes': '교과서 37쪽 3번. 방향이 빈칸 기준이라는 것을 꼭 짚어 주세요.'})

t0 = PUZ['tree'][0]
add({'type': 'bullets', 'title': '8퍼즐에서 g 와 h',
     'lead': '도시에서는 g 가 걸린 시간이었습니다. 8퍼즐에서 g 는 **옮긴 횟수**입니다.',
     'bullets': [
         '초기 상태에서 한 번 옮겼으므로 **g = %d**' % t0['g'],
         '그 판에서 제자리에 없는 타일이 %d개이므로 **h = %d**' % (t0['h'], t0['h']),
         '따라서 **f = %d + %d = %d**' % (t0['g'], t0['h'], t0['f']),
     ],
     'note': {'label': '같은 점', 'text': '문제가 달라져도 **f = g + h 로 고르는 것**은 그대로입니다.'},
     'notes': 'h 세는 법은 3부에서 이미 봤습니다. 여기서는 g 가 무엇인지만 새로 정합니다.'})

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
     'notes': '검산값입니다. 9! = %s 가지 중에서 %d개만 테스트했습니다.'
              % (comma(SPACE['p8']), PUZ['expanded'])})

add({'type': 'summary', 'title': '오늘 정리',
     'items': [
         '아무 정보 없이 — 너비 우선 · 깊이 우선 탐색',
         '지나온 비용을 보고 — 균일 비용 탐색 (그런데 헛걸음을 한다)',
         '남은 비용을 어림해서 — 휴리스틱값 h(n)',
         '둘을 더해서 고른다 — A* 탐색, f(n) = g(n) + h(n)',
     ],
     'foot': '같은 경로를 균일 비용 %d개 대신 **%d개**의 테스트로 찾았다'
             % (UNI['tested'], CITY['tested']),
     'notes': '오늘 흐름을 그대로 되짚습니다. 다음 시간은 지식의 표현과 추론입니다.'})

deck = {
    'title': '6. 지능적 탐색',
    'kicker': '인공지능 기초 · 1-1-2',
    'out': os.path.join(ROOT, 'tools', 'samples', '인공지능기초_6차시_지능적탐색.pptx'),
    'slides': S,
}
p = os.path.join(ROOT, 'tools', 'samples', 'lesson6-smart.deck.json')
io.open(p, 'w', encoding='utf-8').write(json.dumps(deck, ensure_ascii=False, indent=2))
print('slides', len(S), '->', p)
