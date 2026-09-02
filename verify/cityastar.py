# -*- coding: utf-8 -*-
"""
verify/cityastar.py — 「도시 배달 — A*」 실습의 휴리스틱값과 진행을 검산합니다

균일 비용 실습(js/games/citycost.js)과 **같은 도시 판**을 쓰고, 거기에
각 도시에서 목적지 h 까지의 **직선거리**를 휴리스틱값으로 얹습니다.
교과서 35쪽이 직선거리를 휴리스틱값으로 쓰는 것과 같은 방식입니다.

이 실습이 갖춰야 할 것
  ① 휴리스틱값이 **허용 가능(admissible)** — 어느 도시에서든 h ≤ 실제 최소 비용.
     안 그러면 A* 가 최적 경로를 놓쳐서 수업에서 거짓말을 하게 됩니다.
  ② A* 가 균일 비용보다 **적게 테스트** — 그래야 "왜 쓰는가" 가 드러납니다.
  ③ 찾는 경로는 균일 비용과 **같아야** 합니다 (둘 다 최적).

결과 : verify/cityastar-facts.json (게임 코드가 이 값을 그대로 씁니다)
"""
import io, os, json, heapq, math
from itertools import count

HERE = os.path.dirname(os.path.abspath(__file__))

# js/games/citycost.js 의 CC_MAP 과 같은 값
POS = {'a': (4, 50), 'b': (23, 15), 'c': (22, 85), 'd': (45, 60),
       'e': (47, 15), 'f': (69, 37), 'g': (69, 88), 'h': (96, 52)}
EDGES = [('a', 'b', 4), ('a', 'c', 2), ('b', 'd', 5), ('b', 'e', 6),
         ('c', 'd', 3), ('c', 'e', 7), ('d', 'f', 4), ('d', 'g', 8),
         ('e', 'f', 2), ('e', 'h', 9), ('f', 'h', 3), ('g', 'h', 2)]
START, GOAL = 'a', 'h'

ADJ = {}
for u, v, w in EDGES:
    ADJ.setdefault(u, []).append((v, w))
    ADJ.setdefault(v, []).append((u, w))
for k in ADJ:
    ADJ[k].sort()


def dijkstra(src):
    """실제 최소 비용 — 휴리스틱이 이보다 크면 안 됩니다"""
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, 1e9):
            continue
        for v, w in ADJ.get(u, []):
            if d + w < dist.get(v, 1e9):
                dist[v] = d + w
                heapq.heappush(pq, (d + w, v))
    return dist


def straight(u, v):
    (x1, y1), (x2, y2) = POS[u], POS[v]
    return math.hypot(x2 - x1, y2 - y1)


def make_h(true_dist):
    """직선거리를 실제 비용 단위로 줄여 씁니다.

    지도 좌표는 화면 비율(%)이라 단위가 다릅니다. 모든 도시에서
    h ≤ 실제 최소 비용 이 되도록 **가장 큰 배율**을 찾아 곱하고 내림합니다.
    (배율이 클수록 h 가 커져서 탐색이 더 똑똑해집니다)
    """
    ratios = []
    for n in POS:
        if n == GOAL:
            continue
        s = straight(n, GOAL)
        if s > 0:
            ratios.append(true_dist[n] / s)
    k = min(ratios)                       # 이 배율이면 모든 h 가 실제 비용 이하
    h = {n: int(math.floor(straight(n, GOAL) * k)) for n in POS}
    h[GOAL] = 0
    return h, k


def search(h=None):
    """h 가 없으면 균일 비용, 있으면 A*. 테스트(닫힌 리스트에 넣은) 순서를 남깁니다."""
    tie = count()
    hh = (lambda n: 0) if h is None else (lambda n: h[n])
    pq = [(hh(START), 0, next(tie), START, [START])]
    closed, order = {}, []
    while pq:
        f, g, _, u, path = heapq.heappop(pq)
        if u in closed:
            continue
        closed[u] = g
        order.append({'node': u, 'g': g, 'h': hh(u), 'f': g + hh(u)})
        if u == GOAL:
            return order, path, g
        for v, w in ADJ.get(u, []):
            if v in closed:
                continue
            heapq.heappush(pq, (g + w + hh(v), g + w, next(tie), v, path + [v]))
    return order, None, None


def main():
    log = []
    say = log.append

    true_dist = dijkstra(GOAL)            # 각 도시에서 h 까지의 실제 최소 비용
    h, k = make_h(true_dist)

    say('■ 휴리스틱값 — 목적지 h 까지의 직선거리 (배율 %.4f)' % k)
    say('   도시   h(직선거리)   실제 최소 비용   허용 가능?')
    ok_adm = True
    for n in sorted(POS):
        good = h[n] <= true_dist[n]
        ok_adm = ok_adm and good
        say('    %s        %2d             %2d            %s' % (n, h[n], true_dist[n], 'O' if good else 'X'))
    say('   → 모든 도시에서 h ≤ 실제 비용 : %s' % ('예' if ok_adm else '아니오'))

    uo, upath, ucost = search(None)
    ao, apath, acost = search(h)

    say('')
    say('■ 균일 비용 탐색')
    say('   테스트 순서 : %s (%d개)' % (' – '.join(s['node'] for s in uo), len(uo)))
    say('   찾은 경로   : %s · 비용 %d' % (' → '.join(upath), ucost))
    say('')
    say('■ A* 탐색')
    for i, s in enumerate(ao, 1):
        say('   %d. %s 테스트 · g=%d h=%d f=%d' % (i, s['node'], s['g'], s['h'], s['f']))
    say('   찾은 경로   : %s · 비용 %d' % (' → '.join(apath), acost))
    say('')
    ok_less = len(ao) < len(uo)
    ok_same = upath == apath and ucost == acost
    say('■ 이 판이 쓸 만한가')
    say('   ① 휴리스틱이 허용 가능한가        : %s' % ('예' if ok_adm else '아니오'))
    say('   ② A* 가 더 적게 테스트하는가      : %s (%d개 → %d개)'
        % ('예' if ok_less else '아니오', len(uo), len(ao)))
    say('   ③ 두 방법이 같은 경로를 찾는가    : %s' % ('예' if ok_same else '아니오'))

    text = '\n'.join(log)
    io.open(os.path.join(HERE, 'cityastar-check.txt'), 'w', encoding='utf-8').write(text)
    print('cityastar-check.txt 에 적었습니다')

    facts = {
        'h': h, 'scale': k, 'true_dist': true_dist,
        'admissible': ok_adm,
        'uniform': {'order': [s['node'] for s in uo], 'tested': len(uo),
                    'path': upath, 'cost': ucost},
        'astar': {'order': [s['node'] for s in ao], 'tested': len(ao),
                  'steps': ao, 'path': apath, 'cost': acost},
        'ok': {'admissible': ok_adm, 'fewer': ok_less, 'same_path': ok_same},
    }
    io.open(os.path.join(HERE, 'cityastar-facts.json'), 'w', encoding='utf-8').write(
        json.dumps(facts, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
