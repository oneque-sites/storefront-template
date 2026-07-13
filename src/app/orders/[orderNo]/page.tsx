import {OnequeError, type ShipmentInfo} from "@oneque/client";
import {oneq} from "@/lib/oneque";
import {getAccessToken} from "@/lib/session";

/**
 * 주문 조회 (RSC). 로그인 고객은 토큰으로, 게스트는 ?phone=연락처 로 조회한다.
 * 배송 정보도 함께 보여준다(있으면).
 */
export default async function OrderPage({
    params,
    searchParams,
}: {
    params: Promise<{orderNo: string}>;
    searchParams: Promise<{phone?: string}>;
}) {
    const {orderNo} = await params;
    const {phone} = await searchParams;
    const accessToken = await getAccessToken();
    const access = {accessToken, phone};

    let order;
    try {
        order = await oneq.getOrder(orderNo, access);
    } catch (error) {
        const msg = error instanceof OnequeError ? error.message : "조회 실패";
        return (
            <main>
                <h1>주문 조회</h1>
                <p style={{color: "crimson"}}>{msg}</p>
                <p style={{color: "#888"}}>게스트는 주소에 <code>?phone=연락처</code> 를 붙여야 합니다.</p>
            </main>
        );
    }

    let shipment: ShipmentInfo | null = null;
    try {
        shipment = await oneq.getShipment(orderNo, access);
    } catch {
        shipment = null; // 아직 출고 전이면 배송 정보 없음
    }

    return (
        <main>
            <h1>주문 {order.orderNo}</h1>
            <p>상태: <strong>{order.status}</strong> · 결제금액 {order.totalAmount.toLocaleString()}원</p>
            <ul>
                {order.items.map((it, i) => (
                    <li key={i}>
                        {it.productName}
                        {it.variantLabel ? ` · ${it.variantLabel}` : ""} × {it.quantity} — {it.lineTotal.toLocaleString()}원
                    </li>
                ))}
            </ul>
            {shipment && (
                <section>
                    <h2>배송 — {shipment.status}</h2>
                    {shipment.carrierCode && <p>{shipment.carrierCode} · {shipment.trackingNo}</p>}
                    <ul>
                        {shipment.events.map((e, i) => (
                            <li key={i}>{e.status} · {e.description} · {e.location}</li>
                        ))}
                    </ul>
                </section>
            )}
        </main>
    );
}
