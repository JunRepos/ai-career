# -*- coding: utf-8 -*-
"""
verify/lesson7.py — 7차시(지식의 표현과 추론) 검산

교과서 43~47쪽. 여기서 '검산' 은 추론이 **정말로 그 결론을 내놓는지** 돌려 보는 것입니다.

  ① 그림 Ⅰ-16 — 지식 베이스 {A→B, B→F, C→K} 에 사실 A 를 넣으면 F 가 나오는가
  ② 삼단 논법 — ∀x 인간(x)→죽는다(x) · 인간(소크라테스) ⊢ 죽는다(소크라테스)
  ③ 규칙(표 Ⅰ-5·Ⅰ-6) — 조건이 맞을 때만 행동이 나오는가
  ④ 명제 논리 진리표 — NOT · AND · OR · → 를 실제로 계산

결과는 verify/lesson7-facts.json · verify/lesson7-check.txt
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))


# ────────────────────────────────────────────────
# ① 전향 추론 (forward chaining) — 그림 Ⅰ-16
# ────────────────────────────────────────────────
KB = [('A', 'B'), ('B', 'F'), ('C', 'K')]        # if A, then B …


def forward(facts, kb):
    """새 사실이 안 나올 때까지 규칙을 되풀이 적용합니다. 적용 기록도 남깁니다."""
    known, trace = set(facts), []
    changed = True
    while changed:
        changed = False
        for a, b in kb:
            if a in known and b not in known:
                known.add(b)
                trace.append('if %s, then %s  →  %s 를 얻음' % (a, b, b))
                changed = True
    return known, trace


# ────────────────────────────────────────────────
# ② 술어 논리 삼단 논법 — 변수 자리에 대입
# ────────────────────────────────────────────────
def syllogism(subject):
    """∀x, 인간(x) → 죽는다(x) 에 인간(소크라테스) 를 대입"""
    rule = ('인간', '죽는다')
    fact = ('인간', subject)
    if fact[0] == rule[0]:
        return ('%s(%s)' % (rule[1], subject), 'x 에 %s 를 대입' % subject)
    return (None, '전제와 술어가 달라 결론을 못 냅니다')


# ────────────────────────────────────────────────
# ③ 규칙 — 표 Ⅰ-5 · Ⅰ-6
# ────────────────────────────────────────────────
RULES = [
    {'if': ['신호등이 녹색불이다'], 'op': None, 'then': '횡단보도를 건넌다'},
    {'if': ['눈이 충혈되었다', '눈을 깜빡일 때 통증이 느껴진다'], 'op': 'AND', 'then': '결막염을 진단한다'},
    {'if': ['눈물의 양이 적다', '눈에 피로감을 느낀다'], 'op': 'OR', 'then': '인공 눈물을 처방한다'},
]


def fire(rule, facts):
    hits = [c in facts for c in rule['if']]
    if rule['op'] == 'AND': return all(hits)
    if rule['op'] == 'OR':  return any(hits)
    return hits[0]


# ────────────────────────────────────────────────
# ④ 명제 논리 진리표 — 표 Ⅰ-4
# ────────────────────────────────────────────────
def truth_rows():
    rows = []
    for A in (True, False):
        for B in (True, False):
            rows.append({'A': A, 'B': B,
                         'NOT A': (not A),
                         'A AND B': (A and B),
                         'A OR B': (A or B),
                         'A → B': ((not A) or B)})
    return rows


def main():
    log = []
    say = log.append

    # ①
    known, trace = forward({'A'}, KB)
    say('■ ① 지식 베이스에 사실 A 를 넣었을 때 (교과서 43쪽 그림 Ⅰ-16)')
    for t in trace:
        say('   ' + t)
    say('   얻은 사실 : %s' % ', '.join(sorted(known)))
    ok1 = 'F' in known and 'K' not in known
    say('   교과서 대조 : %s (A 를 넣으면 F 가 나오고, K 는 나오지 않습니다)'
        % ('일치' if ok1 else '어긋남'))

    # ②
    concl, how = syllogism('소크라테스')
    say('')
    say('■ ② 삼단 논법 (교과서 45쪽 그림 Ⅰ-17)')
    say('   대전제 ∀x, 인간(x) → 죽는다(x)')
    say('   소전제 인간(소크라테스)')
    say('   결론   %s   [%s]' % (concl, how))
    ok2 = concl == '죽는다(소크라테스)'

    # ③
    say('')
    say('■ ③ 규칙 (교과서 45쪽 표 Ⅰ-5·Ⅰ-6)')
    cases = [
        ({'신호등이 녹색불이다'}, 0, True),
        ({'눈이 충혈되었다'}, 1, False),                                   # AND 라 하나만으론 안 됨
        ({'눈이 충혈되었다', '눈을 깜빡일 때 통증이 느껴진다'}, 1, True),
        ({'눈에 피로감을 느낀다'}, 2, True),                                # OR 라 하나만으로 됨
    ]
    ok3 = True
    for facts, i, expect in cases:
        got = fire(RULES[i], facts)
        ok3 = ok3 and (got == expect)
        say('   %s → %s : %s' % (' · '.join(sorted(facts)), RULES[i]['then'],
                                 '행동함' if got else '행동 안 함'))

    # ④
    say('')
    say('■ ④ 복합 명제 (교과서 44쪽 표 Ⅰ-4)')
    rows = truth_rows()
    say('   A B | NOT A | A AND B | A OR B | A → B')
    for r in rows:
        say('   %s %s |   %s   |    %s    |   %s   |   %s' % (
            'T' if r['A'] else 'F', 'T' if r['B'] else 'F',
            'T' if r['NOT A'] else 'F', 'T' if r['A AND B'] else 'F',
            'T' if r['A OR B'] else 'F', 'T' if r['A → B'] else 'F'))

    text = '\n'.join(log)
    io.open(os.path.join(HERE, 'lesson7-check.txt'), 'w', encoding='utf-8').write(text)
    print('lesson7-check.txt 에 적었습니다')

    facts = {
        'kb': [{'if': a, 'then': b} for a, b in KB],
        'chain': {'input': 'A', 'trace': trace, 'known': sorted(known), 'output': 'F'},
        'syllogism': {'major': '∀x, 인간(x) → 죽는다(x)', 'minor': '인간(소크라테스)',
                      'conclusion': concl},
        'rules': RULES,
        'truth': rows,
        'repr': [
            {'name': '명제 논리', 'desc': '기호를 사용하여 명제를 표현하는 방법'},
            {'name': '술어 논리', 'desc': '술어와 변수로 개체와 속성, 관계를 표현'},
            {'name': '규칙', 'desc': '조건과 행동을 서술하는 표현 방법'},
            {'name': '의미망', 'desc': '거미줄과 같은 구조로 개념 간의 관계를 나타냄'},
            {'name': '지식 그래프', 'desc': '정보를 그래프의 형식으로 나타냄'},
        ],
        'ok': {'chain': ok1, 'syllogism': ok2, 'rules': ok3},
    }
    io.open(os.path.join(HERE, 'lesson7-facts.json'), 'w', encoding='utf-8').write(
        json.dumps(facts, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
