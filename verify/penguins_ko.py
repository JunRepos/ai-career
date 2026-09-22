# -*- coding: utf-8 -*-
"""data/penguins_ko.csv — 남극 펭귄 데이터의 속성 이름을 한글로 (2026-09-22 선생님 요청)

값은 data/penguins_size.csv 와 한 글자도 다르지 않고, 첫 줄(속성 이름)만 바꿉니다.
속성 이름은 교과서 73쪽 통계 요약 표의 머리글을 따릅니다 — 부리 길이(mm) · 부리 깊이(mm) · 날개 길이(mm) · 체질량(g).
엑셀로 열어도 한글이 깨지지 않도록 UTF-8 BOM 을 붙입니다 (판다스 read_csv 는 BOM 을 알아서 뺍니다 — 사이트 엔진에서 확인).
"""
import csv, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'data', 'penguins_size.csv')
OUT = os.path.join(ROOT, 'data', 'penguins_ko.csv')
EN = ['species', 'island', 'culmen_length_mm', 'culmen_depth_mm', 'flipper_length_mm', 'body_mass_g', 'sex']
KO = ['종', '섬', '부리 길이(mm)', '부리 깊이(mm)', '날개 길이(mm)', '체질량(g)', '성별']

raw = open(SRC, 'rb').read()
cut = raw.index(b'\n') + 1                      # 첫 줄 끝(줄바꿈 포함)
first = raw[:cut].decode('utf-8')
assert first.rstrip('\r\n').split(',') == EN, first
eol = first[len(first.rstrip('\r\n')):]         # 원본과 같은 줄바꿈 (\r\n)
out = b'\xef\xbb\xbf' + (','.join(KO) + eol).encode('utf-8') + raw[cut:]
open(OUT, 'wb').write(out)

a = list(csv.reader(io.StringIO(raw.decode('utf-8'), newline='')))
b = list(csv.reader(io.StringIO(out.decode('utf-8-sig'), newline='')))
assert len(a) == len(b) and a[1:] == b[1:] and b[0] == KO, (len(a), len(b))
print('penguins_ko.csv — %d행 (속성 %d개) · 값은 원본과 같음 · %d bytes' % (len(b) - 1, len(KO), len(out)))
