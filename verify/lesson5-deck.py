# -*- coding: utf-8 -*-
"""
5차시(진도표 기준) 덱 생성 — 비용 정보가 주어졌을 때의 탐색 · 균일 비용 탐색

교과서 32~33쪽만 다룹니다. 지능적 탐색(34~37쪽)은 다음 차시입니다.
시연 장의 오픈/닫힌 리스트·누적 비용은 verify/lesson5-uniform.py 를 실제로 돌려 채웁니다.

선생님 지시 (2026-08-28, pptx 발표자 노트)
  · 2장 — BFS/DFS 를 a b c d e f 로만 말하면 학생이 못 따라온다. **트리를 그리고**
          알고리즘도 한 줄이 아니라 풀어서 설명할 것
          → 트리를 **한 장에 크게** 먼저 보여주고(3·5장), 다음 장에서 옆에 두고 설명(4·6장)
  · 3장 — 실습 장 빼기 (뺐습니다)
  · 8장 — 정의 글자를 키울 것 → 카드에 def:true (라벨 36 · 본문 40.5)
  · 5·6·7장(맹목적 탐색의 한계·상태 공간·큰 트리 40개)은 **지능적 탐색 차시로** 넘깁니다

자리는 verify/lesson5-check.mjs 로 겹침·간선 스침을 검사했습니다.
"""
import io, sys, json, importlib.util
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

spec = importlib.util.spec_from_file_location('U', 'verify/lesson5-uniform.py')
U = importlib.util.module_from_spec(spec); spec.loader.exec_module(U)

# ── 교과서 a~f 트리 (지난 시간 복습) ──
TREE = {'a': (51, 4), 'b': (17, 50), 'c': (85, 50),
        'd': (0, 96), 'e': (34, 96), 'f': (85, 96)}
TREE_E = [('a', 'b'), ('a', 'c'), ('b', 'd'), ('b', 'e'), ('c', 'f')]
BFS_ORDER = ['a', 'b', 'c', 'd', 'e', 'f']
DFS_ORDER = ['a', 'b', 'd', 'e', 'c', 'f']
NUM = '①②③④⑤⑥⑦⑧⑨⑩'


def tree(order=None, accent=()):
    ns = []
    for k, (x, y) in TREE.items():
        lab = k if order is None else '%s %s' % (NUM[order.index(k)], k)
        n = {'id': k, 'x': x, 'y': y, 'label': lab}
        if k in accent:
            n['accent'] = True
        ns.append(n)
    return ns


def tree_edges():
    return [{'from': a, 'to': b} for a, b in TREE_E]


# ── 교과서 도시 지도 (그림 Ⅰ-10) ──
CITY = {'a': (0, 50), 'b': (26, 8), 'c': (26, 88), 'd': (62, 48), 'e': (98, 20)}
CITY_E = [('a', 'b', 5), ('a', 'c', 4), ('b', 'c', 5), ('b', 'd', 8),
          ('b', 'e', 9), ('c', 'd', 3), ('d', 'e', 5)]
PATH_E = {('a', 'c'), ('c', 'd'), ('d', 'e')}      # 찾아낸 최단 경로


def city(cost=None, accent=(), dim=()):
    """cost 를 주면 도시 이름 옆에 누적 비용을 붙입니다"""
    ns = []
    for k, (x, y) in CITY.items():
        lab = k if cost is None or k not in cost else '%s %d' % (k, cost[k])
        n = {'id': k, 'x': x, 'y': y, 'label': lab}
        if k in accent:
            n['accent'] = True
        if k in dim:
            n['dim'] = True
        ns.append(n)
    return ns


def city_edges(labels=True, only_path=False):
    out = []
    for a, b, w in CITY_E:
        e = {'from': a, 'to': b}
        if labels:
            e['label'] = str(w)
        if only_path and (a, b) not in PATH_E:
            e['dim'] = True
        out.append(e)
    return out


S = []

# ── 표지 · 지난 시간 되짚기 ──────────────────────────────
S.append({'type': 'title', 'title': '균일 비용 탐색',
          'notes': '지난 시간 맹목적 탐색을 트리로 되짚고, 간선 비용이 다를 때로 넘어갑니다.'})

S.append({'type': 'cards', 'title': '지난 시간에 배운 것', 'cards': [
    {'wide': True, 'def': True, 'label': '맹목적 탐색', 'accent': True,
     'text': '목표가 어디 있는지 알려 주는 정보 없이, **정해진 순서대로 하나씩 테스트**하는 전략',
     'desc': '무정보 탐색이라고도 합니다'},
    {'label': '너비 우선 탐색', 'small': True, 'text': '층별로, 왼쪽에서 오른쪽으로'},
    {'label': '깊이 우선 탐색', 'small': True, 'text': '한 갈래를 끝까지, 막히면 되돌아온다'},
], 'notes': '정의를 다시 읽히고 트리로 넘어갑니다. 두 방법 이름만 꺼내 두고 자세한 건 다음 장에서.'})

S.append({'type': 'diagram', 'title': '너비 우선 탐색',
          'nodes': tree(BFS_ORDER, accent=('a',)), 'edges': tree_edges(),
          'foot': '탐색 순서 — **a – b – c – d – e – f**',
          'notes': '번호를 하나씩 짚어 가며 왜 그 순서인지 소리 내어 설명합니다. '
                   'a 를 보고 나면 b·c 를 모두 본 뒤에야 d 로 내려갑니다.'})

S.append({'type': 'diagram', 'title': '너비 우선 탐색 — 어떻게 도나',
          'nodes': tree(BFS_ORDER, accent=('a',)), 'edges': tree_edges(),
          'side': [
              {'label': '① 층별로 내려간다', 'accent': True,
               'text': '트리의 **가장 위에서부터 깊이(층)별로** 차례대로 테스트하며 내려간다.'},
              {'label': '② 같은 층은 왼쪽부터',
               'text': '깊이 1 에서 **b 를 보고 c 를 본다.** 왼쪽에서 오른쪽으로.'},
              {'label': '③ 한 층을 다 보기 전에는',
               'text': '**아래층으로 내려가지 않는다.** b·c 를 모두 본 뒤에야 d 로 내려간다.'},
              {'label': '기억할 것', 'accent': True,
               'text': '지금 보고 있는 **그 층 전체**를 들고 있어야 한다.'},
          ]})

S.append({'type': 'diagram', 'title': '깊이 우선 탐색',
          'nodes': tree(DFS_ORDER, accent=('a',)), 'edges': tree_edges(),
          'foot': '탐색 순서 — **a – b – d – e – c – f**',
          'notes': 'b 다음에 c(너비)로 가느냐 d(깊이)로 내려가느냐가 두 방법이 갈리는 첫 지점입니다.'})

S.append({'type': 'diagram', 'title': '깊이 우선 탐색 — 어떻게 도나',
          'nodes': tree(DFS_ORDER, accent=('a',)), 'edges': tree_edges(),
          'side': [
              {'label': '① 한 갈래를 끝까지', 'accent': True,
               'text': '갈래를 하나 골라 **더 내려갈 수 없을 때까지** 내려간다. a → b → d.'},
              {'label': '② 막히면 되돌아온다',
               'text': 'd 는 끝이다 → **b 로 올라가** 남은 갈래 e 로.'},
              {'label': '③ 또 막히면 더 올라간다',
               'text': 'e 도 끝이다 → **a 까지 올라가** c 로. 그 다음 f.'},
              {'label': '기억할 것', 'accent': True,
               'text': '**지금 내려온 한 줄**만 기억하면 된다.'},
          ]})

S.append({'type': 'table', 'title': '둘을 나란히 놓고',
          'head': ['', '너비 우선 탐색', '깊이 우선 탐색'], 'firstCol': 4.4,
          'rows': [['진행 방향', '가로 — 층별로', '세로 — 한 갈래씩'],
                   ['순서', '**a – b – c – d – e – f**', '**a – b – d – e – c – f**'],
                   ['기억할 것', '그 층 전체', '지금 내려온 한 줄'],
                   ['b 다음에', '**옆(c)** 으로', '**아래(d)** 로']],
          'notes': '여기까지가 지난 시간입니다. 이제 오늘 것으로 넘어갑니다.'})

# ── 동기 ─────────────────────────────────────────────────
S.append({'type': 'cards', 'title': '지금까지 숨어 있던 가정', 'cards': [
    {'wide': True, 'def': True, 'label': '맹목적 탐색이 깔고 있던 것', 'accent': True,
     'text': '아무 정보가 없으면 **모든 간선의 비용이 1**이라고 본다'},
    {'label': '그래서', 'small': True, 'text': '깊이가 곧 비용이었다',
     'desc': '한 칸 내려가면 1, 두 칸이면 2'},
    {'label': '8퍼즐도', 'small': True, 'text': '한 번 미는 값이 모두 같았다',
     'desc': '위로 밀든 옆으로 밀든 똑같이 한 번'},
], 'notes': '교과서 31쪽입니다. 이 가정을 깨는 것이 오늘 내용입니다.'})

S.append({'type': 'quote', 'small': True,
          'text': '그런데 어떤 길은 3분, 어떤 길은 8분이라면?',
          'notes': '집에서 학교 가는 길을 떠올리게 합니다. 버스는 빠르지만 돌아가고, 골목은 짧지만 느리고.'})

S.append({'type': 'section', 'num': '01', 'title': '비용 정보가 주어졌을 때의 탐색'})

S.append({'type': 'cards', 'title': '비용이 다를 때', 'cards': [
    {'wide': True, 'def': True, 'label': '교과서 32쪽', 'accent': True,
     'text': '하나의 상태에서 다른 상태로 이동하는 데 필요한 **비용이 다를 때**가 있다'},
    {'wide': True, 'small': True,
     'text': '그러면 우리가 찾고 싶은 것은 **목표에 이르는 총비용이 가장 작은 경로**',
     'desc': '비용이 작은 경로를 먼저 탐색하는 것이 더 효율적입니다'},
]})

# ── 문제 상황 ────────────────────────────────────────────
S.append({'type': 'diagram', 'title': '도시 방문 경로 찾기',
          'nodes': city(accent=('a', 'e')), 'edges': city_edges(),
          'foot': '출발 **a** → 목적지 **e** · 선 위의 숫자는 그 도로를 지나는 데 걸리는 **시간**',
          'notes': '교과서 32쪽 그림 Ⅰ-10. 다섯 도시를 잇는 도로망입니다. '
                   '가장 짧은 시간으로 가는 길을 찾는 것이 문제입니다.'})

S.append({'type': 'cards', 'title': '누적 비용', 'cards': [
    {'wide': True, 'def': True, 'label': '누적 비용', 'accent': True,
     'text': '초기 상태에서 현재 상태까지 오는 경로의 **누적된 비용의 합**'},
    {'label': 'a → c 는', 'small': True, 'text': '4'},
    {'label': 'a → c → d 는', 'small': True, 'text': '4 + 3 = 7'},
], 'notes': '교과서 32쪽 여백 정의 그대로입니다. 지도를 짚어 가며 두 개를 같이 계산해 봅니다.'})

S.append({'type': 'cards', 'title': '균일 비용 탐색', 'cards': [
    {'wide': True, 'def': True, 'label': '균일 비용 탐색', 'accent': True,
     'text': '다음 상태를 선택할 때 **누적 비용이 가장 작은 상태를 먼저 선택**하는 순서로 탐색하는 알고리즘'},
    {'wide': True, 'small': True,
     'text': '싼 길부터 차례로 열어 보는 것',
     'desc': '그래서 목적지를 만나는 순간, 그보다 싼 길은 이미 다 확인한 뒤가 됩니다'},
], 'notes': '교과서 32쪽 본문 정의입니다. "가장 작은 것부터"가 핵심입니다.'})

S.append({'type': 'cards', 'title': '후보를 모아 두는 곳', 'cards': [
    {'wide': True, 'def': True, 'label': '오픈 리스트', 'accent': True,
     'text': '목표 상태인지 테스트할 후보 상태들을 임시로 보관하는 **대기실**'},
    {'wide': True, 'def': True, 'label': '닫힌 리스트', 'accent': True,
     'text': '그중 **테스트가 끝난 상태**를 옮겨 두는 곳'},
], 'notes': '교과서 32쪽 여백. 파이썬 리스트를 모르는 학생이 있으므로 대기실이라는 말로 설명합니다.'})

S.append({'type': 'steps', 'title': '균일 비용 탐색 알고리즘', 'steps': [
    {'n': '①', 'label': '끝났나', 'desc': '초기 상태가 목표 상태이면 마친다'},
    {'n': '②', 'label': '넣는다', 'desc': '초기 상태에서 갈 수 있는 간선에 따라 **자식 상태를 생성해 오픈 리스트에** 넣는다'},
    {'n': '③', 'label': '고른다', 'desc': '오픈 리스트에서 **누적 비용이 가장 작은 상태**를 다음 순서로 선택한다'},
    {'n': '④', 'label': '테스트한다', 'desc': '목표면 끝낸다 · 아니면 자식을 생성해 오픈 리스트에 넣고 **③으로 돌아간다**'},
], 'foot': '오픈 리스트에 **같은 도시**가 있으면 — **비용이 작은 쪽만** 남긴다',
   'notes': '교과서 32쪽 안내 그대로입니다. 마지막 줄(같은 상태는 작은 것만)이 시연에서 두 번 쓰입니다.'})

# ── 시연 — lesson5-uniform.py 가 실제로 돌린 값 ──────────
steps, tested, path, cost = U.uniform_cost()
assert tested == 5 and path == ['a', 'c', 'd', 'e'] and cost == 12, (tested, path, cost)

for i, st in enumerate(steps, 1):
    pick = st['pick']
    closed_before = [k for k in st['closed'] if k != pick]
    if st['goal']:
        act = '**목적지다! 종료**'
    else:
        gen = ' · '.join('%s(%d)' % (n, v) for n, v in st['gen']) or '없음'
        act = '목적지가 아니다 → 자식 **%s** 를 오픈 리스트에' % gen
    # 오픈/닫힌 리스트는 **값을 읽어야 하는 칸**이라 각각 따로, 크게 둡니다.
    # 카드를 3개로 유지해야 칸이 높아져서 글자가 안 줄어듭니다 (2026-08-28 선생님 요청)
    head = '**%s (%d)** — %s' % (pick, st['g'], act)
    if st['drop']:
        head += '\n빼는 것 — ' + ' · '.join(st['drop'])
    side = [
        {'label': '③ 꺼낸 것 · ④ 테스트', 'accent': True, 'text': head},
        {'label': '오픈 리스트 — 테스트할 후보', 'accent': True, 'big': True,
         'text': U.fmt(st['open']).replace(', ', '   ')},
        {'label': '닫힌 리스트 — 테스트가 끝난 것', 'big': True,
         'text': U.fmt(st['closed']).replace(', ', '   ')},
    ]
    S.append({'type': 'diagram', 'title': '균일 비용 탐색 — %d단계' % i,
              'nodes': city(cost=st['closed'] | st['open'], accent=(pick,), dim=tuple(closed_before)),
              'edges': city_edges(),
              'side': side})

S.append({'type': 'diagram', 'title': '찾은 길',
          'nodes': city(cost={'a': 0, 'c': 4, 'd': 7, 'e': 12}, accent=('a', 'c', 'd', 'e')),
          'edges': city_edges(only_path=True),
          'foot': '**%s** · 경로 비용 **%d** · **%d개**의 상태만 테스트했다' % (' → '.join(path), cost, tested),
          'notes': '교과서 33쪽 결과와 같습니다. 도시 이름 옆 숫자가 누적 비용입니다.'})

S.append({'type': 'cards', 'title': '왜 가장 짧은 길이 나오나',
          'ask': 'b 는 5, c 는 4 였습니다. 왜 c 를 먼저 봤을까요?',
          'cards': [
              {'wide': True, 'small': True,
               'text': '**누적 비용이 작은 것부터** 꺼내기 때문에, 목적지를 꺼내는 순간 그보다 싼 길은 이미 다 확인한 뒤다',
               'desc': 'a → b → e 는 5 + 9 = 14 였습니다. 그보다 싼 a → c → d → e (12) 를 먼저 만났습니다'},
          ]})

S.append({'type': 'cards', 'title': '비용이 모두 같다면', 'cards': [
    {'wide': True, 'def': True, 'label': '교과서 32쪽', 'accent': True,
     'text': '모든 비용이 같다면 균일 비용 탐색은 **너비 우선 탐색과 똑같이** 진행한다'},
    {'wide': True, 'small': True,
     'text': '누적 비용이 곧 **깊이**가 되기 때문',
     'desc': '오늘 첫 장에서 본 "모든 간선의 비용을 1로 본다" 가 바로 그 경우입니다'},
], 'notes': '오늘의 첫 장과 이어 줍니다. 너비 우선은 균일 비용 탐색의 특별한 경우인 셈입니다.'})

S.append({'type': 'summary', 'title': '오늘 배운 것', 'items': [
    '간선마다 **비용이 다를 때**는 깊이가 곧 비용이 아니다',
    '**누적 비용** — 초기 상태에서 지금까지 온 경로의 비용을 모두 더한 값',
    '**균일 비용 탐색** — 오픈 리스트에서 **누적 비용이 가장 작은 상태**를 먼저 꺼내 테스트한다',
    '**오픈 리스트**(테스트할 후보 대기실) · **닫힌 리스트**(테스트가 끝난 것)',
    '모든 비용이 같으면 **너비 우선 탐색과 같아진다**',
]})

S.append({'type': 'cards', 'title': '다음 시간', 'cards': [
    {'wide': True, 'def': True, 'label': '지능적 탐색', 'accent': True,
     'text': '지금까지는 **와 본 길의 비용**만 썼다. 여기에 **목표까지 얼마나 남았는지 짐작한 값**을 더하면?'},
    {'wide': True, 'small': True, 'text': '교과서 34~36쪽 — 휴리스틱값 · A* 탐색'},
]})

deck = {'title': '5. 균일 비용 탐색', 'kicker': '인공지능 기초 · 1-1-2',
        'out': '인공지능기초_6차시_균일비용탐색',
        '_메모': '교과서 32~33쪽. 시연 값은 verify/lesson5-uniform.py 로 검산했습니다. '
                 '지능적 탐색(34~37쪽)은 다음 차시입니다.',
        'slides': S}
with open('tools/samples/lesson5-uniform.deck.json', 'w', encoding='utf-8') as f:
    json.dump(deck, f, ensure_ascii=False, indent=2)
print('슬라이드 %d장' % len(S))
