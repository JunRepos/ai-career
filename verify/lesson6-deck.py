# -*- coding: utf-8 -*-
"""덱 JSON 생성 — 시연 장의 순서·리스트는 lesson6.py 의 알고리즘을 실제로 돌려서 채웁니다."""
import io, sys, json, importlib.util
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

spec = importlib.util.spec_from_file_location('L6', 'verify/lesson6.py')
L6 = importlib.util.module_from_spec(spec); spec.loader.exec_module(L6)
H, ADJ, GOAL = L6.H, L6.ADJ, L6.GOAL

# 자리는 verify/lesson6-check.mjs 로 겹침·간선 스침을 검사한 값입니다
MOUNT = {'T': (100, 4), 'G': (80, 26), 'C': (20, 36), 'A': (40, 56), 'B': (80, 66),
         'H': (100, 74), 'E': (20, 80), 'F': (0, 86), 'D': (40, 92), 'S': (60, 98)}
M_EDGES = [('S', 'A'), ('S', 'B'), ('A', 'C'), ('A', 'D'), ('C', 'E'), ('C', 'F'),
           ('B', 'G'), ('B', 'H'), ('G', 'T')]


def mount(accent=(), dim=()):
    ns = []
    for k, (x, y) in MOUNT.items():
        n = {'id': k, 'x': x, 'y': y, 'label': '%s %d' % (k, H[k])}
        if k in accent:
            n['accent'] = True
        if k in dim:
            n['dim'] = True
        ns.append(n)
    return ns


def m_edges(dim=()):
    out = []
    for a, b in M_EDGES:
        e = {'from': a, 'to': b}
        if a in dim and b in dim:
            e['dim'] = True
        out.append(e)
    return out


def lst(names):
    return ' · '.join('%s %d' % (n, H[n]) for n in names) if names else '비어 있음'


S = []

# ── 표지 · 전시 학습 ──────────────────────────────────────
S.append({'type': 'title', 'title': '지능적 탐색',
          'notes': '지난 시간 맹목적 탐색을 게임으로 한 번 굴려 보고, 왜 정보가 필요한지로 넘어갑니다.'})

S.append({'type': 'cards', 'title': '지난 시간에 배운 것', 'cards': [
    {'label': '맹목적 탐색', 'accent': True, 'small': True,
     'text': '목표가 어디 있는지 알려 주는 정보 없이 정해진 순서대로 테스트',
     'desc': '무정보 탐색이라고도 합니다'},
    {'label': '너비 우선 탐색(BFS)', 'small': True, 'text': '층별로, 왼쪽에서 오른쪽으로',
     'pills': ['a – b – c – d – e – f']},
    {'label': '깊이 우선 탐색(DFS)', 'small': True, 'text': '한 갈래를 끝까지, 막히면 되돌아온다',
     'pills': ['a – b – d – e – c – f']},
]})

# ── 01 지능적 탐색 ────────────────────────────────────────
S.append({'type': 'section', 'num': '01', 'title': '지능적 탐색'})

S.append({'type': 'cards', 'title': '맹목적 탐색의 장단점', 'cards': [
    {'wide': True, 'label': '좋은 점', 'small': True,
     'text': '목표 상태를 **언젠가 찾는다는 것이 보장**된다',
     'desc': '목표가 여러 개일 때 너비 우선 탐색은 경로가 가장 짧은 목표를 찾아 준다'},
    {'wide': True, 'label': '나쁜 점', 'accent': True, 'small': True,
     'text': '**상태 수가 많을수록 탐색 시간이 늘어난다**',
     'desc': '8 퍼즐 한 판에서 나올 수 있는 배치만 해도 36만 가지가 넘는다'},
], 'notes': '교과서 34쪽 표 Ⅰ-1 입니다.'})

S.append({'type': 'table', 'title': '상태 공간의 크기',
          'head': ['문제', '상태 공간의 크기'], 'firstCol': 5.0,
          'rows': [['8 퍼즐', '9! = 362,880'],
                   ['15 퍼즐', '15! = 1,307,674,368,000'],
                   ['24 퍼즐', '6.2 × 10²³'],
                   ['바둑', '3³⁶¹ ~ 10³⁶⁰']],
          'foot': '우주에 있는 분자의 개수가 10⁸⁰',
          'notes': '1초에 10억 개를 테스트해도 바둑은 끝나지 않는다는 감각을 주고 넘어갑니다.'})

S.append({'type': 'quote', 'small': True, 'text': '다 훑을 수 없다면, 무엇을 해야 할까요?',
          'notes': '답 — 어느 쪽이 목표에 가까운지 짐작해서 그쪽부터 본다.'})

S.append({'type': 'cards', 'title': '지능적 탐색',
          'ask': '다 훑을 수 없다면, 무엇을 해야 할까요?',
          'cards': [
              {'wide': True, 'label': '지능적 탐색', 'accent': True, 'small': True,
               'text': '주어진 정보 외에도 문제에 대해 알고 있는 경험적 지식을 **평갓값으로 추정**하여 탐색에 사용하는 것'},
          ], 'notes': '교과서 34쪽 정의 그대로입니다.'})

S.append({'type': 'table', 'title': '무엇을 보고 고르는가',
          'head': ['', '맹목적 탐색', '지능적 탐색'], 'firstCol': 4.4,
          'rows': [['쓰는 정보', '문제에 **사전에 주어진 정보**만', '거기에 **목표까지의 추정값**을 더한다'],
                   ['고르는 기준', '정해진 **규칙** (층별로 / 한 갈래씩)', '**평갓값이 좋은 쪽**'],
                   ['미로로 치면', '오른쪽 벽을 잡고 돈다', '출구 쪽에 가까워 보이는 길로 간다']]})

# ── 02 휴리스틱값 ─────────────────────────────────────────
S.append({'type': 'section', 'num': '02', 'title': '휴리스틱값'})

S.append({'type': 'cards', 'title': '휴리스틱값', 'cards': [
    {'wide': True, 'label': '휴리스틱 (heuristics)', 'accent': True, 'small': True,
     'text': '어떤 문제 해결을 위해 알고 있는 **경험적 지식**'},
    {'wide': True, 'label': '휴리스틱값', 'accent': True, 'small': True,
     'text': '탐색할 상태를 선택할 때 **목표 상태까지의 예상 비용을 추정한 값**',
     'desc': '휴리스틱값을 쓰는 탐색 기법을 휴리스틱 탐색이라고 합니다'},
], 'notes': '교과서 35쪽. 경험적 지식이므로 사람마다 다르게 정의할 수 있다는 말을 덧붙입니다.'})

CITY = {'a': (0, 50), 'b': (26, 8), 'c': (26, 88), 'd': (62, 48), 'e': (98, 20)}
C_EDGES = [('a', 'b', 5), ('a', 'c', 4), ('b', 'c', 5), ('b', 'd', 8),
           ('b', 'e', 9), ('c', 'd', 3), ('d', 'e', 5)]
C_H = {'a': 12, 'b': 9, 'c': 7, 'd': 5, 'e': 0}

S.append({'type': 'diagram', 'title': '도시 방문 경로 찾기',
          'nodes': [dict({'id': k, 'x': x, 'y': y, 'label': k},
                         **({'accent': True} if k in ('a', 'e') else {}))
                    for k, (x, y) in CITY.items()],
          'edges': [{'from': a, 'to': b, 'label': str(w)} for a, b, w in C_EDGES],
          'foot': '출발 **a** → 목적지 **e** · 선 위의 숫자는 그 도로를 지나는 데 걸리는 **시간**',
          'notes': '교과서 32쪽 그림 Ⅰ-10 입니다. 도로를 따라 실제로 얼마나 걸리는지는 가 봐야 압니다.'})

S.append({'type': 'diagram', 'title': '각 도시에서 목적지까지의 직선거리',
          'nodes': [dict({'id': k, 'x': x, 'y': y, 'label': '%s  %d' % (k, C_H[k])},
                         **({'accent': True} if k in ('a', 'e') else {}))
                    for k, (x, y) in CITY.items()],
          'edges': [{'from': a, 'to': b} for a, b, w in C_EDGES],
          'foot': '도시 안의 숫자 = **e 까지의 직선거리** — 지도에서 자로 재면 바로 나오는 **추정값**',
          'notes': '교과서 35쪽 그림 Ⅰ-11. 직선거리는 실제 도로 거리가 아니라는 점을 짚습니다.'})

S.append({'type': 'table', 'title': '직선거리를 휴리스틱값으로',
          'ask': 'a 와 c 중 어느 쪽이 목적지 e 에 가까워 보이나요?',
          'head': ['도시', 'a', 'b', 'c', 'd', 'e'], 'firstCol': 4.6,
          'rows': [['e 까지의 직선거리', '12', '9', '7', '5', '0']],
          'foot': '거리가 기준이면 **작을수록 좋은 값**'})

S.append({'type': 'bullets', 'title': '틱택토에서의 휴리스틱 함수',
          'lead': '**h(n) = 그 자리에 돌을 놓았을 때, 그 돌을 포함해 이길 수 있는 선의 개수**',
          'bullets': ['가운데 — h(n) = 4 · 가로 · 세로 · 대각선 둘',
                      '모서리 — h(n) = 3 · 가로 · 세로 · 대각선 하나',
                      '변 — h(n) = 2 · 가로 · 세로'],
          'note': {'label': '그래서',
                   'text': '가장 좋은 휴리스틱값을 가진 **가운데**를 고르면 이길 가능성이 높다'},
          'notes': '교과서 35쪽 그림 Ⅰ-12 입니다.'})

S.append({'type': 'cards', 'title': '무엇이 좋은 값인가', 'cards': [
    {'label': '작을수록 좋은 값', 'accent': True, 'small': True, 'text': '목적지까지 남은 거리',
     'desc': '목표까지 얼마나 **남았는지**를 재는 값. 0 이면 목표에 도착한 것'},
    {'label': '클수록 좋은 값', 'accent': True, 'small': True, 'text': '이길 수 있는 선의 개수',
     'desc': '목표에 얼마나 **가까운지**를 재는 값. 클수록 좋은 자리'},
    {'wide': True, 'small': True,
     'text': '문제마다 **무엇이 좋은 값인지 먼저 정하고** 시작한다',
     'desc': '오늘 쓸 산 오르기 판에서는 **고도**를 평갓값으로 씁니다 — 클수록 좋은 값'},
]})

# ── 03 언덕 오르기 탐색 ───────────────────────────────────
S.append({'type': 'section', 'num': '03', 'title': '언덕 오르기 탐색'})

S.append({'type': 'diagram', 'title': '오늘 쓸 판 — 산 오르기',
          'nodes': mount(accent=('S', 'T')), 'edges': m_edges(),
          'foot': '지점 이름 옆의 숫자는 그 지점의 **고도(m)** · 출발은 **S** · 이 산의 정상은 **T**',
          'notes': '선은 등산로입니다. 이 판을 오늘 내내 씁니다.'})

S.append({'type': 'diagram', 'title': '판의 규칙',
          'nodes': mount(accent=('S',)), 'edges': m_edges(),
          'side': [
              {'label': '보이는 것', 'accent': True,
               'text': '지금 서 있는 지점에서 **바로 이어진 다음 지점의 고도**까지만 보인다. 안개가 짙어 그 너머는 안 보인다.'},
              {'label': '정상인지 아는 법',
               'text': '정상에는 **표지판**이 있다. 도착해야 알 수 있고, 멀리서는 안 보인다.'},
              {'label': '평갓값',
               'text': '**고도**를 평갓값으로 쓴다. 여기서는 **클수록 좋은 값**.'},
          ]})

S.append({'type': 'cards', 'title': '지역 탐색', 'cards': [
    {'wide': True, 'label': '지역 탐색 (국지적 탐색)', 'accent': True, 'small': True,
     'text': '상태 공간이 너무 커서 **목표 상태가 무엇인지 모를 경우**, 여러 상태를 비교해 **어느 것이 더 좋은지 평가할 수 있으면** 하나의 상태에서 시작해 **주변의 조금 더 좋은 상태로 이동하는 과정을 반복**하는 것'},
    {'wide': True, 'label': '대표 알고리즘', 'small': True, 'text': '언덕 오르기 탐색',
     'desc': '유전자 알고리즘도 지역 탐색에 속합니다'},
], 'notes': '교과서 39쪽입니다.'})

S.append({'type': 'steps', 'title': '언덕 오르기 탐색 알고리즘', 'steps': [
    {'n': '①', 'label': '끝났나', 'desc': '지금 지점이 목표 상태이면 마친다'},
    {'n': '②', 'label': '둘러본다', 'desc': '지금 지점에서 갈 수 있는 **이웃 지점들의 평갓값**을 본다'},
    {'n': '③', 'label': '고른다',
     'desc': '가장 좋은 이웃이 지금보다 좋으면 **거기로 옮기고 ①로** · 좋은 이웃이 없으면 **거기서 멈춘다**'},
], 'foot': '이웃만 본다 — 지나쳐 온 곳은 다시 보지 않는다'})

# 시연 — hill_climb() 이 실제로 내놓은 값으로 채웁니다
path, log, reached = L6.hill_climb()
assert path == ['S', 'A', 'C'] and not reached, (path, reached)
done = []
for i, (cur, hc, nb, best, hb) in enumerate(log, 1):
    if hb > hc:
        act = '지금(%d)보다 높다 → **%s** 로 옮기고 ①로 돌아간다' % (hc, best)
    else:
        act = '지금(%d)보다 높지 않다 → **여기서 멈춘다**' % hc
    S.append({'type': 'diagram', 'title': '언덕 오르기 — %d단계' % i,
              'nodes': mount(accent=(cur,), dim=tuple(done)),
              'edges': m_edges(tuple(done) + (cur,)),
              'side': [
                  {'label': '① 지금 지점', 'accent': True, 'text': '**%s %d** — 정상 표지판이 없다' % (cur, hc)},
                  {'label': '② 이웃들의 고도', 'text': ' · '.join('%s %d' % (n, h) for n, h in nb)},
                  {'label': '③ 가장 좋은 이웃', 'text': '**%s %d**' % (best, hb)},
                  {'label': '그래서', 'accent': True, 'text': act},
              ]})
    done.append(cur)

S.append({'type': 'diagram', 'title': '언덕 오르기가 멈춘 곳',
          'nodes': mount(accent=('C', 'T'), dim=('S', 'A')), 'edges': m_edges(('S', 'A', 'C')),
          'foot': '멈춘 곳 **C 800m** · 이 산의 정상은 **T 1200m** — 정상에 닿지 못했다',
          'notes': '지나온 길은 S → A → C, 이동 두 번입니다.'})

S.append({'type': 'cards', 'title': '언덕 오르기의 한계',
          'ask': 'C 는 주변에서 가장 높습니다. 그런데 왜 정상에 못 갔을까요?',
          'cards': [
              {'label': '봉우리', 'accent': True, 'small': True,
               'text': '**주변에서만** 가장 높은 곳', 'desc': '산 전체에서 가장 높은 곳은 아니다'},
              {'label': '되돌아가지 못한다', 'accent': True, 'small': True,
               'text': '**좋아지는 쪽으로만** 옮긴다', 'desc': '지나쳐 온 B 500 으로 내려갈 수가 없다'},
          ], 'notes': '발문 — 되돌아가려면 무엇을 기억하고 있어야 할까? → 가 볼 수 있었지만 안 간 곳들.'})

# ── 04 최상 우선 탐색 ─────────────────────────────────────
S.append({'type': 'section', 'num': '04', 'title': '최상 우선 탐색'})

S.append({'type': 'cards', 'title': '최상 우선 탐색', 'cards': [
    {'wide': True, 'label': '최상 우선 탐색', 'accent': True, 'small': True,
     'text': '상태를 선택할 때, 각 상태에게 주어진 **평갓값에 따라 평갓값이 좋은 것부터 순서대로** 탐색하는 것'},
    {'label': '언덕 오르기', 'small': True, 'text': '지금 지점의 **이웃만** 놓고 고른다'},
    {'label': '최상 우선', 'accent': True, 'small': True, 'text': '지금까지 나온 **모든 후보**를 놓고 고른다'},
], 'notes': '교과서 32쪽 여백 정의입니다.'})

S.append({'type': 'cards', 'title': '후보를 모아 두는 곳', 'cards': [
    {'wide': True, 'label': '오픈 리스트', 'accent': True, 'small': True,
     'text': '목표 상태인지 테스트할 **후보 상태들을 임시로 보관하고 있는 대기실**'},
    {'wide': True, 'label': '닫힌 리스트', 'accent': True, 'small': True,
     'text': '그중 **테스트가 끝난 상태**를 옮겨 두는 곳',
     'desc': '닫힌 리스트에 있는 곳은 다시 테스트하지 않습니다'},
], 'notes': '교과서 32쪽. 파이썬의 리스트를 모르는 학생이 있으므로 대기실이라는 말로 설명합니다.'})

S.append({'type': 'steps', 'title': '최상 우선 탐색 알고리즘', 'steps': [
    {'n': '①', 'label': '넣는다', 'desc': '초기 상태를 **오픈 리스트**에 넣는다'},
    {'n': '②', 'label': '꺼낸다', 'desc': '오픈 리스트에서 **평갓값이 가장 좋은 상태**를 하나 꺼낸다'},
    {'n': '③', 'label': '테스트한다',
     'desc': '목표 상태이면 끝낸다 · 아니면 **자식 상태를 생성해 오픈 리스트에 넣고**, 그 상태는 **닫힌 리스트**로 옮긴 뒤 ②로'},
], 'foot': '그림에서 점선으로 흐린 지점이 **닫힌 리스트**에 들어간 곳입니다'})

steps, tested, ok = L6.best_first()
assert ok and tested == 6, (tested, ok)
closed_before = []
for i, st in enumerate(steps, 1):
    pick = st['pick']
    note = ''
    if i == 3:
        note = ' · 언덕 오르기는 여기서 멈췄다'
    if i == 4:
        note = ' · 지나쳐 온 곳으로 되돌아왔다'
    if st['goal']:
        test = '**정상 표지판이 있다 → 종료**'
    else:
        gen = ' · '.join('%s %d' % (n, H[n]) for n in st['gen']) or '없음'
        test = '정상 아님 → 자식 **%s** 를 오픈 리스트에 넣는다' % gen
    S.append({'type': 'diagram', 'title': '최상 우선 — %d단계' % i,
              'nodes': mount(accent=(pick,), dim=tuple(closed_before)),
              'edges': m_edges(tuple(closed_before) + (pick,)),
              'side': [
                  {'label': '② 꺼낸 것', 'accent': True,
                   'text': '**%s %d**%s' % (pick, H[pick], note)},
                  {'label': '③ 테스트', 'text': test},
                  {'label': '오픈 리스트', 'accent': True, 'text': lst(st['open'])},
                  {'label': '닫힌 리스트', 'text': lst(st['closed'])},
              ]})
    closed_before = list(st['closed'])

order = ' – '.join(s['pick'] for s in steps)
S.append({'type': 'diagram', 'title': '최상 우선 탐색이 지나간 자리',
          'nodes': mount(accent=('T',), dim=tuple(s['pick'] for s in steps if s['pick'] != 'T')),
          'edges': m_edges(tuple(s['pick'] for s in steps)),
          'foot': '테스트 순서 — **%s** · 열 곳 중 **%d곳**만 테스트하고 정상에 닿았다' % (order, tested),
          'notes': 'D · E · F · H 는 끝내 가 보지 않았습니다.'})

S.append({'type': 'table', 'title': '둘을 나란히 놓고',
          'head': ['', '언덕 오르기 탐색', '최상 우선 탐색'], 'firstCol': 4.6,
          'rows': [['무엇을 놓고 고르나', '지금 지점의 **이웃만**', '오픈 리스트에 있는 **모든 후보**'],
                   ['기억할 것', '지금 지점 하나', '오픈 리스트 · 닫힌 리스트'],
                   ['되돌아가기', '못 한다', '한다'],
                   ['이 판에서', 'S → A → C 에서 멈춤 · **정상 못 감**', '%s · **정상 도달**' % order],
                   ['테스트한 지점', '%d곳' % len(path), '%d곳' % tested]],
          'notes': '발문 — 최상 우선이 더 많이 테스트했는데도 더 좋은 이유는? 언덕 오르기는 답을 못 찾았습니다.'})

S.append({'type': 'cards', 'title': '최상 우선 탐색의 한계',
          'ask': '최상 우선 탐색이 보는 값은 무엇 하나뿐인가요?',
          'cards': [
              {'label': '보는 것', 'accent': True, 'small': True,
               'text': '목표까지 남은 거리의 **추정값**'},
              {'label': '보지 않는 것', 'accent': True, 'small': True,
               'text': '지금까지 오느라 든 **비용**',
               'desc': '이미 멀리 돌아왔다는 것을 모른다'},
          ]})

S.append({'type': 'plus', 'title': '다음 시간',
          'a': {'label': 'g(n)', 'text': '초기 상태에서 지금까지 온 비용'},
          'b': {'label': 'h(n)', 'text': '지금부터 목표까지의 추정 비용'},
          'result': {'label': 'f(n)', 'text': 'A* 탐색'},
          'notes': '교과서 36쪽. f(n) = g(n) + h(n) 을 평갓값으로 쓰는 최상 우선 탐색이 A* 입니다.'})

S.append({'type': 'summary', 'title': '오늘 배운 것', 'items': [
    '**지능적 탐색** — 주어진 정보 외에 경험적 지식을 **평갓값으로 추정**해서 탐색에 쓴다',
    '**휴리스틱값** — 목표 상태까지의 예상 비용을 추정한 값. **작을수록 좋기도, 클수록 좋기도** 하다',
    '**언덕 오르기 탐색** — 이웃 중 가장 좋은 곳으로만 옮긴다. 되돌아가지 못해 **봉우리에서 멈춘다**',
    '**최상 우선 탐색** — 후보를 **오픈 리스트**에 모아 두고 가장 좋은 것을 고른다. 그래서 **되돌아갈 수 있다**',
]})

deck = {'title': '5. 지능적 탐색', 'kicker': '인공지능 기초 · 1-1-2',
        'out': '인공지능기초_6차시_지능적탐색',
        '_메모': '옵시디언 6차시 노트를 옮긴 것. 산 판(S~T)과 시연 순서는 verify/lesson6.py 로 검산한 값입니다.',
        'slides': S}
with open('tools/samples/lesson6-smart.deck.json', 'w', encoding='utf-8') as f:
    json.dump(deck, f, ensure_ascii=False, indent=2)
print('슬라이드 %d장' % len(S))
