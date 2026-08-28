# -*- coding: utf-8 -*-
"""
균일 비용 탐색 실습 게임의 도시 판 검산 — js/games/citycost.js 와 같은 값이어야 합니다.

이 판이 갖춰야 할 것
  ① 가장 싼 길과 **간선 수가 가장 적은 길이 서로 달라야** 합니다.
     그래야 "깊이(간선 수)가 곧 비용이 아니다" 가 판에서 드러납니다.
  ② 오픈 리스트에 같은 도시가 다시 들어와 **더 작은 값으로 바뀌는 장면**이 있어야 합니다.
  ③ 테스트 횟수가 5~9 사이 — 너무 짧지도 길지도 않게.
"""
import io, sys, json
from collections import deque

# 도시 사이 이동 시간
EDGES = [
    ('a', 'b', 4), ('a', 'c', 2),
    ('b', 'd', 5), ('b', 'e', 6),
    ('c', 'd', 3), ('c', 'e', 7),
    ('d', 'f', 4), ('d', 'g', 8),
    ('e', 'f', 2), ('e', 'h', 9),
    ('f', 'h', 3), ('g', 'h', 2),
]
START, GOAL = 'a', 'h'

ADJ = {}
for u, v, w in EDGES:
    ADJ.setdefault(u, []).append((v, w))
    ADJ.setdefault(v, []).append((u, w))
for k in ADJ:
    ADJ[k].sort()


def uniform_cost():
    """교과서 32쪽 안내 그대로."""
    open_list = {START: 0}
    closed = {}
    parent = {START: None}
    steps = []
    while open_list:
        cur = min(open_list, key=lambda n: (open_list[n], n))
        g = open_list.pop(cur)
        closed[cur] = g
        if cur == GOAL:
            steps.append(dict(pick=cur, g=g, goal=True, gen=[], drop=[],
                              open=dict(open_list), closed=dict(closed)))
            path = []
            n = cur
            while n is not None:
                path.append(n); n = parent[n]
            return steps, list(reversed(path)), g
        gen, drop = [], []
        for nb, w in ADJ[cur]:
            ng = g + w
            if nb in closed:
                drop.append(f'{nb} 이미 테스트됨')
                continue
            if nb in open_list:
                if ng < open_list[nb]:
                    drop.append(f'{nb}({open_list[nb]}) → {nb}({ng}) 로 교체 (더 작음)')
                    open_list[nb] = ng; parent[nb] = cur
                    gen.append((nb, ng))
                else:
                    drop.append(f'{nb}({ng}) 제외 — 기존 {nb}({open_list[nb]}) 가 더 작음')
                continue
            open_list[nb] = ng; parent[nb] = cur
            gen.append((nb, ng))
        steps.append(dict(pick=cur, g=g, goal=False, gen=gen, drop=drop,
                          open=dict(open_list), closed=dict(closed)))
    return steps, None, None


def fewest_hops():
    """간선 수가 가장 적은 길 (너비 우선) — 그 길의 실제 비용도 같이 냅니다."""
    prev = {START: None}
    q = deque([START])
    while q:
        cur = q.popleft()
        if cur == GOAL:
            break
        for nb, _ in ADJ[cur]:
            if nb not in prev:
                prev[nb] = cur; q.append(nb)
    path = []
    n = GOAL
    while n is not None:
        path.append(n); n = prev[n]
    path.reverse()
    cost = sum(w for i in range(len(path) - 1)
               for (v, w) in ADJ[path[i]] if v == path[i + 1])
    return path, cost


def fmt(d):
    return ', '.join(f'{k}({v})' for k, v in sorted(d.items(), key=lambda x: (x[1], x[0]))) or '비어 있음'


if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    steps, path, cost = uniform_cost()
    print('■ 균일 비용 탐색 — 도시 %s 에서 %s 까지' % (START, GOAL))
    for i, s in enumerate(steps, 1):
        if s['goal']:
            print(f"  {i}. {s['pick']}({s['g']}) 선택 → 목적지! 종료")
        else:
            g = ', '.join(f'{n}({v})' for n, v in s['gen']) or '없음'
            print(f"  {i}. {s['pick']}({s['g']}) 선택 · 목적지 아님 · 자식 {g}")
            for d in s['drop']:
                print(f"       · {d}")
        print(f"       오픈 [{fmt(s['open'])}]  /  닫힌 [{fmt(s['closed'])}]")

    hops, hcost = fewest_hops()
    print(f"\n  가장 싼 길      — {' → '.join(path)}  비용 {cost}  (간선 {len(path)-1}개)")
    print(f"  간선이 적은 길  — {' → '.join(hops)}  비용 {hcost}  (간선 {len(hops)-1}개)")
    print(f"  테스트한 도시 {len(steps)}개")

    ok = []
    def T(c, msg):
        ok.append(c); print(('  ✔ ' if c else '  ✖ ') + msg)
    print('\n■ 검사')
    T(path != hops, f'가장 싼 길과 간선이 적은 길이 다르다')
    T(cost < hcost, f'가장 싼 길이 실제로 더 싸다 ({cost} < {hcost})')
    T(len(path) - 1 > len(hops) - 1, '가장 싼 길이 간선은 더 많다 — 깊이가 곧 비용이 아니다')
    T(any(any('교체' in d for d in s['drop']) for s in steps),
      '오픈 리스트에서 더 작은 값으로 바뀌는 장면이 있다')
    T(5 <= len(steps) <= 9, f'테스트 횟수가 알맞다 ({len(steps)}개)')
    if not all(ok):
        sys.exit('✖ 판을 다시 짜야 합니다.')
    print('\n✔ 전부 통과')
    json.dump({'path': path, 'cost': cost, 'tested': len(steps),
               'order': [s['pick'] for s in steps],
               'hops': hops, 'hopsCost': hcost},
              open('verify/citycost-facts.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
