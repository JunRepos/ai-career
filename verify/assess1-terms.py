# -*- coding: utf-8 -*-
"""
verify/assess1-terms.py — 1차 수행평가에 쓸 **용어가 교과서에 실제로 있는지** 대조

1차 수행평가(「인공지능의 특성을 활용하여 문제 해결 방안 설계하기」)는 논술·도식화라
계산으로 검산할 것이 없습니다. 대신 **출처 추적**을 합니다 —
평가지·채점 기준에 쓸 낱말과 문장이 교과서 해당 쪽에 실제로 있는지 하나씩 확인합니다.
없는 것을 쓰면 학생이 배운 적 없는 말로 평가받게 됩니다.

교과서 근거
  22쪽  인공지능 시스템의 에이전트 구조 (그림 Ⅰ-5 지능 에이전트의 기본 구조)
  23쪽  인공지능 시스템의 특성 (1)(2)(3) · 일반 소프트웨어와 인공지능 소프트웨어 비교
  24쪽  활동2 — 일반 소프트웨어와 인공지능 소프트웨어의 쓰임 구분하기

결과 : verify/assess1-terms.json · verify/assess1-terms.txt
"""
import fitz, io, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
BOOK = r"G:\내 드라이브\신동고등학교\01_교과_인공지능\교과서 및 교사용 지도서\고_인공지능 기초(김현철)_교과서.pdf"
PAGES = (22, 23, 24)                     # 책 쪽 (PDF 쪽 = 책 쪽 + 3)

# 평가지·채점 기준에 쓸 말 — 전부 교과서에 있어야 합니다
TERMS = [
    '지능 에이전트', '지능적 판단', '자율', '환경', '인식', '행동', '반복',
    '인공지능 시스템', '문제 해결', '추론', '학습',
    '일반 소프트웨어', '인공지능 소프트웨어', '실수',
]

# 교과서 23쪽의 '인공지능 시스템의 특성' 세 가지 — 평가 문항 ② 가 이것을 씁니다
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
    log.append('■ 인공지능 시스템의 특성 (23쪽) — 문항 ② 가 쓰는 것')
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
        json.dumps({'pages': list(PAGES), 'terms': TERMS, 'traits': TRAITS,
                    'agent': AGENT, 'missing': missing},
                   ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
