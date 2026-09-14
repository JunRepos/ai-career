/* ═══════════════════════════════════════
   tools/assess1-gate.mjs — 1차 수행평가 입장 비밀번호 (2026-09-14)

   쓰는 법 :  node tools/assess1-gate.mjs <비밀번호>
   → js/assess1-gate.js 를 새로 씁니다. 그 파일에는 비밀번호가 없고
     PBKDF2-SHA256 해시(무작위 salt · 25만 번 반복)만 들어갑니다.
     학생 브라우저는 입력한 값을 같은 방법으로 바꿔 이 해시와 비교합니다.

   ⚠ 비밀번호를 이 레포 어디에도(코드 · 문서 · 커밋 메시지) 적지 마세요 — 레포는 공개될 수 있습니다.
   ⚠ 해시는 DB 가 아니라 코드에 둡니다. DB 규칙이 열려 있어 DB 에 두면 학생이 바꿔 끼울 수 있습니다.
     비밀번호를 바꾸려면 이 도구를 다시 돌리고 배포합니다.
═══════════════════════════════════════ */
import { webcrypto as C } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const pw = process.argv[2];
if(!pw){ console.error('쓰는 법: node tools/assess1-gate.mjs <비밀번호>'); process.exit(1); }
const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const salt = C.getRandomValues(new Uint8Array(16));
const iter = 250000;
const key = await C.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
const bits = await C.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, key, 256);
const gate = { salt: hex(salt), iter, hash: hex(bits) };
fs.writeFileSync(path.join(ROOT, 'js', 'assess1-gate.js'),
  '/* 자동 생성 — node tools/assess1-gate.mjs <비밀번호>. 비밀번호는 저장하지 않고 PBKDF2 해시만 둡니다. 직접 고치지 마세요. */\n'
  + `const A1_GATE = ${JSON.stringify(gate)};\n`);
console.log('✔ js/assess1-gate.js 를 새로 썼습니다 (반복 ' + iter + '회)');
