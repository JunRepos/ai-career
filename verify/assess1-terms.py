# -*- coding: utf-8 -*-
"""
verify/assess1-terms.py — 1차 수행평가에 쓸 **용어가 교과서에 실제로 있는지** 대조

1차 수행평가(「인공지능의 특성을 활용하여 문제 해결 방안 설계하기」)는 논술·도식화라
계산으로 검산할 것이 없습니다. 대신 **출처 추적**을 합니다 —
평가지·채점 기준에 쓸 낱말과 문장이 교과서 해당 쪽에 실제로 있는지 하나씩 확인합니다.
없는 것을 쓰면 학생이 배운 적 없는 말로 평가받게 됩니다.

교과서 근거
  16쪽  인공지능의 개념과 특성 — 그림 Ⅰ-3 인공지능의 특성 다섯 가지 (인식·추론·학습·생성·문제 해결)
  22쪽  인공지능 시스템의 에이전트 구조 (그림 Ⅰ-5 지능 에이전트의 기본 구조)
  23쪽  인공지능 시스템의 특성 (1)(2)(3) · 일반 소프트웨어와 인공지능 소프트웨어 비교
  24쪽  활동2 — 일반 소프트웨어와 인공지능 소프트웨어의 쓰임 구분하기

결과 : verify/assess1-terms.json · verify/assess1-terms.txt
"""
import fitz, io, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
BOOK = r"G:\내 드라이브\신동고등학교\01_교과_인공지능\교과서 및 교사용 지도서\고_인공지능 기초(김현철)_교과서.pdf"
PAGES = (16, 22, 23, 24)                     # 책 쪽 (PDF 쪽 = 책 쪽 + 3)

# 평가지·채점 기준에 쓸 말 — 전부 교과서에 있어야 합니다
TERMS = [
    '지능 에이전트', '지능적 판단', '자율', '환경', '인식', '행동', '반복',
    '인공지능 시스템', '문제 해결', '추론', '학습',
    '일반 소프트웨어', '인공지능 소프트웨어', '실수',
]

# 교과서 16쪽 그림 Ⅰ-3 '인공지능의 특성' 다섯 가지 — 계획서 평가요소 ②「인공지능의 특성을 적용하여 설명하기」가 이것
# (2차시 덱에서 '인공지능의 특성 다섯 가지'로 가르친 순서 그대로)
FEATURES = [
    ('인식', '이미지, 소리, 언어 등을 인식하고 이해하는 것'),
    ('추론', '주어진 사실로부터 새로운 사실과 지식을 이끌어 내는 것'),
    ('학습', '경험이 반영된 예시 데이터로부터 일반화된 모델을 만들어 내는 것'),
    ('생성', '주어진 상황이나 조건에 따른 이미지, 언어, 소리 등을 생성해 내는 것'),
    ('문제 해결', '문제의 다양한 상황을 모두 미리 고려하여 가장 좋은 선택을 하는 것'),
]

# 교과서 23쪽의 '인공지능 시스템의 특성' 세 가지 — 실수 가능성(3) 을 안내서에서 씁니다
TRAITS = [
    ('인공지능 기능을 가진 소프트웨어',
     '소프트웨어 시스템 안에서 인공지능이 지능적인 기능을 수행한다'),
    ('자율적으로 판단하고 행동하는 지능 에이전트',
     '스스로 판단하여 자율적으로 행동하며, 그 판단과 행동은 추론·학습·문제 해결 전략·인식과 이해를 포함한다'),
    ('실수 가능성이 있는 시스템',
     '작은 오류와 실수를 예상하여야 하며, 어느 정도의 오류를 허용하는 곳에서 쓸 수 있다'),
]

# 교과서 22쪽 그림 Ⅰ-5 의 구조 — 문항 ④ 도식화가 이것을 씁니다
AGENT = ['환경 · 인간', '인식 (입력)', '상황 판단', '행동 결정', '행동 (출력)']


def main():
    d = fitz.open(BOOK)
    text = ''
    for p in PAGES:
        text += d[p + 2].get_text()

    log, missing = [], []
    log.append('■ 교과서 %s쪽에서 낱말 찾기' % '·'.join(str(p) for p in PAGES))
    for t in TERMS:
        ok = t in text
        if not ok:
            missing.append(t)
        log.append('   %s %s' % ('O' if ok else 'X', t))

    log.append('')
    log.append('■ 인공지능의 특성 다섯 가지 (16쪽 그림 Ⅰ-3) — 평가요소 ② 가 쓰는 것')
    for name, desc in FEATURES:
        ok = name in text and ''.join(desc.split())[:10] in ''.join(text.split())
        if not ok:
            missing.append(name)
        log.append('   %s %s — %s' % ('O' if ok else 'X', name, desc))

    log.append('')
    log.append('■ 인공지능 시스템의 특성 (23쪽) — 안내서 참고')
    for name, desc in TRAITS:
        ok = name in text
        if not ok:
            missing.append(name)
        log.append('   %s %s' % ('O' if ok else 'X', name))

    log.append('')
    log.append('■ 지능 에이전트 구조 (22쪽 그림 Ⅰ-5) — 문항 ④ 가 쓰는 것')
    for a in AGENT:
        core = a.split(' ')[0]
        ok = core in text
        if not ok:
            missing.append(a)
        log.append('   %s %s' % ('O' if ok else 'X', a))

    log.append('')
    log.append('■ 결과 : %s' % ('교과서에 없는 말 없음' if not missing else '없는 말 ' + ', '.join(missing)))

    io.open(os.path.join(HERE, 'assess1-terms.txt'), 'w', encoding='utf-8').write('\n'.join(log))
    print('assess1-terms.txt 에 적었습니다 · 빠진 말 %d개' % len(missing))

    io.open(os.path.join(HERE, 'assess1-terms.json'), 'w', encoding='utf-8').write(
        json.dumps({'pages': list(PAGES), 'terms': TERMS, 'features': FEATURES, 'traits': TRAITS,
                    'agent': AGENT, 'missing': missing},
                   ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
