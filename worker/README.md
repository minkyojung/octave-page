# octave-signup

octave.run의 "GitHub로 가입"을 받는 Cloudflare Worker. 프로필과 이메일을 D1 `users` 표에 남긴다.

```
octave.run 버튼 ─→ /auth/github/start ─→ GitHub 동의 화면
                                              │
www.octave.run/?signup=ok|cancelled|error ←─ /auth/github/callback
                                          (state 확인 → code 교환 → /user, /user/emails
                                           → D1 upsert → 앱 권한(grant) 삭제)
```

- **OAuth**: Authorization Code + `state` + PKCE(S256). state와 verifier는 10분짜리
  `__Host-` HttpOnly 쿠키에만 있다. scope는 `user:email` 하나(공개 프로필은 scope 없이 읽힌다).
- **토큰은 저장하지 않는다.** 프로필을 두 번 읽고 grant째 지운다 — 그 사람의 GitHub 승인 목록에서 앱이 빠진다.
- **소식 수신 동의**: 체크박스가 켜져 있고 요청이 `SITE_URL` 페이지에서 왔을 때(Referer)만 기록한다.
  다른 사이트가 `?updates=1` 링크를 걸어도 가입만 되고 동의는 남지 않는다.
- **이메일**: GitHub가 인증한 대표 주소, 없으면 인증된 다른 주소, 그것도 없으면 null. 가입할 때마다 지금 값으로 바뀐다.
- **재가입**: 같은 `github_id`면 프로필만 갱신한다. `created_at`과 소식 수신 동의는 유지된다.
- **요청 제한**: IP당 분당 20회(두 경로 합산). 넘으면 `?signup=error`로 돌려보낸다.

## 로컬

```bash
npm install
cp .dev.vars.example .dev.vars   # 개발용 OAuth App의 id/secret
npm run migrate:local
npm run dev                      # http://localhost:8787
npm test
npm run typecheck
```

개발용 OAuth App의 callback은 `http://localhost:8787/auth/github/callback`.
Safari는 localhost에서 `Secure` 쿠키를 받지 않으니 로컬 확인은 Chrome으로.

## 배포 (처음 한 번)

```bash
npx wrangler login
npx wrangler d1 create octave-signup      # 나온 database_id를 wrangler.jsonc에
# wrangler.jsonc의 GITHUB_CLIENT_ID에 운영용 OAuth App의 client id
npx wrangler secret put GITHUB_CLIENT_SECRET
npm run deploy                             # 원격 마이그레이션 → 배포
```

운영용 OAuth App의 callback은 `https://octave-signup.<subdomain>.workers.dev/auth/github/callback`.

## 조회와 삭제

```bash
npx wrangler d1 execute octave-signup --remote \
  --command "SELECT login, email, updates_opt_in, created_at FROM users ORDER BY created_at DESC"

# 소식 수신 거부
npx wrangler d1 execute octave-signup --remote \
  --command "UPDATE users SET updates_opt_in = 0, updates_opt_in_at = NULL WHERE email = '...'"

# 삭제 요청
npx wrangler d1 execute octave-signup --remote --command "DELETE FROM users WHERE email = '...'"
```

잘못 지웠다면 D1 Time Travel로 되돌린다 — 무료 플랜 7일, 유료 30일 안의 시점
(`wrangler d1 time-travel restore octave-signup --timestamp=<unix>`).
