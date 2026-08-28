# -*- coding: utf-8 -*-
"""
균일 비용 탐색 — 교과서 32~33쪽 '도시 방문 경로 찾기' 검산

교과서 33쪽의 6단계 진행표를 그대로 재현합니다. 슬라이드에 쓰는 오픈/닫힌 리스트,
누적 비용, 테스트 횟수는 전부 여기서 나온 값만 씁니다.

교과서 안내 (32쪽)
  ① 초기 상태가 목표 상태이면 마친다.
  ② 초기 상태에서 갈 수 있는 간선에 따라 자식 상태를 생성하여 오픈 리스트에 넣는다.
  ③ 오픈 리스트에서 누적 비용의 값이 가장 작은 상태를 다음 순서로 선택한다.
  ④ 선택된 상태가 목표 상태인지 테스트한다.
       목표 상태이면 작업을 끝낸다.
       아니면 자식 상태를 생성하여 오픈 리스트에 넣고 ③으로 돌아간다.
     이때 오픈 리스트에 똑같은 상태 노드가 있으면 더 작은 비용을 가지는 상태만 남겨 둔다.
"""
import io, sys, json

# 도시 사이 이동 시간 (교과서 그림 Ⅰ-10)
EDGES = [('a', 'b', 5), ('a', 'c', 4), ('b', 'c', 5),
         ('b', 'd', 8), ('b', 'e', 9), ('c', 'd', 3), ('d', 'e', 5)]
START, GOAL = 'a', 'e'

ADJ = {}
for u, v, w in EDGES:
    ADJ.setdefault(u, []).append((v, w))
    ADJ.setdefault(v, []).append((u, w))
for k in ADJ:                       # 자식은 이름 순으로 (교과서 그림 순서와 같습니다)
    ADJ[k].sort()


def uniform_cost():
    """교과서 안내 그대로. 오픈 리스트는 {도시: 누적비용} 으로 둡니다
       (같은 도시가 둘 있으면 작은 것만 남기라고 했으므로)."""
    open_list = {START: 0}
    closed = {}
    parent = {START: None}
    steps = []
    tested = 0

    while open_list:
        # ③ 누적 비용이 가장 작은 것
        cur = min(open_list, key=lambda n: (open_list[n], n))
        g = open_list.pop(cur)
        tested += 1
        closed[cur] = g

        if cur == GOAL:                                  # ④ 목표면 끝
            steps.append(dict(pick=cur, g=g, goal=True, gen=[], drop=[],
                              open=dict(open_list), closed=dict(closed)))
            path = []
            n = cur
            while n is not None:
                path.append(n); n = parent[n]
            return steps, tested, list(reversed(path)), g

        gen, drop = [], []
        for nb, w in ADJ[cur]:
            ng = g + w
            if nb in closed:                             # 이미 테스트된 상태는 제외
                drop.append(f'{nb}(이미 테스트됨)')
                continue
            if nb in open_list:
                if ng < open_list[nb]:                   # 더 작은 것만 남긴다
                    drop.append(f'{nb}({open_list[nb]}) → {nb}({ng}) 로 교체')
                    open_list[nb] = ng; parent[nb] = cur
                    gen.append((nb, ng))
                else:
                    drop.append(f'{nb}({ng}) 제외 · 기존 {nb}({open_list[nb]}) 가 작음')
                continue
            open_list[nb] = ng; parent[nb] = cur
            gen.append((nb, ng))

        steps.append(dict(pick=cur, g=g, goal=False, gen=gen, drop=drop,
                          open=dict(open_list), closed=dict(closed)))
    return steps, tested, None, None


def fmt(d):
    return ', '.join(f'{k}({v})' for k, v in sorted(d.items(), key=lambda x: (x[1], x[0]))) or '—'


if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    steps, tested, path, cost = uniform_cost()
    print('■ 균일 비용 탐색 — 도시 a 에서 e 까지')
    for i, s in enumerate(steps, 1):
        if s['goal']:
            print(f"  {i}. {s['pick']}({s['g']}) 선택 → 목적지! 종료")
        else:
            g = ', '.join(f'{n}({v})' for n, v in s['gen']) or '없음'
            print(f"  {i}. {s['pick']}({s['g']}) 선택 · 목적지 아님 · 자식 {g}")
            for d in s['drop']:
                print(f"       · {d}")
        print(f"       오픈 [{fmt(s['open'])}]  /  닫힌 [{fmt(s['closed'])}]")
    print(f"\n  최단 경로 — {' → '.join(path)}   경로 비용 {cost}")
    print(f"  테스트한 상태 {tested}개")

    print('\n■ 교과서 33쪽과 대조')
    want = {
        '테스트 횟수': (tested, 5),
        '최단 경로': ('→'.join(path), 'a→c→d→e'),
        '경로 비용': (cost, 12),
        '테스트 순서': ('-'.join(s['pick'] for s in steps), 'a-c-b-d-e'),
    }
    ok = True
    for k, (got, exp) in want.items():
        good = got == exp
        ok &= good
        print(f"  {'✔' if good else '✖'} {k}: {got}" + ('' if good else f'  (교과서 {exp})'))
    if not ok:
        sys.exit('✖ 교과서와 다릅니다.')
    print('\n✔ 교과서 33쪽 진행표와 일치')
    json.dump({'path': path, 'cost': cost, 'tested': tested,
               'order': [s['pick'] for s in steps]},
              open('verify/lesson5-uniform-facts.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
