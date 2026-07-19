# 원큐(Oneque) 스토어프론트 스타터

**헤드리스 커머스 API 위에서 직접 만드는 Next.js 쇼핑몰·예약 사이트 골격.**
원큐 **스택(Stack) 플랜** 사용자를 위한 출발점입니다 — 관리자단(CMS)·백엔드·결제는 원큐가 제공하고, **스토어프론트는 이 골격을 그대로 두고 디자인·페이지를 원하는 대로 키우면 됩니다.** AI 바이브코딩으로 키우기 좋게 설계돼 있습니다.

이 문서 하나로 셋업 → 구조 → 규약 → 확장까지 볼 수 있게 정리했습니다.

---

## 이게 뭔가

- **`@oneque/client` SDK** 위에서 도는 Next.js(App Router) 스토어프론트입니다. 상품·장바구니·결제·주문조회·소셜로그인이 이미 배선돼 있습니다.
- 데이터·인증·결제 확정은 전부 **원큐 백엔드(헤드리스 API)** 가 합니다. 이 레포는 그 위의 **표현/화면 계층**만 담습니다.
- 원큐 콘솔에서 만드는 새 스토어프론트는 이 템플릿을 복제(`generate`)해서 태어납니다. 로컬에서 바로 실행·개발할 수도 있습니다.

## 무엇이 들어 있나

상품 등록 → 구매 → 결제 → 배송조회의 **최소 동작 골격**이 이미 연결돼 있습니다:

| 경로 | 무엇 |
|---|---|
| `/` | 홈 — 사이트 설정·카테고리 (RSC, 공개 조회) |
| `/products/[slug]` | 상품 상세 + 장바구니 담기 |
| `/cart` | 장바구니 (현재가 재계산) |
| `/checkout` | 결제 폼 → 페이원큐(PayOneQ) 결제창 이동 |
| `/orders/[orderNo]?phone=…` | 게스트 주문·배송 조회 |
| `/mypage`, `/login`, `/auth/callback/[provider]` | 회원 마이페이지·소셜 로그인(카카오·네이버·구글) |
| `/api/cart/*`, `/api/checkout`, `/api/auth/*` | BFF route handler (토큰·세션키는 서버가 httpOnly 쿠키로 관리) |

## 빠른 시작

```bash
cp .env.example .env.local     # ONEQUE_API_BASE·ONEQUE_TENANT 채우기
npm install
npm run dev                    # http://localhost:3000
```

필요한 환경변수(`.env.example` 참고):

| 변수 | 설명 |
|---|---|
| `ONEQUE_API_BASE` | 원큐 백엔드 URL (`/api` 는 붙이지 않음). 로컬 기본 `http://localhost:8100` |
| `ONEQUE_TENANT` | 이 사이트의 테넌트 코드 (원큐 콘솔에서 발급) |
| `ONEQUE_SITE_URL` | 이 사이트의 공개 URL (SEO·sitemap·JSON-LD 용) |
| `NEXT_PUBLIC_{KAKAO,NAVER,GOOGLE}_CLIENT_ID` | 소셜 로그인 사용 시 각 제공자 클라이언트 ID |
| `ONEQUE_REVALIDATE_SECRET` | ISR 재검증 웹훅 공유 시크릿(원큐 콘솔과 동일 값) |

백엔드가 떠 있어야 하고, `ONEQUE_TENANT` 에 이 사이트의 테넌트 코드를 넣어야 합니다.

## AI 매뉴얼 — `llms.txt`

핵심 규약과 API 사용법은 **`@oneque/client` 패키지에 동봉된 `llms.txt`** 에 전부 있습니다.
`npm install` 후 `node_modules/@oneque/client/llms.txt` 에서 볼 수 있습니다.
**AI 로 스토어프론트를 키울 때 그 파일을 컨텍스트로 주세요.**

## 렌더링 전략 — 정적/ISR 우선

읽기 중심 페이지는 요청마다 서버 렌더(SSR)하지 않고 **ISR**(정적 프리렌더 + 주기 재검증)로 둡니다. 세션/쓰기 페이지만 동적으로 남깁니다. 서버 동적 렌더는 상시 런타임 원가라 최소화합니다.

| 경로 | 렌더링 | 이유 |
|---|---|---|
| `/` (홈) | **ISR** (`revalidate=600`) | 사이트 설정·카테고리 = 세션 무관 공개 데이터 |
| `/products/[slug]` (상품 상세) | **ISR** (`revalidate=300`) | 카탈로그 = 공개 읽기. 재고·가격은 결제 시점에 백엔드가 재검증하므로 stale 안전 |
| `/cart`·`/mypage`·`/login`·`/orders/[orderNo]` | **동적(ƒ)** | 쿠키(세션 토큰·게스트 카트키)를 읽음 → 요청별 렌더 필수 |
| `/checkout`·`/auth/callback/[provider]` | **동적(ƒ)** | 클라이언트 컴포넌트(폼 상태·OAuth state) |
| `/api/**` (BFF) | **동적(ƒ)** | route handler |

- ISR 전환은 페이지 상단 두 줄입니다: `export const dynamic = "force-static"` + `export const revalidate = N`.
  (Next 16 은 fetch 를 기본 no-store 로 두어 `revalidate` 만으론 동적으로 남습니다 — `force-static` 이 세그먼트 fetch 를 캐시로 돌려 ISR 을 성립시킵니다.)
- `npm run build` 의 라우트 표에서 `○`(Static/ISR)인지 `ƒ`(Dynamic)인지 확인하세요.
- 새 **읽기 페이지**(게시글 목록/상세 등)를 추가하면 같은 두 줄로 ISR 로 만들고, **세션/쓰기 페이지**는 쿠키를 읽거나 클라이언트 fetch 로 두어 동적으로 남깁니다.

## 설계 규약 (지켜야 하는 것)

- **`@oneque/client` 와 `lib/oneque` 는 서버에서만** import (RSC·route handler). 클라이언트 컴포넌트에서 쓰면 `baseUrl` 이 노출됩니다 — 타입만 필요하면 `import type` 으로.
- **장바구니·결제는 BFF route handler** 를 거칩니다. 토큰·게스트 카트키는 httpOnly 쿠키(`lib/session.ts`)로 서버가 관리합니다.
- **결제 확정은 백엔드 웹훅이 합니다.** returnUrl 의 "성공"을 믿지 말고 `/orders/[orderNo]` 로 상태를 확인하세요.
- **variant 가 판매 단위** — 담기·주문은 항상 `variant.id`.
- **미디어는 `/media/{id}` 안정 URL** 로 렌더합니다(presigned URL 직접 사용 금지, `next/image` 대신 `<img>`).

## validator

만들거나 고친 스토어프론트가 위 규약을 어기지 않았는지 정적으로 검사합니다(CI 권장):

```bash
npm run validate            # ./src 스캔. 위반 있으면 exit 1
```

- `use client` 파일이 `@oneque/client` 를 값으로 import(baseUrl 노출)하면 오류.
- 서버 클라이언트 싱글턴(`lib/oneque`)을 클라이언트 컴포넌트에서 import 하면 오류.

## AI 로 키우기

이 골격 + `llms.txt`(위 참조)를 AI 에게 주고, 예를 들어

> "카테고리별 상품 목록 페이지, 상품 카드 그리드, 로그인(카카오), 마이페이지 주문목록을 이 규약대로 추가해줘"

라고 하면 됩니다. 추가 후 `npm run validate` 와 `npm run build` 로 검증하세요.

---

원큐(Oneque) — 헤드리스 커머스 플랫폼. 스토어프론트는 당신이, 나머지는 원큐가.
