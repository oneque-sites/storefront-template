import {NextResponse} from "next/server";
import {oneq} from "@/lib/oneque";
import {errorResponse} from "@/lib/http";
import {ensureCartSessionKey, getAccessToken} from "@/lib/session";

/** 장바구니 담기 — 게스트면 카트 세션키를 만들어 쿠키에 심고, 그 키로 담는다. */
export async function POST(req: Request) {
    const {variantId, quantity} = await req.json();
    // 게스트 카트키를 확보(없으면 생성)해 명시적으로 세션을 구성한다 — 같은 요청에서 재조회에 의존하지 않는다.
    const cartSessionKey = await ensureCartSessionKey();
    const accessToken = await getAccessToken();
    try {
        const cart = await oneq.addToCart(Number(variantId), Number(quantity) || 1, {accessToken, cartSessionKey});
        return NextResponse.json(cart);
    } catch (error) {
        return errorResponse(error);
    }
}
