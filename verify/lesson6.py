# -*- coding: utf-8 -*-
"""
5차시(엑셀 기준) 지능적 탐색 — 산 오르기 판 검산
슬라이드에 넣을 순서·횟수는 전부 여기서 나온 값만 씁니다.
"""
import io, sys, json

# 지점: 고도(m)
H = {'S':200, 'A':600, 'B':500, 'C':800, 'D':300,
     'E':400, 'F':350, 'G':900, 'H':450, 'T':1200}

# 등산로 (양방향)
EDGES = [('S','A'), ('S','B'), ('A','C'), ('A','D'),
         ('C','E'), ('C','F'), ('B','G'), ('B','H'), ('G','T')]

ADJ = {k: [] for k in H}
for a, b in EDGES:
    ADJ[a].append(b); ADJ[b].append(a)
for k in ADJ:                       # 자식 순서를 고도 상관없이 적은 순서로 고정
    pass

GOAL = 'T'          # 정상 표지판이 있는 곳
START = 'S'

def hill_climb():
    """언덕 오르기 — 지금 지점의 이웃 중 가장 높은 곳으로. 더 높은 곳이 없으면 멈춘다."""
    cur = START
    path = [cur]
    log = []
    while True:
        nb = ADJ[cur]
        best = max(nb, key=lambda n: H[n])
        log.append((cur, H[cur], [(n, H[n]) for n in nb], best, H[best]))
        if H[best] <= H[cur]:
            return path, log, (cur == GOAL)
        cur = best
        path.append(cur)

def best_first():
    """최상 우선 — 오픈 리스트에서 평갓값(고도)이 가장 높은 것을 골라 테스트."""
    open_list = [START]
    closed = []
    steps = []
    tested = 0
    while open_list:
        cur = max(open_list, key=lambda n: H[n])
        open_list.remove(cur)
        tested += 1
        if cur == GOAL:
            closed.append(cur)
            steps.append(dict(pick=cur, goal=True,
                              open=sorted(open_list, key=lambda n: -H[n]),
                              closed=list(closed)))
            return steps, tested, True
        kids = [n for n in ADJ[cur] if n not in closed and n not in open_list]
        open_list.extend(kids)
        closed.append(cur)
        steps.append(dict(pick=cur, goal=False, gen=kids,
                          open=sorted(open_list, key=lambda n: -H[n]),
                          closed=list(closed)))
    return steps, tested, False

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    p, log, ok = hill_climb()
    print('■ 언덕 오르기')
    for cur, hc, nb, best, hb in log:
        print(f"  {cur}({hc}) 이웃 {nb} → 가장 높은 곳 {best}({hb})"
              + ("  ⇒ 더 높은 곳 없음. 멈춤" if hb <= hc else ""))
    print(f"  경로 {' → '.join(p)}   정상 도달? {ok}   이동 {len(p)-1}회, 테스트 {len(p)}곳")

    steps, tested, ok2 = best_first()
    print('\n■ 최상 우선 탐색')
    for i, s in enumerate(steps, 1):
        o = ', '.join(f"{n}({H[n]})" for n in s['open']) or '—'
        c = ', '.join(f"{n}({H[n]})" for n in s['closed'])
        if s['goal']:
            print(f"  {i}. {s['pick']}({H[s['pick']]}) 선택 → 정상! 종료")
        else:
            g = ', '.join(f"{n}({H[n]})" for n in s['gen']) or '없음'
            print(f"  {i}. {s['pick']}({H[s['pick']]}) 선택 · 정상 아님 · 자식 {g}")
        print(f"      오픈 [{o}]  /  닫힌 [{c}]")
    print(f"  테스트한 지점 {tested}곳 / 전체 {len(H)}곳   정상 도달? {ok2}")
    print(f"  테스트 순서 — {' – '.join(s['pick'] for s in steps)}")

    facts = {
      'heights': H,
      'edges': EDGES,
      'hill_path': p, 'hill_stop': p[-1], 'hill_reached_goal': ok,
      'bf_order': [s['pick'] for s in steps], 'bf_tested': tested,
      'bf_total_nodes': len(H),
    }
    open('verify/lesson6-facts.json','w',encoding='utf-8').write(json.dumps(facts, ensure_ascii=False, indent=2))
