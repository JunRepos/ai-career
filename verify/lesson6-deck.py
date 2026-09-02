# -*- coding: utf-8 -*-
"""
verify/lesson6-deck.py — 6차시(지능적 탐색) 덱 JSON 만들기

⚠ 숫자와 순서는 손으로 적지 않습니다. verify/lesson6.py 가 실제로 돌려서 내놓은
   verify/lesson6-facts.json 을 읽어 씁니다. (CLAUDE.md 14·15)

근거
  · 교과서 34쪽  맹목적 탐색의 장단점 · 상태 공간의 크기 · 탐색 방법의 평가 기준 · 지능적 탐색 정의
  · 교과서 35쪽  휴리스틱값 정의 · 도시 직선거리(그림 Ⅰ-11) · 틱택토 휴리스틱 함수(그림 Ⅰ-12)
  · 교과서 36쪽  A* 정의 · f(n)=g(n)+h(n)(그림 Ⅰ-13) · 도시 A* 진행(그림 Ⅰ-14)
  · 교과서 37쪽  활동3 — 8퍼즐을 A* 로 탐색
  · 선생님 지시(2026-08-28)  장단점·상태 공간·다 훑을 수 없다면 세 장을 정의 앞에 세트로,
                              장단점 장 오른쪽에 아주 큰 탐색 트리(시작 파랑·목표 빨강)
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
F = json.load(io.open(os.path.join(HERE, 'lesson6-facts.json'), encoding='utf-8'))

CITY, PUZ, TTT = F['city'], F['puzzle'], F['ttt']


def board(state):
    """[2,8,3,...] → ["2","8","3",...] (0 은 빈칸)"""
    return ['' if v == 0 else str(v) for v in state]


# ────────────────────────────────────────────────
# 큰 탐색 트리 — 노드 40개 (가지 3 · 깊이 3)
# 자리를 손으로 주려고 diagram 을 씁니다. 시작 파랑 · 목표 빨강.
# ────────────────────────────────────────────────
def big_tree():
    nodes, edges = [], []
    levels = [[0]]                      # 노드 번호
    nid = 1
    for d in range(1, 4):
        cur = []
        for p in levels[-1]:
            for _ in range(3):
                cur.append(nid)
                edges.append({'from': 'n%d' % p, 'to': 'n%d' % nid})
                nid += 1
        levels.append(cur)
    ys = [6, 33, 62, 92]
    for d, lv in enumerate(levels):
        n = len(lv)
        for i, k in enumerate(lv):
            x = 3 + (94.0 * (i + 0.5) / n)
            node = {'id': 'n%d' % k, 'label': '', 'x': round(x, 2), 'y': ys[d]}
            if k == 0:
                node['color'] = 'blue'          # 시작
            if k == levels[-1][-5]:
                node['color'] = 'red'           # 목표
            nodes.append(node)
    return nodes, edges


BT_NODES, BT_EDGES = big_tree()

# ────────────────────────────────────────────────
# 도시 지도 — 자리는 교과서 그림 Ⅰ-10·Ⅰ-11 배치를 따릅니다
# ────────────────────────────────────────────────
CITY_POS = {'a': (8, 52), 'b': (36, 10), 'c': (30, 92), 'd': (74, 76), 'e': (92, 40)}


def city_nodes(show_h=False, accent=(), color=None):
    out = []
    for k, (x, y) in CITY_POS.items():
        lab = k if not show_h else '%s\nh=%d' % (k, CITY['h'][k])
        n = {'id': k, 'label': lab, 'x': x, 'y': y}
        if k in accent: n['accent'] = True
        if color and k in color: n['color'] = color[k]
        out.append(n)
    return out


CITY_EDGE_LIST = [('a', 'b', 5), ('a', 'c', 4), ('b', 'c', 5),
                  ('b', 'd', 8), ('b', 'e', 9), ('c', 'd', 3), ('d', 'e', 5)]


def city_edges():
    return [{'from': u, 'to': v, 'label': str(w)} for u, v, w in CITY_EDGE_LIST]


# ────────────────────────────────────────────────
S = []
add = S.append

add({'type': 'title', 'title': '6. 지능적 탐색',
     'notes': '교과서 34~37쪽. 지난 시간 균일 비용 탐색에서 쓴 도시 지도를 그대로 이어서 씁니다.'})

add({'type': 'quiz', 'title': '지난 시간 확인',
     'items': [
         {'text': '비용이 다를 때, 무엇이 가장 작은 것을 먼저 테스트했나요?'},
         {'text': '누적 비용이란 무엇인가요?'},
         {'text': 'a 에서 e 까지 찾은 경로와 비용은?'},
     ],
     'notes': '답 — 누적 비용 / 초기 상태에서 그 상태까지 든 비용의 합 / a → c → d → e · 12'})

# ── 세트 ① 맹목적 탐색의 장단점 (오른쪽에 큰 트리) ──
add({'type': 'diagram', 'title': '맹목적 탐색의 장단점',
     'nodes': BT_NODES, 'edges': BT_EDGES,
     'nodeH': 0.42, 'nodeW': 0.34, 'nodeMinW': 0.28,
     'foot': '파란 노드가 **시작** · 빨간 노드가 **목표**',
     'side': [
         {'label': '좋은 점', 'text': '목표 상태를 언젠가 찾는다는 것이 보장된다', 'accent': True},
         {'label': '좋은 점', 'text': '목표가 여러 개일 때 너비 우선 탐색은 경로가 가장 짧은 목표를 찾아 준다'},
         {'label': '나쁜 점', 'text': '상태 수가 많을수록 탐색 시간이 늘어난다'},
     ],
     'notes': '교과서 34쪽 표 Ⅰ-1. 왼쪽 트리는 노드 40개짜리 예시입니다. '
              '파란 노드가 시작, 빨간 노드가 목표 — 맹목적 탐색은 목표를 만날 때까지 하나씩 다 테스트합니다.'})

add({'type': 'cards', 'title': '상태 공간의 크기', 'num': '01',
     'cards': [
         {'label': '8퍼즐', 'text': '9! = 362,880'},
         {'label': '15퍼즐', 'text': '15! = 1,307,674,368,000', 'small': True},
         {'label': '24퍼즐', 'text': '6.2 × 10²³'},
         {'label': '바둑', 'text': '3³⁶¹ ≈ 10³⁶⁰', 'desc': '우주에 있는 분자의 개수는 10⁸⁰'},
     ],
     'notes': '교과서 34쪽 여백. 24퍼즐만 해도 아보가드로 수 정도, 바둑은 우주 분자 수를 훌쩍 넘습니다.'})

add({'type': 'cards', 'title': '탐색 방법의 평가 기준', 'num': '02',
     'cards': [
         {'label': '완전성', 'text': '목표가 있다면 **언젠가는 찾는다**'},
         {'label': '최적성', 'text': '목표가 여러 개면 **가장 좋은 것**을 찾는다'},
         {'label': '시간 복잡도', 'text': '**현실적인 시간** 안에 찾아야 한다'},
     ],
     'notes': '교과서 34쪽 여백. 맹목적 탐색은 완전성·최적성은 갖췄지만 시간 복잡도에서 막힙니다. '
              '그래서 다음 이야기가 지능적 탐색입니다.'})

# ── 지능적 탐색 정의 ──
add({'type': 'cards', 'title': '지능적 탐색', 'num': '03',
     'cards': [
         {'def': True, 'wide': True, 'label': '지능적 탐색',
          'text': '주어진 비용 정보 이외에 **추정된 정보**를 함께 사용하는 탐색'},
     ],
     'notes': '교과서 34쪽 본문. 알고 있는 경험적 지식을 평갓값으로 추정해 탐색에 씁니다.'})

add({'type': 'cards', 'title': '휴리스틱값', 'num': '04',
     'cards': [
         {'def': True, 'wide': True, 'label': '휴리스틱',
          'text': '어떤 문제 해결을 위해 알고 있는 **경험적 지식**'},
         {'def': True, 'wide': True, 'label': '휴리스틱값',
          'text': '그 상태에서 **목표 상태까지의 예상 비용**을 추정한 값'},
     ],
     'notes': '교과서 35쪽. 휴리스틱값은 경험적 지식이므로 사람마다 다르게 정의할 수 있습니다.'})

# ── 도시 지도 — 실제 비용 ──
add({'type': 'diagram', 'title': '도시 방문 경로 — 실제 비용',
     'nodes': city_nodes(color={'a': 'blue', 'e': 'red'}),
     'edges': city_edges(),
     'foot': '지난 시간에 쓴 지도 그대로입니다',
     'notes': '교과서 32쪽 그림 Ⅰ-10. 파란 a 가 출발, 빨간 e 가 목적지입니다.'})

# ── 도시 지도 — 직선거리 휴리스틱 ──
add({'type': 'diagram', 'title': '직선거리를 휴리스틱값으로',
     'nodes': city_nodes(show_h=True, color={'a': 'blue', 'e': 'red'}),
     'edges': [{'from': k, 'to': 'e', 'label': str(CITY['h'][k]), 'dim': True}
               for k in ('a', 'b', 'c', 'd')],
     'side': [
         {'label': '휴리스틱값 h(n)', 'text': '각 도시에서 목표 도시 e 까지의 **직선거리**', 'accent': True},
         {'label': '값', 'big': True,
          'text': 'h(a)=%d · h(b)=%d\nh(c)=%d · h(d)=%d · h(e)=%d'
                  % (CITY['h']['a'], CITY['h']['b'], CITY['h']['c'], CITY['h']['d'], CITY['h']['e'])},
     ],
     'notes': '교과서 35쪽 그림 Ⅰ-11. 실제 도로를 따라간 거리가 아니라 곧게 잰 거리라서 '
              '실제 비용보다 작거나 같습니다. 목표 자신의 휴리스틱값은 0 입니다.'})

# ── 틱택토 휴리스틱 ──
add({'type': 'boards', 'title': '틱택토에서의 휴리스틱 함수',
     'arrow': False,
     'items': [
         {'label': 'h = %d' % TTT['corner'], 'board': ['○', '', '', '', '', '', '', '', '']},
         {'label': 'h = %d' % TTT['center'], 'board': ['', '', '', '', '○', '', '', '', ''], 'accent': True},
         {'label': 'h = %d' % TTT['edge'], 'board': ['', '○', '', '', '', '', '', '', '']},
     ],
     'foot': 'h(n) = 그 돌을 포함해 **이길 수 있는 선의 개수**',
     'notes': '교과서 35쪽 그림 Ⅰ-12. 가로 3 · 세로 3 · 대각선 2, 모두 여덟 줄 중에서 셉니다. '
              '가운데가 4로 가장 크므로 가운데를 먼저 고르게 됩니다.'})

# ── A* 정의 ──
add({'type': 'cards', 'title': 'A* 탐색', 'num': '05',
     'cards': [
         {'def': True, 'wide': True, 'label': 'f(n) = g(n) + h(n)',
          'text': '초기 상태에서 현재 상태까지의 **비용** + 목표 상태까지의 **추정 비용**'},
         {'label': 'g(n)', 'text': '초기 상태에서 현재 상태까지의 비용'},
         {'label': 'h(n)', 'text': '현재 상태에서 목표 상태까지 추정한 비용'},
     ],
     'notes': '교과서 36쪽 그림 Ⅰ-13. f 값이 가장 작은 상태를 먼저 테스트합니다.'})

# ⚠ 교과서 36쪽 여백에는 '탐욕적 최상 우선 탐색' 도 함께 나오지만 **다루지 않기로 했습니다**
#    (2026-08-28 결정 · docs/course-map.md 4절). 휴리스틱값 → A* 로 곧장 잇습니다.

add({'type': 'table', 'title': '지난 시간과 무엇이 달라졌나',
     'head': ['쓰는 값', '탐색 이름'],
     'rows': [['g(n) — 지금까지 든 비용만', '균일 비용 탐색'],
              ['f(n) = g(n) + h(n)', 'A* 탐색']],
     'firstCol': 8.0,
     'notes': '지난 시간에 한 균일 비용 탐색이 첫 줄입니다. '
              '거기에 목표까지의 추정값 h 를 더한 것이 A* 입니다.'})

# ── A* 시연 — 검산한 값 그대로 ──
steps = CITY['steps']
fp = CITY['f_printed']
add({'type': 'diagram', 'title': 'A* 로 도시 경로 찾기 — 첫 갈림',
     'nodes': [{'id': 'a', 'label': 'a', 'x': 50, 'y': 10, 'color': 'blue'},
               {'id': 'b', 'label': 'b\n5+9=%d' % fp['b'], 'x': 24, 'y': 62},
               {'id': 'c', 'label': 'c\n4+7=%d' % fp['c'], 'x': 74, 'y': 62, 'accent': True}],
     'edges': [{'from': 'a', 'to': 'b', 'label': '5'}, {'from': 'a', 'to': 'c', 'label': '4'}],
     'foot': 'f 값이 14 보다 %d 이 작으므로 **c** 를 선택한다' % fp['c'],
     'notes': '교과서 36쪽 그림 Ⅰ-14. a 를 테스트했지만 목적지가 아니므로 자식 b·c 의 f 값을 견줍니다.'})

add({'type': 'diagram', 'title': 'A* 로 도시 경로 찾기 — 끝까지',
     'nodes': [{'id': 'a', 'label': 'a', 'x': 50, 'y': 6, 'color': 'blue'},
               {'id': 'b', 'label': 'b\n5+9=%d' % fp['b'], 'x': 20, 'y': 36},
               {'id': 'c', 'label': 'c\n4+7=%d' % fp['c'], 'x': 62, 'y': 36},
               {'id': 'd', 'label': 'd\n(4+3)+5=%d' % fp['d'], 'x': 62, 'y': 66},
               {'id': 'e', 'label': 'e\n(4+3+5)+0=%d' % fp['e'], 'x': 62, 'y': 94, 'color': 'red'}],
     'edges': [{'from': 'a', 'to': 'b', 'label': '5'}, {'from': 'a', 'to': 'c', 'label': '4'},
               {'from': 'c', 'to': 'd', 'label': '3'}, {'from': 'd', 'to': 'e', 'label': '5'}],
     'foot': '찾은 경로 **%s** · 비용 **%d**' % (' → '.join(CITY['path']), CITY['cost']),
     'notes': 'd 를 테스트(12<14), e 를 테스트(12<14) 하고 목적지이므로 종료합니다.'})

add({'type': 'cards', 'title': '테스트한 상태의 수', 'num': '06',
     'ask': '균일 비용 탐색과 A* 탐색은 **몇 개의 상태를 테스트**했나요?',
     'cards': [
         {'label': '균일 비용 탐색', 'text': '%d개' % CITY['uniform_tested'], 'desc': 'a – c – b – d – e'},
         {'label': 'A* 탐색', 'text': '%d개' % CITY['tested'], 'accent': True,
          'desc': ' – '.join(s['test'] for s in steps)},
     ],
     'foot': '찾은 경로와 비용은 **똑같습니다**',
     'notes': '교과서 36쪽. 같은 답을 더 적은 테스트로 찾았습니다. 이것이 휴리스틱값을 쓰는 이유입니다.'})

# ── 활동 — 8퍼즐 A* ──
add({'type': 'boards', 'title': '활동 — 8퍼즐을 A* 로 탐색하기',
     'items': [{'label': '초기 상태', 'board': board(PUZ['start']), 'accent': True},
               {'label': '목표 상태', 'board': board(PUZ['goal'])}],
     'foot': 'h(n) = 목표 상태와 **다른 자리에 있는 타일의 수** (빈칸 제외)',
     'notes': '교과서 37쪽 활동3. 빈칸을 옮기는 순서는 위쪽·아래쪽·왼쪽·오른쪽입니다.'})

d1 = [t for t in PUZ['tree'] if t['depth'] == 1]
add({'type': 'tree', 'title': '깊이 1 — 어디를 먼저 테스트할까',
     'nodes': [{'id': 'r', 'label': '초기 상태', 'board': board(PUZ['start']), 'accent': True}] +
              [{'id': 'c%d' % i, 'parent': 'r',
                'label': '%s · f = %d = %d+%d' % (t['dir'], t['f'], t['g'], t['h']),
                'board': board(t['child'])} for i, t in enumerate(d1)],
     'foot': 'f 값이 가장 작은 **%d** 을 먼저 테스트한다' % min(t['f'] for t in d1),
     'notes': '활동 시작! (15분 동안 진행) — 학생들은 교과서 37쪽의 빈 판을 채웁니다. '
              '검산 결과 깊이 1 의 f 값은 ' +
              ' · '.join('%s %d' % (t['dir'], t['f']) for t in d1) + ' 입니다.'})

add({'type': 'cards', 'title': '활동 정리', 'num': '07',
     'ask': 'A* 로 8퍼즐을 풀면 **몇 수**에 닿나요?',
     'cards': [
         {'label': '빈칸이 간 순서', 'text': ' → '.join(PUZ['solution']),
          'wide': True, 'accent': True, 'small': True,
          'desc': '%d수 · 테스트한 상태 %d개' % (PUZ['moves'], PUZ['expanded'])},
     ],
     'notes': '검산값입니다(verify/lesson6.py). 교과서 37쪽 트리의 마지막 f 값 5=5+0 과 같습니다.'})

add({'type': 'summary', 'title': '오늘 정리',
     'items': [
         '맹목적 탐색은 상태 수가 많아지면 시간이 감당이 안 된다',
         '휴리스틱값 — 그 상태에서 목표까지의 예상 비용을 추정한 값',
         'A* 탐색 — f(n) = g(n) + h(n) 이 가장 작은 상태를 먼저 테스트한다',
         '같은 경로를 균일 비용 %d개 대신 %d개의 테스트로 찾았다' % (CITY['uniform_tested'], CITY['tested']),
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
