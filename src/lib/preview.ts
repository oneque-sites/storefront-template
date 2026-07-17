/**
 * 프리뷰 모드 판별(memo29 §3). 프리뷰 러너가 `next dev` 프로세스에 NEXT_PUBLIC_ONEQ_PREVIEW=1 을 주입한다.
 * =1 이면 프로덕션 공개 API(읽기)만 소비하고 쓰기(체크아웃·장바구니 변경)를 차단해 프로덕션 데이터를 오염시키지 않는다.
 */
export const isPreview = (): boolean => process.env.NEXT_PUBLIC_ONEQ_PREVIEW === "1";

// 적용 지점: src/app/api/cart/items/route.ts (담기), src/app/api/checkout/route.ts (주문·결제) — 프리뷰면 403.
