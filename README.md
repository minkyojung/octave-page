# Octave landing page

Octave의 Next.js 랜딩 페이지와 GitHub 가입용 Cloudflare Worker를 함께 둔 저장소입니다.

## Landing page

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

Next.js(App Router) · Tailwind CSS v4 · Motion · Geist(npm, 자체 호스팅)

- 페이지: `src/app/page.tsx`, 레이아웃·폰트: `src/app/layout.tsx`
- 앱 아이콘: `public/octave-icon.png`, 단계별 앱 화면: `public/steps/{plan,build,ship}.png` (헤드라인 단어에 맞춰 바뀜)
- Download for Mac: `src/lib/release.ts`가 최신 릴리스의 `latest-mac.yml`에서 `.dmg`를 찾음 (1시간마다 갱신, 실패 시 릴리스 페이지)
- 섹션: `src/sections/`, 컴포넌트: `src/components/`
- 색상·서체 토큰: `src/app/globals.css`의 `@theme`
- 개인정보처리방침: `public/privacy.html` (`next.config.ts`에서 `/privacy`로 연결)

## Cloudflare Worker

`worker/`는 GitHub OAuth 가입 정보를 Cloudflare D1에 저장하는 독립 프로젝트입니다. 지금 랜딩에는 가입 버튼이 없습니다. 설정, 로컬 실행, 테스트 및 배포 방법은 [`worker/README.md`](worker/README.md)를 참고하세요.

```bash
cd worker
npm install
npm test
npm run typecheck
```
