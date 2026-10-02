/* ═══════════════════════════════════════
   nav-icons.js — 메뉴 아이콘 (2026-10-02)

   사이드바·하단 탭바의 이모지(🗂️ 📢 🖥️ …)를 선으로 그린 그림으로 바꿉니다.
   이모지는 기기마다 다른 그림이 나오고, 줄 높이를 흔들고, 작게 줄이면 뭉개집니다.

   쓰는 법   navIco(it.key, it.ico)
   못 찾으면 넘긴 글자를 그대로 돌려줍니다 — 단원 메뉴의 로마 숫자(Ⅰ Ⅱ Ⅲ)가 그 경우입니다.
   아이콘을 더하려면 아래 표에 { 메뉴키: '<path .../>' } 한 줄만 넣으면 됩니다.
═══════════════════════════════════════ */

const NAV_ICON_D = {
  /* 공통 */
  dashboard: '<path d="M4 10.4 12 4l8 6.4"/><path d="M6.2 9.3V20h11.6V9.3"/><path d="M10 20v-4.6h4V20"/>',
  notice:    '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16.6 8.6a5 5 0 0 1 0 6.8"/>',
  slides:    '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  assign:    '<path d="M4 5.5A2 2 0 0 1 6 4h13v15H6a2 2 0 0 0-2 2z"/><path d="M9 4v15"/>',
  attend:    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9.4 15.4 1.8 1.8 3.4-3.6"/>',
  students:  '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17.4" cy="9.6" r="2.4"/><path d="M16 15.6a4.5 4.5 0 0 1 4.5 3.4"/>',
  portfolio: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  settings:  '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',

  /* 콘텐츠 */
  unit:      '<path d="M12 3.5 21 8l-9 4.5L3 8z"/><path d="M3 12.6 12 17l9-4.4"/>',
  notebook:  '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.4 10 9.9 12.5 7.4 15M12.6 15H16.4"/>',
  oj:        '<path d="M9 7 4 12l5 5M15 7l5 5-5 5"/>',
  coderead:  '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.2 2.4c-.8.3-1.2.9-1.2 1.7v.4"/><circle cx="11.6" cy="17.4" r="1"/>',
  aicode:    '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4.6 3.6a.5.5 0 0 1-.8-.4V15h-.1A1.5 1.5 0 0 1 4 13.5z"/>',
  ml:        '<rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/><path d="M10 4v3.5M14 4v3.5M10 16.5V20M14 16.5V20M4 10h3.5M4 14h3.5M16.5 10H20M16.5 14H20"/>',
  aia:       '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 11h6M9 15h4"/>',

  /* 평가 · 점수 */
  asmt:      '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="m9.4 14.4 1.8 1.8 3.4-3.6"/>',
  assess1:   '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="m9.4 14.4 1.8 1.8 3.4-3.6"/>',
  mlassess:  '<path d="M9.5 3v6.2L5 18.4A1.6 1.6 0 0 0 6.4 21h11.2a1.6 1.6 0 0 0 1.4-2.6L14.5 9.2V3"/><path d="M8.5 3h7"/><path d="M7.6 15h8.8"/>',
  scores:    '<path d="M4 20h16"/><rect x="5.5" y="12" width="3.4" height="6"/><rect x="10.3" y="7.5" width="3.4" height="10.5"/><rect x="15.1" y="10" width="3.4" height="8"/>',
  myscore:   '<path d="M4 20h16"/><rect x="5.5" y="12" width="3.4" height="6"/><rect x="10.3" y="7.5" width="3.4" height="10.5"/><rect x="15.1" y="10" width="3.4" height="8"/>',

  /* 계획 */
  curriculum: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h4M7.5 17.5h8"/>',
  aiplan:     '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h4M7.5 17.5h8"/>',
};

/* 메뉴 키에 맞는 그림. 없으면 넘겨받은 글자를 그대로 씁니다. */
function navIco(key, fallback){
  const d = NAV_ICON_D[key];
  if(!d) return `<span class="ico-txt">${fallback == null ? '' : fallback}</span>`;
  return `<svg class="ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
