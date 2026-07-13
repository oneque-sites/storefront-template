import {NextResponse} from "next/server";
import {oneq} from "@/lib/oneque";
import {errorResponse} from "@/lib/http";
import {getShopSession} from "@/lib/session";

/**
 * 결제(주문 생성) → 결제 세션 생성. 재고 부족이면 409, 빈 카트면 400.
 * 반환한 paymentUrl 로 고객을 보낸다. 실제 결제 확정은 백엔드가 서명 웹훅으로 처리한다.
 */
export async function POST(req: Request) {
    const input = await req.json(); // {buyerName, buyerPhone, buyerEmail?, shipTo?}
    const session = await getShopSession();
    try {
        const order = await oneq.checkout(input, session);
        const payment = await oneq.startPayment(order.orderNo, {
            accessToken: session.accessToken,
            phone: input.buyerPhone,
        });
        return NextResponse.json({orderNo: order.orderNo, status: order.status, paymentUrl: payment.paymentUrl});
    } catch (error) {
        return errorResponse(error);
    }
}
