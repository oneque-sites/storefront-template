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
    const value = process.env.ONEQ_TENANT;
    if (!value) throw new Error("ONEQ_TENANT 가 설정되지 않았습니다 — .env.local 을 확인하세요.");
    return value;
}

/**
 * 백엔드 베이스 URL(뒤에 `/api` 안 붙임). 여기는 로컬 기본값을 둔다 —
 * localhost 는 남의 데이터를 줄 수 없어서 [tenantCode] 와 위험도가 다르다.
 */
export function apiBase(): string {
    return process.env.ONEQ_API_BASE ?? "http://localhost:8100";
}
