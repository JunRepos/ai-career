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


# ────────────────────────────────────────────────
# 휴리스틱 두 가지 — 평가계획서가 "두 휴리스틱 값을 계산하고 하나를 고르기" 를 요구합니다
#   h1 = 제자리에 없는 타일 수 (교과서 37쪽)
#   h2 = 맨해튼 거리의 합 (교과서 밖 — 채팅으로 보고했습니다)
# 둘 다 실제 남은 비용을 넘지 않아야 하고(허용 가능), h1 ≤ h2 여야 h2 가 더 좋은 추정입니다.
# ────────────────────────────────────────────────
def h_manhattan(state, goal=GOAL):
    tot = 0
    for i, v in enumerate(state):
        if v == 0:
            continue
        j = goal.index(v)
        tot += abs(i // W - j // W) + abs(i % W - j % W)
    return tot


def true_cost(start, goal=GOAL):
    """그 상태에서 목표까지의 실제 최소 이동 횟수"""
    from collections import deque
    if start == goal:
        return 0
    seen = {start}
    q = deque([(start, 0)])
    while q:
        st, d = q.popleft()
        for nxt, _ in moves(st):
            if nxt in seen:
                continue
            if nxt == goal:
                return d + 1
            seen.add(nxt)
            q.append((nxt, d + 1))
    return None


def astar_with(start, hf, goal=GOAL):
    """f = g + h · f 가 같으면 h 가 작은 것 먼저"""
    tie = count()
    open_list = [(hf(start), hf(start), next(tie), start, [])]
    best = {start: 0}
    expanded, closed = [], set()
    while open_list:
        f, hh, _, st, path = heapq.heappop(open_list)
        if st in closed:
            continue
        closed.add(st)
        g = len(path)
        expanded.append({'state': st, 'g': g, 'h': hf(st), 'f': g + hf(st), 'path': list(path)})
        if st == goal:
            return expanded, path
        for nxt, name in moves(st):
            if nxt in closed:
                continue
            ng = g + 1
            if nxt in best and best[nxt] <= ng:
                continue
            best[nxt] = ng
            heapq.heappush(open_list, (ng + hf(nxt), hf(nxt), next(tie), nxt, path + [name]))
    return expanded, None


def pick():
    """평가지에 쓸 판 고르기 — **평가계획서의 평가요소**를 그대로 만족하는 판을 전수 조사합니다.

    ① 빈칸이 가운데 열(자식 3개)        — ① 「가능한 다음 상태를 모두」 를 물으려면 갈래가 있어야 합니다
    ② 최단 해 4~6수                     — ③ 「일정 깊이까지 전개해도 목표에 도달하지 못함」 이 성립해야 합니다
    ③ 너비 우선 방문 10~20개            — 손으로 셀 수 있는 범위
    ④ A*(h1) 5~10개                     — ⑤ 가 표로 들어갈 만한 길이
    ⑤ h1 ≤ h2 ≤ 실제 남은 비용 (확장한 모든 상태에서)
    ⑥ **A*(h2) 가 A*(h1) 보다 적게 확장** — ④ 「더 큰 값을 주는 휴리스틱이 탐색량을 줄인다」 의 근거

    이 조건을 다 만족하는 판은 359개 중 **하나뿐**입니다.
    """
    hits = []
    for p in permutations(range(6)):
        if p == GOAL or len(moves(p)) < 3:
            continue
        vis, path = bfs(p)
        if path is None or not (4 <= len(path) <= 6) or not (10 <= len(vis) <= 20):
            continue
        e1, _ = astar_with(p, h_of)
        e2, _ = astar_with(p, h_manhattan)
        if not (5 <= len(e1) <= 10) or len(e2) >= len(e1):
            continue
        ok = True
        for st in set([x['state'] for x in e1] + [x['state'] for x in e2]):
            t = true_cost(st)
            if t is None or not (h_of(st) <= h_manhattan(st) <= t):
                ok = False
                break
        if not ok:
            continue
        hits.append({'start': p, 'bfs': len(vis), 'sol': len(path),
                     'e1': len(e1), 'e2': len(e2), 'h1': h_of(p), 'h2': h_manhattan(p)})
    return hits


def show(state):
    return ' '.join('_' if v == 0 else str(v) for v in state[:W]) + ' / ' + \
           ' '.join('_' if v == 0 else str(v) for v in state[W:])


def main():
    log = []
    say = log.append

    hits = pick()
    say('■ 평가계획서의 평가요소를 모두 만족하는 판 : %d개' % len(hits))
    for x in hits:
        say('   %s  (최단 %d수 · BFS %d · A*(h1) %d · A*(h2) %d)'
            % (show(x['start']), x['sol'], x['bfs'], x['e1'], x['e2']))
    START = hits[0]['start']

    say('')
    say('■ 문제 판')
    say('   초기 상태  %s' % show(START))
    say('   목표 상태  %s' % show(GOAL))

    # ① 상태 공간으로 표현하기 — 가능한 다음 상태 모두
    say('')
    say('■ ① 초기 상태에서 가능한 다음 상태 (빈칸 이동 위·아래·왼·오른 순)')
    nexts = moves(START)
    for nxt, name in nexts:
        say('   %s 으로 → %s' % (name, show(nxt)))

    # ② 깊이 2 트리
    tree = depth2_tree(START)
    d1 = [n for n in tree if n['depth'] == 1]
    d2 = [n for n in tree if n['depth'] == 2]
    say('')
    say('■ ② 깊이 2 탐색 트리 — 노드 %d개 (뿌리 1 · 깊이1 %d · 깊이2 %d)'
        % (len(tree), len(d1), len(d2)))
    for n in tree[1:]:
        say('   깊이%d  %s  ← %s (부모 %s)' % (n['depth'], show(n['state']), n['dir'], show(n['parent'])))
    # 중복 상태 — 자식이 조부모와 같아지는 자리
    dup = 0
    for n in d1:
        for nxt, name in moves(n['state']):
            if nxt == START:
                dup += 1
    say('   ↺ 부모로 되돌아가는 중복 상태 %d곳 — 학생은 여기에 ✕ 를 칩니다' % dup)

    # ③ 너비 우선
    vis, path = bfs(START)
    say('')
    say('■ ③ 너비 우선 탐색')
    say('   깊이 2까지 방문 순서 (%d개)' % sum(1 for v in vis if v['depth'] <= 2))
    for i2, v in enumerate([v for v in vis if v['depth'] <= 2], 1):
        say('   %2d. %s (깊이 %d)' % (i2, show(v['state']), v['depth']))
    say('   → 깊이 2까지 전개해도 목표가 나오지 않습니다 (최단 %d수)' % len(path))
    say('   목표를 찾을 때까지 방문한 상태 : %d개' % len(vis))

    # ④ 두 휴리스틱
    say('')
    say('■ ④ 휴리스틱 두 가지')
    say('   h1 = 제자리에 없는 타일 수 · h2 = 맨해튼 거리의 합')
    say('   상태                     h1   h2   실제 남은 비용')
    rows = [{'label': '초기 상태', 'state': START}] +            [{'label': '%s 으로' % nm, 'state': st} for st, nm in nexts]
    for r in rows:
        st = r['state']
        say('   %-9s %s   %2d   %2d      %2d'
            % (r['label'], show(st), h_of(st), h_manhattan(st), true_cost(st)))
    say('   → 두 값 모두 실제 비용을 넘지 않고, 언제나 h1 ≤ h2 입니다 (h2 가 더 좋은 추정)')

    # ⑤ A* — 두 휴리스틱으로 각각
    e1, p1 = astar_with(START, h_of)
    e2, p2 = astar_with(START, h_manhattan)
    say('')
    say('■ ⑤ A* 탐색')
    say('   h2(맨해튼 거리)로 — 확장 %d개' % len(e2))
    for i2, e in enumerate(e2, 1):
        say('   %d. %s  g=%d h=%d f=%d' % (i2, show(e['state']), e['g'], e['h'], e['f']))
    say('   찾은 경로 : %s (%d수)' % (' → '.join(p2), len(p2)))
    say('   h1(제자리에 없는 타일 수)로 하면 확장 %d개 — h2 가 %d개 적습니다'
        % (len(e1), len(e1) - len(e2)))

    # ⑥ 논술 근거
    say('')
    say('■ ⑥ 논술의 근거가 되는 수')
    say('   너비 우선 %d개  vs  A*(h2) %d개' % (len(vis), len(e2)))

    text = chr(10).join(log)
    io.open(os.path.join(HERE, 'assess1-check.txt'), 'w', encoding='utf-8').write(text)
    print('assess1-check.txt 에 적었습니다')

    facts = {
        'size': {'w': W, 'h': H},
        'start': list(START), 'goal': list(GOAL),
        'dirs_order': [d[1] for d in DIRS],
        'nexts': [{'dir': nm, 'state': list(st), 'h1': h_of(st), 'h2': h_manhattan(st),
                   'true': true_cost(st)} for st, nm in nexts],
        'tree2': [{'state': list(n['state']),
                   'parent': list(n['parent']) if n['parent'] else None,
                   'dir': n['dir'], 'depth': n['depth']} for n in tree],
        'dup_spots': dup,
        'bfs': {'order': [{'state': list(v['state']), 'depth': v['depth']} for v in vis],
                'depth2': [{'state': list(v['state']), 'depth': v['depth']}
                           for v in vis if v['depth'] <= 2],
                'count': len(vis), 'solution': path, 'moves': len(path)},
        'h_start': {'h1': h_of(START), 'h2': h_manhattan(START), 'true': true_cost(START)},
        'astar_h2': {'expanded': [{'state': list(e['state']), 'g': e['g'], 'h': e['h'], 'f': e['f']}
                                  for e in e2],
                     'count': len(e2), 'solution': p2, 'moves': len(p2)},
        'astar_h1_count': len(e1),
        'candidates': len(hits),
    }
    io.open(os.path.join(HERE, 'assess1-facts.json'), 'w', encoding='utf-8').write(
        json.dumps(facts, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
