# -*- coding: utf-8 -*-
"""
verify/assess1.py — 1차 수행평가(탐색) 문항 검산

「인공지능기초 수행평가 운영패키지」의 수행평가 ① 을 실제 문항으로 만들려면
2×3 퍼즐 하나를 골라야 합니다. 패키지가 말한 교사용 정답지 규모
  · BFS 방문 순서 12개
  · A* 확장 6개
가 실제로 나오는 판을 **모든 판을 다 돌려서** 찾고, 정답지를 만들어 냅니다.

규칙 (평가지에 그대로 인쇄합니다)
  ① 빈칸을 옮겨 판을 바꾼다. 빈칸 이동 방향은 **위 → 아래 → 왼 → 오른** 순서로 전개한다
     (교과서 37쪽 활동3 과 같은 순서 — 수업에서 쓴 순서와 맞춥니다)
  ② 앞에서 이미 나온 상태는 다시 만들지 않는다 (중복 상태 ✕)
  ③ 휴리스틱 h(n) = 목표 상태와 다른 자리에 있는 타일의 수 (빈칸 제외)
  ④ f 값이 같으면 h 가 작은 것을 먼저 테스트한다

결과 : verify/assess1-facts.json · verify/assess1-check.txt
"""
import json, io, os, heapq
from collections import deque
from itertools import count, permutations

HERE = os.path.dirname(os.path.abspath(__file__))

W, H = 3, 2                       # 2행 3열
GOAL = (1, 2, 3, 4, 5, 0)         # 1 2 3 / 4 5 _
DIRS = [(-W, '위'), (W, '아래'), (-1, '왼'), (1, '오른')]     # 전개 순서


def moves(state):
    z = state.index(0)
    r, c = divmod(z, W)
    out = []
    for d, name in DIRS:
        if d == -W and r == 0: continue
        if d == W and r == H - 1: continue
        if d == -1 and c == 0: continue
        if d == 1 and c == W - 1: continue
        s = list(state)
        t = z + d
        s[z], s[t] = s[t], s[z]
        out.append((tuple(s), name))
    return out


def h_of(state, goal=GOAL):
    return sum(1 for i, v in enumerate(state) if v != 0 and v != goal[i])


def bfs(start, goal=GOAL):
    """방문(테스트)한 순서를 그대로 남깁니다. 중복 상태는 큐에 넣지 않습니다."""
    seen = {start}
    q = deque([(start, [], 0)])
    visited = []
    while q:
        st, path, d = q.popleft()
        visited.append({'state': st, 'depth': d, 'path': path})
        if st == goal:
            return visited, path
        for nxt, name in moves(st):
            if nxt in seen:
                continue
            seen.add(nxt)
            q.append((nxt, path + [name], d + 1))
    return visited, None


def astar(start, goal=GOAL):
    """f = g + h · f 가 같으면 h 가 작은 것 먼저 · 그래도 같으면 전개 순서대로"""
    tie = count()
    open_list = [(h_of(start), h_of(start), next(tie), start, [])]
    best = {start: 0}
    expanded, table = [], []
    closed = set()
    while open_list:
        f, hh, _, st, path = heapq.heappop(open_list)
        if st in closed:
            continue
        closed.add(st)
        g = len(path)
        expanded.append({'state': st, 'g': g, 'h': h_of(st), 'f': g + h_of(st),
                         'path': list(path)})
        if st == goal:
            return expanded, path, table
        for nxt, name in moves(st):
            if nxt in closed:
                continue
            ng = g + 1
            if nxt in best and best[nxt] <= ng:
                continue
            best[nxt] = ng
            table.append({'from': st, 'to': nxt, 'dir': name,
                          'g': ng, 'h': h_of(nxt), 'f': ng + h_of(nxt)})
            heapq.heappush(open_list, (ng + h_of(nxt), h_of(nxt), next(tie), nxt, path + [name]))
    return expanded, None, table


def depth2_tree(start):
    """깊이 2까지 — 중복 상태는 빼고 (문항 2 정답)"""
    nodes = [{'state': start, 'parent': None, 'dir': None, 'depth': 0}]
    seen = {start}
    frontier = [start]
    for d in (1, 2):
        nxt_front = []
        for p in frontier:
            for nxt, name in moves(p):
                if nxt in seen:
                    continue
                seen.add(nxt)
                nodes.append({'state': nxt, 'parent': p, 'dir': name, 'depth': d})
                nxt_front.append(nxt)
        frontier = nxt_front
    return nodes


def pick():
    """평가지에 쓸 판 고르기 — 아래 조건을 모두 만족하는 판을 전수 조사로 찾습니다.

    ① 빈칸이 가운데 열(자식이 3개) — 깊이 2 트리가 너무 앙상하지 않게
    ② 최단 해가 4수 이상          — 너무 쉬우면 변별이 안 됩니다
    ③ 너비 우선 방문 10~16개      — 손으로 셀 수 있는 범위
    ④ A* 확장 5~7개               — 운영 패키지가 잡아 둔 정답지 규모

    ⚠ 패키지가 적어 둔 'BFS 12개 · A* 6개' 는 359개 판 어디에도 없습니다(전수 조사).
       가장 가까운 조건으로 바꿔 잡았고, 실제 값은 정답지에 그대로 씁니다.
    """
    hits = []
    for p in permutations(range(6)):
        if p == GOAL or p.index(0) not in (1, 4):
            continue
        vis, path = bfs(p)
        if path is None or not (10 <= len(vis) <= 16) or len(path) < 4:
            continue
        exp, apath, _ = astar(p)
        if not (5 <= len(exp) <= 7):
            continue
        hits.append({'start': p, 'bfs': len(vis), 'astar': len(exp),
                     'sol': len(path), 'h0': h_of(p)})
    return hits


def show(state):
    return ' '.join('_' if v == 0 else str(v) for v in state[:W]) + ' / ' + \
           ' '.join('_' if v == 0 else str(v) for v in state[W:])


def main():
    log = []
    say = log.append

    hits = pick()
    say('■ BFS 방문 12개 · A* 확장 6개 가 되는 시작 판 : %d개' % len(hits))
    for x in hits[:12]:
        say('   %s  (최단 %d수 · 시작 h=%d)' % (show(x['start']), x['sol'], x['h0']))

    # 그중 최단 해가 가장 긴 것을 고릅니다 — 너무 쉬우면 변별이 안 됩니다
    hits.sort(key=lambda x: (-x['sol'], -x['h0']))
    START = hits[0]['start']
    say('')
    say('■ 고른 판')
    say('   초기 상태  %s' % show(START))
    say('   목표 상태  %s' % show(GOAL))

    vis, path = bfs(START)
    say('')
    say('■ 문항 3 — 너비 우선 탐색 (중복 상태 제거)')
    say('   방문 순서 %d개' % len(vis))
    for i, v in enumerate(vis, 1):
        say('   %2d. %s  (깊이 %d)' % (i, show(v['state']), v['depth']))
    say('   찾은 해 : %s (%d수)' % (' → '.join(path), len(path)))

    tree = depth2_tree(START)
    say('')
    say('■ 문항 2 — 깊이 2 탐색 트리 : 노드 %d개 (깊이1 %d · 깊이2 %d)'
        % (len(tree), sum(1 for n in tree if n['depth'] == 1),
           sum(1 for n in tree if n['depth'] == 2)))
    for n in tree:
        if n['depth'] == 0: continue
        say('   깊이%d  %s  ← %s' % (n['depth'], show(n['state']), n['dir']))

    exp, apath, table = astar(START)
    say('')
    say('■ 문항 5 — A* (h = 제자리에 없는 타일 수)')
    for i, e in enumerate(exp, 1):
        say('   %d. 확장 %s  g=%d h=%d f=%d' % (i, show(e['state']), e['g'], e['h'], e['f']))
    say('   찾은 해 : %s (%d수)' % (' → '.join(apath), len(apath)))
    say('   확장한 상태 %d개 — 너비 우선 %d개와 견줍니다' % (len(exp), len(vis)))

    say('')
    say('■ 문항 4 — 휴리스틱값 (초기 상태에서)')
    say('   h(초기) = %d' % h_of(START))
    for nxt, name in moves(START):
        say('   %s 으로 옮기면 %s  h=%d' % (name, show(nxt), h_of(nxt)))

    text = '\n'.join(log)
    io.open(os.path.join(HERE, 'assess1-check.txt'), 'w', encoding='utf-8').write(text)
    print('assess1-check.txt 에 적었습니다')

    facts = {
        'size': {'w': W, 'h': H},
        'start': list(START), 'goal': list(GOAL),
        'dirs_order': [d[1] for d in DIRS],
        'bfs': {'order': [{'state': list(v['state']), 'depth': v['depth']} for v in vis],
                'count': len(vis), 'solution': path, 'moves': len(path)},
        'tree2': [{'state': list(n['state']),
                   'parent': list(n['parent']) if n['parent'] else None,
                   'dir': n['dir'], 'depth': n['depth']} for n in tree],
        'astar': {'expanded': [{'state': list(e['state']), 'g': e['g'], 'h': e['h'], 'f': e['f']}
                               for e in exp],
                  'count': len(exp), 'solution': apath, 'moves': len(apath)},
        'h_start': h_of(START),
        'h_children': [{'dir': name, 'state': list(nxt), 'h': h_of(nxt)}
                       for nxt, name in moves(START)],
        'candidates': len(hits),
    }
    io.open(os.path.join(HERE, 'assess1-facts.json'), 'w', encoding='utf-8').write(
        json.dumps(facts, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
