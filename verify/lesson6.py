# -*- coding: utf-8 -*-
"""
verify/lesson6.py — 6차시(지능적 탐색) 검산

교과서 34~37쪽에 인쇄된 값을 **직접 돌려서** 맞는지 확인하고,
덱 생성기가 쓸 facts 를 verify/lesson6-facts.json 으로 내놓습니다.

  ① 도시 방문 경로 A* (책 36쪽 그림 Ⅰ-14)
     - 간선 비용은 책 32쪽 그림 Ⅰ-10, 휴리스틱값은 책 35쪽 그림 Ⅰ-11(직선거리)
     - 책에 인쇄된 f 값 14 / 11 / 12 / 12 와 '테스트한 상태 4개' 를 대조
  ② 8퍼즐 A* (책 37쪽 활동3)
     - h(n) = 목표와 다른 자리에 있는 타일 수(빈칸 제외)
     - 빈칸 이동 순서 위·아래·왼·오른
     - 책에 인쇄된 f 값들과 대조
  ③ 틱택토 휴리스틱 (책 35쪽 그림 Ⅰ-12)
     - h(n) = 그 칸을 포함해 이길 수 있는 선의 개수 → 모서리 3 · 가운데 4 · 변 2

⚠ 콘솔이 cp949 라 결과는 파일로도 남깁니다.
"""
import json, io, os, heapq
from itertools import count

HERE = os.path.dirname(os.path.abspath(__file__))

# ────────────────────────────────────────────────
# ① 도시 방문 경로 — A*
# ────────────────────────────────────────────────
# 책 32쪽 그림 Ⅰ-10 의 간선 비용 (5차시 균일 비용에서 쓴 것과 같은 지도)
CITY_EDGES = {
    ('a', 'b'): 5, ('a', 'c'): 4,
    ('b', 'c'): 5, ('b', 'd'): 8, ('b', 'e'): 9,
    ('c', 'd'): 3,
    ('d', 'e'): 5,
}
# 책 35쪽 그림 Ⅰ-11 — 각 도시에서 목표 도시 e 까지의 직선거리
CITY_H = {'a': 12, 'b': 9, 'c': 7, 'd': 5, 'e': 0}
CITY_START, CITY_GOAL = 'a', 'e'


def city_neighbors(x):
    out = []
    for (u, v), w in CITY_EDGES.items():
        if u == x: out.append((v, w))
        elif v == x: out.append((u, w))
    return sorted(out)


def city_astar():
    """책 36쪽과 같은 방식 — f = g + h 가 가장 작은 후보를 골라 테스트합니다.

    슬라이드에서 단계별로 보여 줄 수 있게 **테스트한 뒤의 오픈 리스트**도 함께 남깁니다.
    """
    tie = count()
    open_list = [(CITY_H[CITY_START], 0, next(tie), CITY_START, [CITY_START])]
    closed, steps = [], []
    while open_list:
        f, g, _, node, path = heapq.heappop(open_list)
        if node in closed:
            continue
        closed.append(node)
        rec = {'test': node, 'g': g, 'h': CITY_H[node], 'f': f, 'path': list(path)}
        if node == CITY_GOAL:
            rec['open'] = []
            steps.append(rec)
            return steps, path, g
        for nxt, w in city_neighbors(node):
            if nxt in closed:
                continue
            heapq.heappush(open_list, (g + w + CITY_H[nxt], g + w, next(tie), nxt, path + [nxt]))
        # 이 시점의 오픈 리스트 — 같은 도시가 여러 번 들어 있으면 작은 f 만 남깁니다
        best = {}
        for f2, g2, _t, n2, _p in open_list:
            if n2 in closed:
                continue
            if n2 not in best or f2 < best[n2][0]:
                best[n2] = (f2, g2)
        rec['open'] = [{'node': n2, 'g': v[1], 'h': CITY_H[n2], 'f': v[0]}
                       for n2, v in sorted(best.items(), key=lambda kv: (kv[1][0], kv[0]))]
        steps.append(rec)
    return steps, None, None



def city_uniform():
    """책 32~33쪽 안내 그대로 — 누적 비용이 가장 작은 상태를 먼저 테스트합니다."""
    tie = count()
    open_list = [(0, next(tie), CITY_START, [CITY_START])]
    closed, steps = [], []
    while open_list:
        g, _, node, path = heapq.heappop(open_list)
        if node in closed:
            continue
        closed.append(node)
        steps.append({'test': node, 'g': g, 'path': list(path)})
        if node == CITY_GOAL:
            return steps, path, g
        for nxt, w in city_neighbors(node):
            if nxt in closed:
                continue
            heapq.heappush(open_list, (g + w, next(tie), nxt, path + [nxt]))
    return steps, None, None


# ────────────────────────────────────────────────
# ② 8퍼즐 — A* (책 37쪽 활동3)
# ────────────────────────────────────────────────
P_START = (2, 8, 3, 1, 6, 4, 7, 0, 5)     # 2 8 3 / 1 6 4 / 7 _ 5
P_GOAL  = (1, 2, 3, 8, 0, 4, 7, 6, 5)     # 1 2 3 / 8 _ 4 / 7 6 5
# 책 37쪽 3번 — '위쪽, 아래쪽, 왼쪽, 오른쪽(UP, DOWN, LEFT, RIGHT)' 순서로 전개
P_DIRS = [(-3, '위쪽'), (3, '아래쪽'), (-1, '왼쪽'), (1, '오른쪽')]


def p_h(state):
    """목표 상태와 일치하지 않는 숫자 타일의 수 (공백 제외)"""
    return sum(1 for i, v in enumerate(state) if v != 0 and v != P_GOAL[i])


def p_moves(state):
    z = state.index(0)
    r, c = divmod(z, 3)
    out = []
    for d, name in P_DIRS:
        t = z + d
        if d == -3 and r == 0: continue
        if d == 3 and r == 2: continue
        if d == -1 and c == 0: continue
        if d == 1 and c == 2: continue
        s = list(state)
        s[z], s[t] = s[t], s[z]
        out.append((tuple(s), name))
    return out


def puzzle_astar():
    """확장할 때마다 자식들의 f 값을 기록해 둡니다 (책 37쪽 트리와 대조용)."""
    tie = count()
    start_h = p_h(P_START)
    open_list = [(start_h, 0, next(tie), P_START, [P_START], [])]
    seen = {P_START: 0}
    expanded, tree = [], []
    while open_list:
        f, g, _, state, path, dirs = heapq.heappop(open_list)
        expanded.append({'state': state, 'g': g, 'h': p_h(state), 'f': f})
        if state == P_GOAL:
            return expanded, path, dirs, tree
        for nxt, name in p_moves(state):
            ng = g + 1
            if nxt in seen and seen[nxt] <= ng:
                continue
            seen[nxt] = ng
            tree.append({'parent': state, 'child': nxt, 'dir': name,
                         'g': ng, 'h': p_h(nxt), 'f': ng + p_h(nxt), 'depth': ng})
            heapq.heappush(open_list, (ng + p_h(nxt), ng, next(tie), nxt, path + [nxt], dirs + [name]))
    return expanded, None, None, tree


# ────────────────────────────────────────────────
# ③ 틱택토 휴리스틱 (책 35쪽 그림 Ⅰ-12)
# ────────────────────────────────────────────────
TTT_LINES = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]


def ttt_h(pos):
    """빈 판에서 pos 에 돌을 놓았을 때, 그 돌을 포함해 아직 이길 수 있는 선의 개수"""
    return sum(1 for line in TTT_LINES if pos in line)


# ────────────────────────────────────────────────
def main():
    log = []
    def say(s):
        log.append(s)

    # ⓪ 균일 비용 (되짚기용) — 같은 지도에서 직접 돌립니다
    usteps, upath, ucost = city_uniform()
    say('■ ⓪ 도시 방문 경로 — 균일 비용 탐색 (되짚기)')
    say('   테스트 순서 : %s (%d개)' % (' – '.join(s2['test'] for s2 in usteps), len(usteps)))
    say('   찾은 경로 : %s · 비용 %d' % (' → '.join(upath), ucost))
    say('')

    # ① 도시
    steps, path, cost = city_astar()
    say('■ ① 도시 방문 경로 — A*')
    for i, s in enumerate(steps, 1):
        say('   %d. %s 테스트 · g=%d h=%d f=%d' % (i, s['test'], s['g'], s['h'], s['f']))
    say('   찾은 경로 : %s · 비용 %d' % (' → '.join(path), cost))
    say('   테스트한 상태 : %d개' % len(steps))

    # 책에 인쇄된 값과 대조
    printed = {'b': 14, 'c': 11, 'd': 12, 'e': 12}
    f_of = {}
    for node in ('b', 'c', 'd', 'e'):
        # 그 노드를 후보로 처음 올렸을 때의 f (책 그림 Ⅰ-14 에 적힌 값)
        if node == 'b':   f_of[node] = 5 + CITY_H['b']
        elif node == 'c': f_of[node] = 4 + CITY_H['c']
        elif node == 'd': f_of[node] = (4 + 3) + CITY_H['d']
        else:             f_of[node] = (4 + 3 + 5) + CITY_H['e']
    ok1 = all(f_of[k] == printed[k] for k in printed) and len(steps) == 4 and cost == 12
    say('   교과서 36쪽 대조 : %s  (%s)' % ('일치' if ok1 else '어긋남',
        ' · '.join('%s=%d' % (k, v) for k, v in f_of.items())))

    # ② 8퍼즐
    expanded, ppath, pdirs, tree = puzzle_astar()
    say('')
    say('■ ② 8퍼즐 — A* (책 37쪽 활동3)')
    say('   해답 이동 : %s (%d수)' % (' → '.join(pdirs), len(pdirs)))
    say('   확장(테스트)한 상태 : %d개' % len(expanded))
    depth1 = [t for t in tree if t['depth'] == 1]
    say('   깊이 1 자식 f 값 : %s' % ' · '.join('%s f=%d(%d+%d)' % (t['dir'], t['f'], t['g'], t['h']) for t in depth1))
    # 책에 인쇄된 f 값 모음 — 트리 어딘가에 반드시 있어야 합니다
    printed_f = [(4,1,3), (6,1,5), (5,2,3), (6,2,4), (5,3,2), (7,3,4), (6,3,3), (7,3,4), (7,5,2), (5,5,0)]
    have = set((t['f'], t['g'], t['h']) for t in tree)
    have.add((p_h(P_START), 0, p_h(P_START)))
    miss = [x for x in printed_f if x not in have]
    ok2 = not miss
    say('   교과서 37쪽 f 값 대조 : %s%s' % ('모두 나옴' if ok2 else '빠짐 ',
        '' if ok2 else str(miss)))

    # ③ 틱택토
    say('')
    say('■ ③ 틱택토 휴리스틱 (책 35쪽)')
    corner, center, edge = ttt_h(0), ttt_h(4), ttt_h(1)
    say('   모서리 h=%d · 가운데 h=%d · 변 h=%d' % (corner, center, edge))
    ok3 = (corner, center, edge) == (3, 4, 2)
    say('   교과서 35쪽 대조 : %s' % ('일치' if ok3 else '어긋남'))

    # 상태 공간 크기 (책 34쪽)
    import math
    say('')
    say('■ ④ 상태 공간의 크기 (책 34쪽)')
    say('   8퍼즐 9! = %s' % format(math.factorial(9), ','))
    say('   15퍼즐 15! = %s' % format(math.factorial(15), ','))
    say('')
    say('■ ⑤ 순회 외판원 문제 (책 34쪽 AI 이야기)')
    for n in (4, 5, 10):
        say('   도시 %2d곳 → 경로 %s가지' % (n, format(math.factorial(n), ',')))
    say('   ※ 실제로 도달 가능한 8퍼즐 상태는 9!/2 = %s (활동지A 에 쓴 값)' % format(math.factorial(9)//2, ','))

    text = '\n'.join(log)
    io.open(os.path.join(HERE, 'lesson6-check.txt'), 'w', encoding='utf-8').write(text)
    print('lesson6-check.txt 에 적었습니다 (콘솔은 cp949 라 한글이 깨집니다)')

    facts = {
        'city': {
            'edges': {'%s-%s' % k: v for k, v in CITY_EDGES.items()},
            'h': CITY_H,
            'steps': [{'test': s['test'], 'g': s['g'], 'h': s['h'], 'f': s['f'],
                       'open': s.get('open', []), 'path': s['path']} for s in steps],
            'path': path, 'cost': cost, 'tested': len(steps),
            'f_printed': f_of,
            'uniform': {'order': [s2['test'] for s2 in usteps], 'tested': len(usteps),
                        'path': upath, 'cost': ucost},
            'uniform_tested': len(usteps),
        },
        'puzzle': {
            'start': list(P_START), 'goal': list(P_GOAL),
            'dirs_order': [d[1] for d in P_DIRS],
            'solution': pdirs, 'moves': len(pdirs),
            'expanded': len(expanded),
            'h_start': p_h(P_START),
            'tree': [{'parent': list(t['parent']), 'child': list(t['child']), 'dir': t['dir'],
                      'g': t['g'], 'h': t['h'], 'f': t['f'], 'depth': t['depth']} for t in tree],
            'path_states': [list(s) for s in ppath],
        },
        'ttt': {'corner': corner, 'center': center, 'edge': edge},
        'space': {'p8': math.factorial(9), 'p15': math.factorial(15)},
        'tsp': {str(n): math.factorial(n) for n in (4, 5, 10)},
        'ok': {'city': ok1, 'puzzle': ok2, 'ttt': ok3},
    }
    io.open(os.path.join(HERE, 'lesson6-facts.json'), 'w', encoding='utf-8').write(
        json.dumps(facts, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
