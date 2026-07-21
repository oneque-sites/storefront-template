# AGENTS.md — 원큐 스토어프론트 (에이전트용 스택·규약 안내)

이 레포를 수정하는 AI 에이전트는 **탐색 전에 이 문서를 먼저 읽어라.** 여기엔 이 코드베이스의 스택·스타일 규약·구조가 있다.

착수 절차·브랜치·시크릿·백엔드 직접 fetch 금지 같은 **안전 규칙은 이 문서가 아니라 작업 지시 프롬프트가 단일 출처**다 — 여기서 중복하지 않는다. 이 문서는 "이 코드가 무슨 규약을 쓰나"(코드 사실)만 말한다.

## 스택

- **Next.js App Router**(React 19 · TypeScript). 서버 컴포넌트 우선, 공개 페이지는 ISR/static.
- **Tailwind CSS v4 + `@theme` 테마 토큰.** 스타일은 유틸리티 클래스로만 표현한다.
- 도메인 데이터는 전부 **`@oneque/client`** 로 조회한다(직접 fetch·하드코딩 금지 — 이 규칙의 근거·범위는 프롬프트).
- 기계가독 스택 선언: `package.json` 의 `"oneque": {"styling": "tailwind-tokens"}`. 이 선언이 아래 색 규약을 계약으로 만든다(validator 가 이걸 읽어 규약 위반을 에러로 막는다).

## 색·스타일 규약 (tailwind-tokens 계약)

원리(memo65 §3): **요소가 "어떤 토큰"을 쓸지는 코드가 정하고, 그 토큰의 "값"은 config(테마)가 정한다.** 그래야 콘솔의 '말로 색 바꾸기'가 코드 수정 없이 값만 바꿔 즉시 반영된다. 리터럴 색을 코드에 박으면 이 계약이 깨진다.

- 브랜드색은 **토큰 유틸리티**로: `bg-primary`·`text-primary`·`border-primary` 등. 테마 토큰 키는 `primary`/`secondary`/`background`/`text`.
- 중립색은 **slate 스케일**(`text-slate-600`·`bg-slate-50` 등). 절제된 slate 중립 + 액센트 1색 원칙.
- **리터럴 색 금지**: `bg-[#3b82f6]` 같은 className 임의값이나 JSX 인라인 `style={{color:"#..."}}` 로 브랜드색을 하드코딩하지 마라. 리터럴 색·폰트 값은 오직 `src/app/globals.css` 의 `@theme` 안에서 토큰 정의로만 산다.
- 죽은 레거시 CSS 변수(`var(--oneq-*)` 등) 참조 금지 — 대응 유틸리티(`bg-primary` 등)로 대체하라.
- 정당한 **동적** 스타일(런타임 계산 위치·크기 등)은 CSS 변수 주입(`style={{"--x": v}}`) 또는 파일에 `// oneque-allow-inline-style: <이유>` 마커로 억제한다(색 하드코딩 회피 목적 아님).

## 구조

- 홈 = `src/app/page.tsx`. 라우트 = `src/app/**/page.tsx`(App Router 규칙).
- **단일 CSS**: `src/app/globals.css`(`@import "tailwindcss"` + `@theme` 토큰) **하나만** 둔다. root layout(`src/app/layout.tsx`)이 이 파일을 import 한다. 다른 `.css` 파일을 만들지 마라.
- 세션·쓰기·개인화 UI 는 클라이언트 컴포넌트(아일랜드)로 내리고, 공개 SEO 페이지(홈·목록·상세·콘텐츠)는 ISR/static 으로 유지한다(요청마다 동적 SSR 금지).
- `"use client"` 파일에서 `@oneque/client` 나 서버 클라이언트 싱글턴을 **값으로** import 하지 마라(타입만 `import type` 으로). baseUrl·토큰 노출을 막는 경계다.

## 검증

`node scripts/validate-storefront.mjs` 가 위 규약을 정적으로 검사한다(CI 게이트). 이 레포는 `tailwind-tokens` 선언 레포라 스타일 규약 위반(인라인 style·리터럴 색·죽은 토큰·CSS 배선 누락)이 **에러**로 막힌다. 최종 판정은 push 후 CI(GitHub Actions) 결과다.
