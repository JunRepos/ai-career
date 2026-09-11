# -*- coding: utf-8 -*-
"""
verify/rulecar.py — 「자율주행차 규칙 만들기」 실습(js/games/rulecar.js)의 판과 추론 엔진 검산

선생님 학습지 「새로운 상태공간을 위한 추론」 의 조건·행동 카드로 IF-THEN 규칙(지식 베이스)을 만들고,
주행 시험 여덟 상황을 모두 통과하게 하는 실습입니다. 2026-09-11 선생님과 정한 것 —
  · 조건 빈칸 두 칸 = 「자동차가 멈춰 있다」「자동차가 달리고 있다」
  · 조건이 맞는 규칙은 모두 쓴다. 행동이 서로 다르면 「충돌」로 실패 (7차시 추론 엔진 세 걸음과 같음)
  · 「전방의 장애물을 확인한다」 는 연쇄 — 확인하면 장애물이 움직이는지가 새 사실로 드러난다
  · 한 규칙의 조건은 AND 또는 OR 한 가지로 세 개까지 (교과서 45쪽 「조건이 여러 개일 경우 AND, OR」)

이 검산기가 확인하는 것
  ① 상황마다 사실이 모순되지 않는다 — 신호 · 차 상태 · 장애물이 하나씩, 숨은 사실은 장애물이 있을 때만
  ② 모범 규칙이 여덟 상황을 모두 통과한다 — 풀 수 있는 판이다
  ③ 조건 두 개까지로는 풀 수 없는 상황이 있다 — 그래서 세 개까지 허용한다 (코드로 보임)
  ④ 가장 적은 규칙 수 — 점수는 규칙이 적을수록 높으므로 목표치로 보여 줌
  ⑤ 게임 코드의 판 데이터가 여기 값과 같고, 게임의 추론 엔진이 같은 판정을 낸다 (node 로 실행)
  ⑥ 주행 장면(js/games/rulecar-sim.js)이 판정과 맞는다 — 통과면 통과 장면, 아니면 쾅(사고)·실격 장면 ·
     움직임 대본의 시각이 차례대로다. 상황 × 고른 행동 → 장면 표를 교사용으로 뽑는다

결과 : verify/rulecar-facts.json · verify/rulecar-check.txt
"""
import io, os, json, itertools, random, re, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
JS = os.path.join(ROOT, 'js', 'games', 'rulecar.js')
SIM = os.path.join(ROOT, 'js', 'games', 'rulecar-sim.js')

# 학습지 순서 그대로 (조건 빈칸 두 칸 = stop · run)
CONDS = [
    ['green', '신호등이 녹색이다'],
    ['red', '신호등이 적색이다'],
    ['obs', '전방에 장애물이 있다'],
    ['noobs', '전방에 장애물이 없다'],
    ['stop', '자동차가 멈춰 있다'],
    ['run', '자동차가 달리고 있다'],
    ['still', '전방의 장애물이 움직이지 않는다'],
    ['ahead', '전방의 장애물이 앞으로 움직인다'],
]
ACTS = [
    ['go', '앞으로 움직인다'],
    ['halt', '멈춘다'],
    ['check', '전방의 장애물을 확인한다'],
    ['start', '출발한다'],
    ['slow', '속도를 줄인다'],
    ['wait', '기다린다'],
]
# 동시에 참일 수 없는 짝 — 규칙에 둘 다 AND 로 넣으면 영영 불리지 않는다
OPPOSITE = [['green', 'red'], ['obs', 'noobs'], ['stop', 'run'], ['still', 'ahead']]

# 주행 시험 — facts 는 처음부터 아는 사실, hidden 은 「확인한다」 를 해야 드러나는 사실
SCENARIOS = [
    {'id': 1, 'name': '빨간불 앞에 서 있다', 'facts': ['stop', 'red', 'noobs'], 'hidden': [],
     'expect': 'wait', 'needCheck': False},
    {'id': 2, 'name': '초록불로 바뀌었다', 'facts': ['stop', 'green', 'noobs'], 'hidden': [],
     'expect': 'start', 'needCheck': False},
    {'id': 3, 'name': '뻥 뚫린 길을 달린다', 'facts': ['run', 'green', 'noobs'], 'hidden': [],
     'expect': 'go', 'needCheck': False},
    {'id': 4, 'name': '달리다가 빨간불', 'facts': ['run', 'red', 'noobs'], 'hidden': [],
     'expect': 'halt', 'needCheck': False},
    {'id': 5, 'name': '앞에 차가 서 있다', 'facts': ['run', 'green', 'obs'], 'hidden': ['still'],
     'expect': 'halt', 'needCheck': True},
    {'id': 6, 'name': '앞차가 달리고 있다', 'facts': ['run', 'green', 'obs'], 'hidden': ['ahead'],
     'expect': 'slow', 'needCheck': True},
    {'id': 7, 'name': '출발하려는데 앞에 차가 있다', 'facts': ['stop', 'green', 'obs'], 'hidden': ['still'],
     'expect': 'wait', 'needCheck': True},
    {'id': 8, 'name': '빨간불인데 앞차는 움직인다', 'facts': ['run', 'red', 'obs'], 'hidden': ['ahead'],
     'expect': 'halt', 'needCheck': False},
]

# 모범 지식 베이스 — 교사용 (게임에는 보여 주지 않음)
REFERENCE = [
    {'conds': ['stop', 'red'], 'op': 'AND', 'act': 'wait'},
    {'conds': ['stop', 'green', 'noobs'], 'op': 'AND', 'act': 'start'},
    {'conds': ['run', 'green', 'noobs'], 'op': 'AND', 'act': 'go'},
    {'conds': ['run', 'red'], 'op': 'AND', 'act': 'halt'},
    {'conds': ['obs'], 'op': 'AND', 'act': 'check'},
    {'conds': ['run', 'still'], 'op': 'AND', 'act': 'halt'},
    {'conds': ['green', 'ahead'], 'op': 'AND', 'act': 'slow'},
    {'conds': ['stop', 'still'], 'op': 'AND', 'act': 'wait'},
]

ORDER = [c[0] for c in CONDS]


def matches(rule, known):
    cs = rule['conds']
    if len(cs) == 1 or rule['op'] == 'AND':
        return all(c in known for c in cs)
    return any(c in known for c in cs)


def run(rules, sc):
    """7차시 추론 엔진 세 걸음 — ① 사실과 IF 비교 ② 맞는 규칙의 THEN ③ 더 안 나올 때까지.
    한 회차에 조건이 맞는 규칙을 모두 쓰고, 「확인한다」 가 나오면 숨은 사실을 새 사실로 더합니다."""
    known = list(sc['facts'])
    fired, acts, trace = set(), [], []
    while True:
        now = [i for i, r in enumerate(rules) if i not in fired and matches(r, set(known))]
        if not now:
            break
        fired.update(now)
        new = []
        for i in now:
            a = rules[i]['act']
            if a not in acts:
                acts.append(a)
            if a == 'check':
                for h in sorted(sc['hidden'], key=ORDER.index):
                    if h not in known:
                        known.append(h)
                        new.append(h)
        trace.append({'rules': now, 'new': new})
    drive = [a for a in acts if a != 'check']
    checked = 'check' in acts
    if not drive:
        verdict = 'none'
    elif len(drive) > 1:
        verdict = 'conflict'
    elif drive[0] != sc['expect']:
        verdict = 'wrong'
    elif sc['needCheck'] and not checked:
        verdict = 'nocheck'
    else:
        verdict = 'pass'
    return {'verdict': verdict, 'acts': acts, 'trace': trace, 'known': known}


def exprs(max_n):
    """조건식 — 조건 1개, 또는 AND/OR 로 2~max_n 개"""
    out = []
    for n in range(1, max_n + 1):
        for combo in itertools.combinations(ORDER, n):
            if n == 1:
                out.append({'conds': list(combo), 'op': 'AND'})
            else:
                out.append({'conds': list(combo), 'op': 'AND'})
                out.append({'conds': list(combo), 'op': 'OR'})
    return out


def fires_visible(e, sc):
    return matches(e, set(sc['facts']))


def fires_full(e, sc):
    return matches(e, set(sc['facts']) | set(sc['hidden']))


def main():
    log, ok = [], {}
    A = dict(ACTS)
    C = dict(CONDS)

    # ① 사실이 모순되지 않는가
    bad = []
    for sc in SCENARIOS:
        f = set(sc['facts'])
        groups = [{'green', 'red'}, {'stop', 'run'}, {'obs', 'noobs'}]
        if any(len(f & g) != 1 for g in groups):
            bad.append(sc['id'])
        if sc['hidden'] and 'obs' not in f:
            bad.append(sc['id'])
        if any(set(p) <= (f | set(sc['hidden'])) for p in OPPOSITE):
            bad.append(sc['id'])
    ok['facts'] = not bad
    log.append('■ ① 상황의 사실 — %s' % ('모순 없음' if not bad else '⚠ 모순: %s' % bad))

    # 같은 사실인데 답이 다른 상황이 있으면 풀 수 없음
    seen = {}
    dup = []
    for sc in SCENARIOS:
        key = (tuple(sorted(sc['facts'])), tuple(sorted(sc['hidden'])))
        if key in seen and seen[key] != sc['expect']:
            dup.append(sc['id'])
        seen[key] = sc['expect']
    ok['unique'] = not dup

    # ② 모범 규칙
    log.append('')
    log.append('■ ② 모범 규칙 %d개로 주행 시험' % len(REFERENCE))
    for i, r in enumerate(REFERENCE, 1):
        log.append('   R%d  IF %s THEN %s' % (i, (' %s ' % r['op']).join(C[c] for c in r['conds']), A[r['act']]))
    ref_results = []
    for sc in SCENARIOS:
        res = run(REFERENCE, sc)
        ref_results.append(res['verdict'])
        steps = []
        for t in res['trace']:
            s = ' + '.join('R%d' % (i + 1) for i in t['rules'])
            if t['new']:
                s += ' (새 사실: %s)' % ', '.join(C[h] for h in t['new'])
            steps.append(s)
        log.append('   %d %-16s %-5s  %s  →  %s' % (sc['id'], sc['name'], res['verdict'],
                   ' → '.join(A[a] for a in res['acts']), ' / '.join(steps)))
    ok['reference'] = all(v == 'pass' for v in ref_results)

    # ③ 조건 두 개까지로 풀 수 있는가
    #    어떤 행동 a 의 규칙이 상황 s 에서 불려야 하는데, 그 조건식이 답이 a 가 아닌 상황 t 에서
    #    처음부터 아는 사실만으로도 불린다면 t 에서 반드시 충돌·틀린 행동이 난다.
    log.append('')
    log.append('■ ③ 조건 두 개까지로는 풀 수 없는 상황')
    E2 = exprs(2)
    unsolvable = []
    for sc in SCENARIOS:
        a = sc['expect']
        others = [t for t in SCENARIOS if t['expect'] != a]
        cand = [e for e in E2 if fires_full(e, sc) and not any(fires_visible(e, t) for t in others)]
        if not cand:
            unsolvable.append(sc['id'])
            kill = []
            for e in [e for e in E2 if fires_full(e, sc)][:3]:
                t = next(t for t in others if fires_visible(e, t))
                kill.append('%s → 상황 %d 에서도 불림' % ((' %s ' % e['op']).join(C[c] for c in e['conds']), t['id']))
            log.append('   상황 %d 「%s」 (%s) — 두 조건 규칙은 모두 다른 상황에서도 불림. 예: %s'
                       % (sc['id'], sc['name'], A[a], ' / '.join(kill)))
    ok['need3'] = bool(unsolvable)
    log.append('   → 조건을 세 개까지 잇게 합니다' if unsolvable else '   (두 조건으로도 풀림 — 세 개는 필요 없음)')

    # ④ 가장 적은 규칙 수 (조건 세 개까지)
    #    행동마다 「답이 그 행동인 상황에서만 불리는」 조건식으로 그 상황들을 덮는 가장 작은 수 + 확인 규칙 1개
    log.append('')
    log.append('■ ④ 가장 적은 규칙 수 (조건 세 개까지)')
    E3 = exprs(3)
    total, best_rules = 0, []
    for a in [x[0] for x in ACTS if x[0] != 'check']:
        T = {sc['id'] for sc in SCENARIOS if sc['expect'] == a}
        if not T:
            continue
        good = []
        for e in E3:
            F = {sc['id'] for sc in SCENARIOS if fires_full(e, sc)}
            if F and F <= T:
                good.append((e, F))
        found = None
        for k in range(1, len(T) + 1):
            for pick in itertools.combinations(good, k):
                if set().union(*[F for _, F in pick]) == T:
                    found = pick
                    break
            if found:
                break
        total += len(found)
        best_rules += [dict(e, act=a) for e, _ in found]
        log.append('   %-8s 상황 %s — %d개' % (A[a], sorted(T), len(found)))
    total += 1
    best_rules.append({'conds': ['obs'], 'op': 'AND', 'act': 'check'})
    best_pass = all(run(best_rules, sc)['verdict'] == 'pass' for sc in SCENARIOS)
    ok['min'] = best_pass and total == len(REFERENCE)
    log.append('   확인 규칙 1개 더해 모두 %d개 · 이 규칙들로 돌리면 %s' % (total, '모두 통과' if best_pass else '⚠ 실패'))

    facts = {
        'conds': CONDS, 'acts': ACTS, 'opposite': OPPOSITE,
        'scenarios': SCENARIOS, 'reference': REFERENCE,
        'minRules': total, 'maxConds': 3, 'need3': unsolvable,
    }
    # 게임에 옮기는 판 데이터 — 모범 답은 학생 브라우저로 나가지 않게 뺍니다
    facts_js = {k: v for k, v in facts.items() if k != 'reference'}

    # ⑤ 게임 코드와 대조
    log.append('')
    if os.path.exists(JS):
        src = io.open(JS, encoding='utf-8').read()
        m = re.search(r'/\* ═══ 판 데이터 시작[^\n]*\*/\s*const RC_DATA = (\{.*?\});\s*/\* ═══ 판 데이터 끝', src, re.S)
        same = False
        if m:
            js_data = json.loads(m.group(1))
            same = js_data == facts_js
        ok['js_data'] = same
        log.append('■ ⑤ 게임 판 데이터 — %s' % ('이 검산기와 같음' if same else '⚠ 다름 (아래 JSON 을 게임에 옮기세요)'))
        # 게임의 추론 엔진을 node 로 돌려 판정 대조 — 모범 규칙 + 무작위 지식 베이스 200개
        rnd = random.Random(20260911)
        sets = [REFERENCE]
        for _ in range(200):
            n = rnd.randint(1, 9)
            rs = []
            for _ in range(n):
                k = rnd.randint(1, 3)
                rs.append({'conds': rnd.sample(ORDER, k), 'op': rnd.choice(['AND', 'OR']),
                           'act': rnd.choice([x[0] for x in ACTS])})
            sets.append(rs)
        want = [[run(rs, sc)['verdict'] for sc in SCENARIOS] for rs in sets]
        want_acts = [[run(rs, sc)['acts'] for sc in SCENARIOS] for rs in sets]
        runner = ("const fs=require('fs'),vm=require('vm');"
                  "const ctx={console,SEL_CLS:null,ST_USER:null,render(){},esc:s=>s,localStorage:null};"
                  "vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);"
                  "const sets=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));"
                  "vm.runInContext(fs.readFileSync(process.argv[4],'utf8'),ctx);const G=n=>vm.runInContext(n,ctx);"
                  "const tok=s=>Number.isFinite(s.D)&&s.D>0&&['me','obs','rear','cross'].every(k=>!s[k]||s[k].every((p,i,a)=>"
                  "p.slice(0,4).every(v=>v==null||Number.isFinite(v))&&p[0]<=s.D&&(i===0||p[0]>a[i-1][0])));"
                  "const scene=(sc,r)=>{const o=G('rcOutcome')(sc,r);return [o.kind,o.crash,tok(G('_rsScript')(sc,r,o))]};"
                  "const out=sets.map(rs=>G('RC_DATA').scenarios.map(sc=>{const r=G('rcRun')(rs,sc);return [r.verdict,r.acts].concat(scene(sc,r))}));"
                  "const syn=JSON.parse(fs.readFileSync(process.argv[5],'utf8')).map(c=>scene(G('RC_DATA').scenarios[c.i],c.r));"
                  "process.stdout.write(JSON.stringify({out,syn}));")
        with tempfile.TemporaryDirectory() as td:
            sf = os.path.join(td, 'sets.json')
            rf = os.path.join(td, 'run.js')
            io.open(sf, 'w', encoding='utf-8').write(json.dumps(sets, ensure_ascii=False))
            io.open(rf, 'w', encoding='utf-8').write(runner)
            # 장면 표용 — 상황마다 「고른 행동」 을 직접 넣어 봄 (확인 안 함 / 확인함)
            DEC = [('규칙 없음', []), ('충돌', ['go', 'halt'])] + [(t, [a]) for a, t in ACTS if a != 'check']
            def verdict_of(acts, sc):
                d = [a for a in acts if a != 'check']
                if not d: return 'none'
                if len(d) > 1: return 'conflict'
                if d[0] != sc['expect']: return 'wrong'
                if sc['needCheck'] and 'check' not in acts: return 'nocheck'
                return 'pass'
            syn = [{'i': j, 'r': {'verdict': verdict_of(pre + d, sc), 'acts': pre + d}}
                   for j, sc in enumerate(SCENARIOS) for _, d in DEC for pre in ([], ['check'])]
            yf = os.path.join(td, 'syn.json')
            io.open(yf, 'w', encoding='utf-8').write(json.dumps(syn))
            try:
                p = subprocess.run(['node', rf, JS, sf, SIM, yf], capture_output=True, timeout=120)
                both = json.loads(p.stdout.decode('utf-8'))
                got = both['out']
                agree = all(got[i][j][0] == want[i][j] and got[i][j][1] == want_acts[i][j]
                            for i in range(len(sets)) for j in range(len(SCENARIOS)))
                ok['js_engine'] = agree
                log.append('■ ⑤ 게임 추론 엔진 — 지식 베이스 %d개 × 상황 %d개 판정이 %s'
                           % (len(sets), len(SCENARIOS), '모두 같음' if agree else '⚠ 다름'))
                cells = [g for row in got for g in row] + [[x['r']['verdict'], x['r']['acts']] + y
                                                             for x, y in zip(syn, both['syn'])]
                scene_ok = all(g[2] in ('pass', 'crash', 'dq') and (g[2] == 'pass') == (g[0] == 'pass') and g[4]
                               for g in cells)
                ok['js_scene'] = scene_ok
                log.append('■ ⑥ 주행 장면 — %d가지 판정 모두 %s' % (len(cells),
                           '장면 종류가 맞고 움직임 대본도 차례대로' if scene_ok else '⚠ 어긋남'))
                LAB = {'cross': '쾅 교차로', 'front': '쾅 선 앞차', 'chase': '쾅 가는 앞차', 'rear': '쾅 뒤차', 'spin': '쾅 휘청'}
                name = lambda y: '통과' if y[0] == 'pass' else '실격' if y[0] == 'dq' else LAB[y[1]]
                log.append('   교사용 표 — 추론 엔진이 고른 행동별 장면 (앞: 확인 안 함 / 뒤: 확인함)')
                log.append('   ' + ' | '.join(['상황'] + [t for t, _ in DEC]))
                k = 0
                for sc in SCENARIOS:
                    row = []
                    for _ in DEC:
                        a, b = name(both['syn'][k]), name(both['syn'][k + 1])
                        row.append(a if a == b else a + ' / ' + b)
                        k += 2
                    log.append('   ' + ' | '.join(['%d %s' % (sc['id'], sc['name'])] + row))
            except Exception as ex:
                ok['js_engine'] = False
                log.append('■ ⑤ 게임 추론 엔진 — ⚠ node 실행 실패: %s %s' % (ex, p.stderr.decode('utf-8', 'replace')[:300] if 'p' in dir() else ''))
    else:
        log.append('■ ⑤ 게임 코드가 아직 없습니다 — js/games/rulecar.js 를 만든 뒤 다시 돌리세요')

    log.append('')
    log.append('■ 결과 : %s' % ('모두 통과' if all(ok.values()) else '⚠ 확인 필요 %s' % ok))
    facts_out = dict(facts, ok=ok)
    io.open(os.path.join(HERE, 'rulecar-facts.json'), 'w', encoding='utf-8').write(
        json.dumps(facts_out, ensure_ascii=False, indent=1))
    io.open(os.path.join(HERE, 'rulecar-check.txt'), 'w', encoding='utf-8').write('\n'.join(log) + '\n')
    io.open(os.path.join(HERE, 'rulecar-data.json'), 'w', encoding='utf-8').write(
        json.dumps(facts_js, ensure_ascii=False))
    print('ok' if all(ok.values()) else 'CHECK %s' % ok)


if __name__ == '__main__':
    main()
