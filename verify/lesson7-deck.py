# -*- coding: utf-8 -*-
"""
verify/lesson7-deck.py — 7차시(지식의 표현과 추론) 덱 JSON 만들기

⚠ 추론 결과·진리표는 손으로 적지 않습니다. verify/lesson7.py 가 돌려서 내놓은
   verify/lesson7-facts.json 을 읽어 씁니다. (CLAUDE.md 14·15)

근거
  · 교과서 43쪽  추론의 개념 · 삼단 논법(그림 Ⅰ-15) · 인공지능의 논리적 추론 과정(그림 Ⅰ-16)
  · 교과서 44쪽  지식 표현 방법(표 Ⅰ-2) · 명제 논리(표 Ⅰ-3·Ⅰ-4) · 술어 논리
  · 교과서 45쪽  술어 논리 형식·추론(그림 Ⅰ-17) · 규칙(표 Ⅰ-5·Ⅰ-6)
  · 교과서 46쪽  의미망(그림 Ⅰ-18) · 지식 그래프(그림 Ⅰ-19)
  · 교과서 47쪽  활동5 — 지식을 표현하고 추론해 보기
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
F = json.load(io.open(os.path.join(HERE, 'lesson7-facts.json'), encoding='utf-8'))

TB = lambda v: 'T' if v else 'F'

S = []
add = S.append

add({'type': 'title', 'title': '7. 지식의 표현과 추론',
     'notes': '교과서 42~47쪽. 탐색 단원이 끝나고 지식 단원으로 넘어갑니다.'})

add({'type': 'quiz', 'title': '지난 시간 확인',
     'items': [
         {'text': 'f(n) 은 무엇과 무엇을 더한 값인가요?'},
         {'text': '휴리스틱값이란 무엇인가요?'},
         {'text': 'A* 는 도시 문제에서 몇 개의 상태를 테스트했나요?'},
     ],
     'notes': '답 — g(n)+h(n) / 그 상태에서 목표까지의 예상 비용을 추정한 값 / 4개'})

# ── 추론 ──
add({'type': 'cards', 'title': '추론', 'num': '01',
     'cards': [{'def': True, 'wide': True, 'label': '추론',
                'text': '어떠한 판단을 근거로 삼아 **다른 판단을 이끌어 냄**'}],
     'notes': '교과서 43쪽. 인간의 지능에서 가장 핵심적인 기능이라고 소개합니다.'})

add({'type': 'vflow', 'title': '삼단 논법',
     'items': [
         {'label': '대전제', 'text': '인간은 죽는다'},
         {'label': '소전제', 'text': '소크라테스는 인간이다'},
         {'label': '결론', 'text': '소크라테스는 죽는다'},
     ],
     'notes': '교과서 43쪽 그림 Ⅰ-15. 아리스토텔레스 논리학의 삼단 논법입니다.'})

ch = F['chain']
add({'type': 'diagram', 'title': '인공지능의 논리적 추론 과정',
     'nodes': [
         {'id': 'in', 'label': '관측된 사실 A 입력', 'x': 8, 'y': 50, 'color': 'blue'},
         {'id': 'kb', 'label': '지식(규칙) 베이스', 'x': 45, 'y': 18},
         {'id': 'rule', 'label': '논리적 추론 규칙', 'x': 45, 'y': 78},
         {'id': 'out', 'label': '추론된 결과 F 출력', 'x': 88, 'y': 50, 'color': 'red'},
     ],
     'edges': [{'from': 'in', 'to': 'kb'}, {'from': 'in', 'to': 'rule'},
               {'from': 'kb', 'to': 'out'}, {'from': 'rule', 'to': 'out'}],
     'side': [
         {'label': '지식 베이스', 'big': True,
          'text': '\n'.join('if %s, then %s' % (r['if'], r['then']) for r in F['kb'])},
         {'label': '추론', 'text': '%s → %s' % (ch['input'], ' → '.join(ch['known'])),
          'accent': True},
     ],
     'notes': '교과서 43쪽 그림 Ⅰ-16. A 를 넣으면 A→B, B→F 를 거쳐 F 가 나옵니다. '
              'C→K 는 조건이 안 맞아 쓰이지 않습니다. (verify/lesson7.py 로 돌려서 확인)'})

add({'type': 'cards', 'title': '지식의 추론 과정', 'num': '02',
     'cards': [
         {'label': '①', 'text': '정제된 형태의 지식이 저장된 **지식 베이스**가 있다', 'wide': True},
         {'label': '②', 'text': '새로운 사실이 들어오면 기존 지식에 **논리적 추론 규칙**을 적용해 '
                                '새로운 사실을 생성한다', 'wide': True},
     ],
     'notes': '교과서 43쪽.'})

# ── 지식 표현 방법 ──
add({'type': 'table', 'title': '컴퓨터의 지식 표현 방법',
     'head': ['방법', '무엇을 하는가'],
     'rows': [[r['name'], r['desc']] for r in F['repr']],
     'firstCol': 3.6,
     'notes': '교과서 44쪽 표 Ⅰ-2. 오늘은 앞의 세 가지를 자세히 보고, 뒤의 두 가지는 그림으로 봅니다.'})

# ── 명제 논리 ──
add({'type': 'cards', 'title': '명제 논리', 'num': '03',
     'cards': [
         {'def': True, 'wide': True, 'label': '명제',
          'text': '**참 또는 거짓**을 판별할 수 있는 문장'},
         {'def': True, 'wide': True, 'label': '명제 논리',
          'text': '**기호**를 사용하여 명제를 표현하는 방법'},
     ],
     'notes': '교과서 44쪽.'})

add({'type': 'table', 'title': '명제를 기호로',
     'head': ['명제 기호', '명제'],
     'rows': [['A', '비가 온다'], ['B', '습도가 높아진다'], ['C', '나는 우산을 가지고 있다']],
     'firstCol': 3.2,
     'notes': '교과서 44쪽 표 Ⅰ-3.'})

add({'type': 'table', 'title': '복합 명제',
     'head': ['연산자', '복합 명제', '뜻'],
     'rows': [
         ['논리 부정', 'NOT A', '비가 오지 않는다'],
         ['논리곱', 'A AND B', '비가 오고 습도가 높아진다'],
         ['논리합', 'A OR C', '비가 오거나 나는 우산을 가지고 있다'],
         ['조건·함축', 'A → B', '비가 오면 습도가 높아진다'],
     ],
     'firstCol': 3.4,
     'notes': '교과서 44쪽 표 Ⅰ-4.'})

tr = F['truth']
add({'type': 'table', 'title': '참·거짓을 따져 보면',
     'head': ['A', 'B', 'NOT A', 'A AND B', 'A OR B', 'A → B'],
     'rows': [[TB(r['A']), TB(r['B']), TB(r['NOT A']), TB(r['A AND B']),
               TB(r['A OR B']), TB(r['A → B'])] for r in tr],
     'firstCol': 2.0,
     'foot': 'A → B 는 **A 가 거짓이면 참**이 됩니다',
     'notes': '교과서 본문에 진리표는 없지만, 조건(→)을 말로만 설명하면 학생이 놓칩니다. '
              'verify/lesson7.py 로 계산한 표입니다. 교과서 밖 내용이라 채팅으로 보고했습니다.'})

# ── 술어 논리 ──
add({'type': 'cards', 'title': '술어 논리', 'num': '04',
     'cards': [
         {'def': True, 'wide': True, 'label': '술어 논리',
          'text': '문장을 **주어와 술부**로 나누고 **변수와 한정자**를 도입해 표현하는 논리'},
         {'label': '∀', 'text': '모든 (전칭 기호)'},
         {'label': '∃', 'text': '어떤 (존재 기호)'},
     ],
     'notes': '교과서 44~45쪽. 주어는 대상, 술부는 그 대상에 대한 설명·행동·상태입니다.'})

add({'type': 'table', 'title': '술어 논리로 쓰면',
     'head': ['지식', '술어 논리 표현'],
     'rows': [
         ['오늘 비가 온다', '날씨(오늘, 비)'],
         ['나는 오늘 우산을 쓰고 있다', '사용(나, 오늘, 우산)'],
         ['Jane 이 어제 우산을 썼다', '사용(Jane, 어제, 우산)'],
         ['모든 인간은 죽는다', '∀x, 인간(x) → 죽는다(x)'],
     ],
     'firstCol': 7.0,
     'notes': '교과서 45쪽 그림 Ⅰ-17.'})

sy = F['syllogism']
add({'type': 'vflow', 'title': '술어 논리로 추론하기',
     'items': [
         {'label': '대전제', 'text': sy['major']},
         {'label': '소전제', 'text': sy['minor']},
         {'label': '결론', 'text': sy['conclusion']},
     ],
     'notes': '교과서 45쪽. x 자리에 소크라테스를 대입해 결론을 얻습니다. '
              '(verify/lesson7.py 로 대입해 확인한 결과입니다)'})

# ── 규칙 ──
add({'type': 'cards', 'title': '규칙', 'num': '05',
     'cards': [
         {'def': True, 'wide': True, 'label': '규칙',
          'text': '**조건과 행동**을 서술하는 표현 방법 — IF ~ THEN'},
         {'label': 'IF', 'text': '신호등이 녹색불이다'},
         {'label': 'THEN', 'text': '횡단보도를 건넌다', 'accent': True},
     ],
     'notes': '교과서 45쪽 표 Ⅰ-5.'})

r1, r2 = F['rules'][1], F['rules'][2]
add({'type': 'table', 'title': '조건이 여러 개일 때',
     'head': ['조건', '연산자', '행동'],
     'rows': [
         [' / '.join(r1['if']), r1['op'], r1['then']],
         [' / '.join(r2['if']), r2['op'], r2['then']],
     ],
     'firstCol': 8.0,
     'foot': 'AND 는 **둘 다** 맞아야, OR 는 **하나만** 맞아도 행동한다',
     'notes': '교과서 45쪽 표 Ⅰ-6. 눈이 충혈되기만 해서는 결막염 진단이 나오지 않습니다 '
              '— 검산으로 확인했습니다.'})

# ── 의미망 · 지식 그래프 ──
add({'type': 'diagram', 'title': '의미망',
     'nodes': [
         {'id': 'an', 'label': '동물', 'x': 50, 'y': 5, 'accent': True},
         {'id': 'ma', 'label': '포유동물', 'x': 28, 'y': 33},
         {'id': 'fi', 'label': '물고기', 'x': 76, 'y': 33},
         {'id': 'ca', 'label': '고양이', 'x': 6, 'y': 64},
         {'id': 'be', 'label': '곰', 'x': 30, 'y': 64},
         {'id': 'wh', 'label': '고래', 'x': 52, 'y': 64},
         {'id': 'wa', 'label': '물', 'x': 78, 'y': 64},
         {'id': 'ha', 'label': '털', 'x': 14, 'y': 94},
     ],
     'edges': [
         {'from': 'ma', 'to': 'an', 'label': 'is a'},
         {'from': 'fi', 'to': 'an', 'label': 'is a'},
         {'from': 'wh', 'to': 'ma', 'label': 'is a'},
         {'from': 'ca', 'to': 'ma', 'label': 'is a'},
         {'from': 'be', 'to': 'ma', 'label': 'is a'},
         {'from': 'ma', 'to': 'ha', 'label': 'has'},
         {'from': 'fi', 'to': 'wa', 'label': 'lives in'},
         {'from': 'wh', 'to': 'wa', 'label': 'lives in'},
     ],
     'foot': '개념 사이의 관계를 **간선**으로 잇는다',
     'notes': '교과서 46쪽 그림 Ⅰ-18. 고래는 포유동물이면서 물에 산다는 것을 한눈에 봅니다.'})

add({'type': 'diagram', 'title': '지식 그래프',
     'nodes': [
         {'id': 'yi', 'label': '이순신', 'x': 46, 'y': 46, 'accent': True},
         {'id': 'jo', 'label': '조선', 'x': 12, 'y': 12},
         {'id': 'na', 'label': '수군절도사', 'x': 12, 'y': 80},
         {'id': 'tu', 'label': '거북선', 'x': 82, 'y': 12},
         {'id': 'im', 'label': '임진왜란', 'x': 82, 'y': 80},
         {'id': 'jp', 'label': '일본', 'x': 50, 'y': 96},
     ],
     'edges': [
         {'from': 'yi', 'to': 'jo', 'label': '국적'},
         {'from': 'yi', 'to': 'na', 'label': '직업'},
         {'from': 'yi', 'to': 'tu', 'label': '발명'},
         {'from': 'yi', 'to': 'im', 'label': '참전'},
         {'from': 'im', 'to': 'jp', 'label': '침략'},
     ],
     'foot': '실제 세상의 **사실과 그 관계**를 그래프로',
     'notes': '교과서 46쪽 그림 Ⅰ-19. 의미망은 개념을 잇고, 지식 그래프는 실제 사실을 잇습니다. '
              '"이순신 장군은 임진왜란 때 무슨 일을 했나요?" 같은 질문에 답할 수 있습니다.'})

# ── 활동 ──
add({'type': 'cards', 'title': '활동 — 지식을 표현하고 추론하기', 'num': '06',
     'cards': [
         {'label': '①', 'text': 'IF ~ THEN 규칙을 **두 개 이상** 만들기'},
         {'label': '②', 'text': '명제 P·Q·R 로 **복합 명제** 만들기'},
         {'label': '③', 'text': '**의미망**으로 지식 표현하기'},
         {'label': '④', 'text': '명제 논리와 술어 논리로 **삼단 논법** 추론하기'},
     ],
     'foot': '활동 시작! (20분 동안 진행)',
     'notes': '교과서 47쪽 활동5. 학습지에 그대로 있습니다. 모둠으로 하고 ③④는 칠판에 발표시킵니다.'})

add({'type': 'summary', 'title': '오늘 정리',
     'items': [
         '추론 — 어떠한 판단을 근거로 다른 판단을 이끌어 냄',
         '지식 표현 — 명제 논리 · 술어 논리 · 규칙 · 의미망 · 지식 그래프',
         '규칙은 IF ~ THEN, 조건이 여러 개면 AND · OR 로 잇는다',
         '지식 베이스에 사실을 넣으면 추론 규칙이 새로운 사실을 만들어 낸다',
     ],
     'foot': '다음 시간 — 인공지능 추론 시스템(전문가 시스템)'})

deck = {
    'title': '7. 지식의 표현과 추론',
    'kicker': '인공지능 기초 · 1-1-3',
    'out': os.path.join(ROOT, 'tools', 'samples', '인공지능기초_7차시_지식표현과추론.pptx'),
    'slides': S,
}
p = os.path.join(ROOT, 'tools', 'samples', 'lesson7-reason.deck.json')
io.open(p, 'w', encoding='utf-8').write(json.dumps(deck, ensure_ascii=False, indent=2))
print('slides', len(S), '->', p)
