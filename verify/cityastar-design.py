# -*- coding: utf-8 -*-
"""
verify/cityastar-design.py — 「도시 배달 — A*」 실습에 쓸 도시 판을 **설계**합니다

균일 비용 실습의 판(citycost.js)에 직선거리 휴리스틱을 얹어 봤더니
h 가 너무 작아 A* 가 균일 비용과 똑같이 7개를 테스트했습니다(verify/cityastar.py).
간선 비용이 지도상의 거리와 아무 상관 없이 정해진 판이라 그렇습니다.

그래서 **직선거리가 언제나 허용 가능하도록** 판을 새로 만듭니다.

  · 도시를 좌표에 놓고, 간선 비용을 **두 도시 사이 직선거리 이상**으로 정합니다.
    이러면 삼각부등식에 의해 h(n)=직선거리 ≤ 실제 최소 비용 이 **자동으로** 보장됩니다.
  · 일부 간선에 '돌아가는 길' 만큼 비용을 더 얹어 선택이 생기게 합니다.

고르는 조건
  ① A* 가 균일 비용보다 **3개 이상 적게** 테스트한다
  ② 가장 싼 길과 **간선 수가 가장 적은 길이 다르다** (5차시에서 잡은 논점을 이어감)
  ③ 균일 비용 테스트 8~11개 — 수업 시간에 할 만한 길이
  ④ 답이 한 갈래로만 나온다 (같은 비용의 다른 최단 경로가 없어야 채점이 흔들리지 않음)

결과 : verify/cityastar-facts.json  (게임 코드가 이 값을 그대로 씁니다)
"""
import io, os, json, heapq, math, random
from itertools import count

HERE = os.path.dirname(os.path.abspath(__file__))
# ⚠ 도시 이름에 h 를 쓰지 않습니다 — 휴리스틱 h(n) 과 헷갈립니다
NAMES = 'abcdefgki'


def build(rng):
    """도시를 좌표에 뿌리고 이웃끼리 이어 판 하나를 만듭니다."""
    n = 9
    pos = {}
    # 왼쪽(출발)에서 오른쪽(목적지)으로 흐르도록 열을 나눠 놓습니다
    cols = [(6, 50), (24, 18), (24, 80), (46, 34), (46, 68),
            (66, 14), (66, 52), (66, 88), (92, 50)]
    for i in range(n):
        x, y = cols[i]
        pos[NAMES[i]] = (x + rng.randint(-4, 4), y + rng.randint(-6, 6))

    def dist(u, v):
        (x1, y1), (x2, y2) = pos[u], pos[v]
        return math.hypot(x2 - x1, y2 - y1)

    # 가까운 도시끼리 잇습니다 (각 도시에서 가까운 두세 곳)
    edges = {}
    for u in NAMES[:n]:
        near = sorted((v for v in NAMES[:n] if v != u), key=lambda v: dist(u, v))
        for v in near[:rng.choice([2, 3])]:
            key = tuple(sorted((u, v)))
            if key in edges:
                continue
            # 비용 = 직선거리 × 0.2 를 올림한 값 + 돌아가는 정도(0~2)
            base = math.ceil(dist(u, v) * 0.2)
            edges[key] = base + rng.choice([0, 0, 1, 1, 2])
    return pos, [(u, v, w) for (u, v), w in sorted(edges.items())]


def adj_of(edges):
    adj = {}
    for u, v, w in edges:
        adj.setdefault(u, []).append((v, w))
        adj.setdefault(v, []).append((u, w))
    for k in adj:
        adj[k].sort()
    return adj


def search(adj, start, goal, h):
    tie = count()
    pq = [(h(start), 0, next(tie), start, [start])]
    closed, order = {}, []
    while pq:
        f, g, _, u, path = heapq.heappop(pq)
        if u in closed:
            continue
        closed[u] = g
        order.append({'node': u, 'g': g, 'h': h(u), 'f': g + h(u)})
        if u == goal:
            return order, path, g
        for v, w in adj.get(u, []):
            if v in closed:
                continue
            heapq.heappush(pq, (g + w + h(v), g + w, next(tie), v, path + [v]))
    return order, None, None


def fewest_hops(adj, start, goal):
    """간선 수가 가장 적은 길 (비용은 무시)"""
    from collections import deque
    q = deque([[start]])
    seen = {start}
    while q:
        p = q.popleft()
        if p[-1] == goal:
            return p
        for v, w in adj.get(p[-1], []):
            if v in seen:
                continue
            seen.add(v)
            q.append(p + [v])
    return None


def path_cost(adj, path):
    c = 0
    for i in range(1, len(path)):
        c += dict((v, w) for v, w in adj[path[i - 1]])[path[i]]
    return c


def count_optimal(adj, start, goal, cost):
    """같은 최소 비용을 갖는 경로가 몇 개인지 (단순 경로만)"""
    found = [0]

    def go(u, c, seen):
        if c > cost:
            return
        if u == goal:
            if c == cost:
                found[0] += 1
            return
        for v, w in adj.get(u, []):
            if v in seen:
                continue
            go(v, c + w, seen | {v})
    go(start, 0, {start})
    return found[0]


def main():
    best = None
    for seed in range(4000):
        rng = random.Random(seed)
        pos, edges = build(rng)
        start, goal = 'a', 'i'
        adj = adj_of(edges)
        if len(adj) < 9:
            continue

        def hh(n):
            (x1, y1), (x2, y2) = pos[n], pos[goal]
            return int(math.floor(math.hypot(x2 - x1, y2 - y1) * 0.2))

        uo, upath, ucost = search(adj, start, goal, lambda n: 0)
        if upath is None:
            continue
        ao, apath, acost = search(adj, start, goal, hh)
        if apath is None or acost != ucost:
            continue
        # 허용 가능 확인 — 직선거리 ≤ 실제 최소 비용
        back, _, _ = search(adj, goal, goal, lambda n: 0)
        dist_to_goal = {}
        pq = [(0, goal)]
        while pq:
            d, u = heapq.heappop(pq)
            if u in dist_to_goal:
                continue
            dist_to_goal[u] = d
            for v, w in adj.get(u, []):
                if v not in dist_to_goal:
                    heapq.heappush(pq, (d + w, v))
        if any(hh(n) > dist_to_goal.get(n, 0) for n in pos):
            continue

        hops = fewest_hops(adj, start, goal)
        if hops is None:
            continue
        hcost = path_cost(adj, hops)
        gain = len(uo) - len(ao)
        if not (8 <= len(uo) <= 11 and gain >= 3):
            continue
        if len(hops) >= len(upath) or hcost <= ucost:
            continue                      # 싼 길과 간선 적은 길이 달라야 합니다
        if count_optimal(adj, start, goal, ucost) != 1:
            continue                      # 최적 경로가 하나뿐이어야 합니다
        cand = {'seed': seed, 'pos': pos, 'edges': edges,
                'uniform': {'order': [s['node'] for s in uo], 'tested': len(uo),
                            'path': upath, 'cost': ucost},
                'astar': {'steps': ao, 'order': [s['node'] for s in ao], 'tested': len(ao),
                          'path': apath, 'cost': acost},
                'h': {n: hh(n) for n in pos},
                'true_dist': dist_to_goal,
                'hops': hops, 'hopsCost': hcost, 'gain': gain}
        if best is None or cand['gain'] > best['gain']:
            best = cand
        if best['gain'] >= 4:
            break

    if best is None:
        print('조건에 맞는 판을 못 찾았습니다')
        return

    log = []
    say = log.append
    say('■ 고른 판 (seed %d)' % best['seed'])
    say('   도시 자리 : %s' % ', '.join('%s(%d,%d)' % (k, v[0], v[1]) for k, v in sorted(best['pos'].items())))
    say('   간선 : %s' % ', '.join('%s-%s %d' % e for e in best['edges']))
    say('')
    say('■ 휴리스틱값 — 목적지까지의 직선거리')
    say('   도시   h    실제 최소 비용')
    for n in sorted(best['pos']):
        say('    %s    %2d        %2d' % (n, best['h'][n], best['true_dist'][n]))
    say('   → 모든 도시에서 h ≤ 실제 비용 (간선 비용을 직선거리 이상으로 잡았기 때문)')
    say('')
    say('■ 균일 비용 탐색 — 테스트 %d개' % best['uniform']['tested'])
    say('   %s' % ' – '.join(best['uniform']['order']))
    say('■ A* 탐색 — 테스트 %d개' % best['astar']['tested'])
    for i, s in enumerate(best['astar']['steps'], 1):
        say('   %d. %s · g=%d h=%d f=%d' % (i, s['node'], s['g'], s['h'], s['f']))
    say('')
    say('   찾은 경로 (둘 다) : %s · 비용 %d'
        % (' → '.join(best['uniform']['path']), best['uniform']['cost']))
    say('   간선이 가장 적은 길 : %s · 비용 %d (길 %d개)'
        % (' → '.join(best['hops']), best['hopsCost'], len(best['hops']) - 1))
    say('   A* 가 %d개 적게 테스트했습니다' % best['gain'])

    text = '\n'.join(log)
    io.open(os.path.join(HERE, 'cityastar-check.txt'), 'w', encoding='utf-8').write(text)
    print('cityastar-check.txt 에 적었습니다')

    io.open(os.path.join(HERE, 'cityastar-facts.json'), 'w', encoding='utf-8').write(
        json.dumps(best, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
