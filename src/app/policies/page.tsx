import {oneq} from "@/lib/oneque";
import {parsePolicies} from "@/components/JsonLd";

/**
 * 구매 정책 페이지 (RSC · ISR) — 환불·교환·배송·A/S.
 *
 * **두 가지를 동시에 만족한다**: 사람에게는 전자상거래법이 요구하는 거래조건 표시면이고, 기계에게는
 * 상품 상세의 `MerchantReturnPolicy` JSON-LD 와 같은 사실을 말하는 근거 페이지다(둘의 출처가 하나라
 * 갈라지지 않는다).
 *
 * **금액은 `defaultReturnShippingFee`(운영 값)만 쓴다** — 정책 JSON 문구에 금액을 적지 않는 이유가
 * 이것이다. 여기 쓰인 반품 배송비는 실제 환불에서 차감되는 바로 그 값이다.
 *
 * 미설정 테넌트도 페이지가 살아야 하므로(사업자 정보는 항상 표시 대상) 정책이 비면 그 절만 생략한다.
 */
export const dynamic = "force-static";
export const revalidate = 600;

export default async function PoliciesPage() {
    // site-config 태그 — 관리자가 정책을 고치면 백엔드가 이 태그로 이 페이지를 콕 집어 무효화한다.
    const config = await oneq.getSiteConfig({tags: ["site-config"]}).catch(() => null);
    if (!config) return <main><h1>구매 정책</h1><p>정보를 불러오지 못했습니다.</p></main>;

    const policies = parsePolicies(config.commercePolicies);
    const fee = config.defaultReturnShippingFee;
    const sections = [
        {title: "반품·환불", body: policies.returns?.notes, extra: reelExtra(policies.returns?.windowDays, fee)},
        {title: "교환", body: policies.exchange?.notes},
        {title: "배송", body: policies.shipping?.notes},
        {title: "A/S", body: policies.as?.notes},
    ].filter((s) => s.body || s.extra);

    return (
        <main>
            <h1>구매 정책</h1>

            {sections.length === 0 ? (
                <p style={{color: "#888"}}>등록된 정책이 없습니다.</p>
            ) : (
                sections.map((s) => (
                    <section key={s.title} style={{marginBottom: 20}}>
                        <h2>{s.title}</h2>
                        {s.extra && <p>{s.extra}</p>}
                        {s.body && <p style={{whiteSpace: "pre-wrap"}}>{s.body}</p>}
                    </section>
                ))
            )}

            {/* 사업자 정보 — 정책 유무와 무관하게 표시 대상이다. */}
            <section style={{marginTop: 32, paddingTop: 16, borderTop: "1px solid #ddd", color: "#666", fontSize: 14}}>
                <h2 style={{fontSize: 16}}>사업자 정보</h2>
                <p style={{margin: "4px 0"}}>{config.companyName}</p>
                {config.ceoName && <p style={{margin: "4px 0"}}>대표: {config.ceoName}</p>}
                {config.bizRegNo && <p style={{margin: "4px 0"}}>사업자등록번호: {config.bizRegNo}</p>}
                {config.address && <p style={{margin: "4px 0"}}>{config.address}</p>}
                {config.tel && <p style={{margin: "4px 0"}}>전화: {config.tel}</p>}
                {config.email && <p style={{margin: "4px 0"}}>이메일: {config.email}</p>}
            </section>
        </main>
    );
}

/** 기간·반품비를 사람 문장으로. 둘 다 없으면 생략(문구는 테넌트의 notes 가 말한다). */
function reelExtra(windowDays?: number, fee?: number | null): string | undefined {
    const parts: string[] = [];
    if (windowDays != null) parts.push(`수령 후 ${windowDays}일 이내 반품 가능`);
    if (fee != null) parts.push(fee > 0 ? `반품 배송비 ${fee.toLocaleString()}원` : "반품 배송비 무료");
    return parts.length ? parts.join(" · ") : undefined;
}
