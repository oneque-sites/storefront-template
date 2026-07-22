/**
 * 서버 env 접근 단일 지점. 이 골격은 거래처마다 레포로 복제되므로, env 를 읽는 곳이 흩어지면
 * 폴백도 흩어진다(실제로 `lib/oneque.ts` 와 `app/media/[id]/route.ts` 가 각자 갖고 있었다).
 */

/**
 * 이 사이트의 테넌트 코드. **폴백을 두지 않는다.**
 *
 * 값이 없을 때 임의 테넌트로 조용히 붙으면 **남의 사이트 데이터**를 그린다 — 빈 화면보다 나쁘다.
 * 없으면 크게 실패하는 게 맞다(빌드·기동 시점에 터진다).
 */
export function tenantCode(): string {
    const value = process.env.ONEQUE_TENANT;
    if (!value) throw new Error("ONEQUE_TENANT 가 설정되지 않았습니다 — .env.local 을 확인하세요.");
    return value;
}

/**
 * 백엔드 베이스 URL(뒤에 `/api` 안 붙임). 여기는 로컬 기본값을 둔다 —
 * localhost 는 남의 데이터를 줄 수 없어서 [tenantCode] 와 위험도가 다르다.
 */
export function apiBase(): string {
    return process.env.ONEQUE_API_BASE ?? "http://localhost:8100";
}

/**
 * 스토어프론트 서버 시크릿 키(`oqsk_…`·memo78/79). **서버 전용** — 모든 백엔드 호출에 `X-Storefront-Key`
 * 로 실려 이 사이트를 인증한다. 관리형(오케스트레이터 서빙)은 기동 시 `ONEQUE_STOREFRONT_KEY` 로 자동 주입되고,
 * BYO 는 콘솔에서 발급해 배포 env 에 넣는다.
 *
 * **폴백·throw 없음**: [tenantCode] 와 달리 부재가 정상이다(dual 이행기 — 키 없는 소비자는 헤더 미전송으로
 * 하위호환 통과). 값이 없으면 undefined 를 그대로 흘려보낸다.
 *
 * ⚠ **`NEXT_PUBLIC_*` 로 절대 개명하지 말 것** — 개명하면 시크릿이 브라우저 번들에 인라인되어 유출된다.
 * 이 값은 서버(RSC·route handler·server action)에서만 읽혀야 한다.
 */
export function storefrontKey(): string | undefined {
    return process.env.ONEQUE_STOREFRONT_KEY;
}
