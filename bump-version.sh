#!/bin/sh
# 배포 전에 실행하세요 — index.html 의 js/css 주소에 붙은 ?v= 를 지금 시각으로 바꿉니다.
#
# 왜 필요한가
#   GitHub Pages 가 js/css 에 캐시 시간을 걸어둡니다. 그래서 새로 배포해도
#   학생·선생님 브라우저는 한동안 예전 파일을 계속 씁니다(Ctrl+F5 를 눌러야 바뀜).
#   주소 뒤 ?v= 값이 바뀌면 브라우저가 '다른 파일'로 보고 새로 받아갑니다.
#
# 쓰는 법
#   sh bump-version.sh && git add -A && git commit -m "..." && git push
set -e
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M)
sed -i -E "s#(src=\"js/[^\"?]+)(\?v=[0-9]+)?\"#\1?v=$V\"#g; s#(href=\"css/[^\"?]+)(\?v=[0-9]+)?\"#\1?v=$V\"#g" index.html
echo "버전 $V 로 갱신했습니다 ($(grep -c '?v=' index.html)개)"
