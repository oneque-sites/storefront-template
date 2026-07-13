import Link from "next/link";
import type {Cart} from "@oneque/client";
import {oneq} from "@/lib/oneque";
import {getShopSession} from "@/lib/session";
import {CartActions} from "./CartActions";

const EMPTY: Cart = {items: [], subtotal: 0, currency: "KRW"};

/** 장바구니 페이지 (RSC). 현재가로 재계산된 카트를 서버에서 읽는다. 변경은 CartActions(클라이언트). */
export default async function CartPage() {
    const session = await getShopSession();
    const hasIdentity = Boolean(session.accessToken || session.cartSessionKey);
    const cart = hasIdentity ? await oneq.getCart(session).catch(() => EMPTY) : EMPTY;

    return (
        <main>
            <h1>장바구니</h1>
            {cart.items.length === 0 ? (
                <p>비어 있습니다. <Link href="/">상품 보러 가기</Link></p>
            ) : (
                <>
                    <ul>
                        {cart.items.map((line) => (
                            <li key={line.variantId} style={{opacity: line.available ? 1 : 0.5}}>
                                {line.productName}
                                {line.variantLabel ? ` · ${line.variantLabel}` : ""} × {line.quantity}
                                {" — "}
                                {(line.lineTotal ?? 0).toLocaleString()}원
                                {line.available ? "" : " (판매 불가)"}
                                {" "}
                                <CartActions variantId={line.variantId} />
                            </li>
                        ))}
                    </ul>
                    <p>
                        <strong>합계 {cart.subtotal.toLocaleString()}원</strong>
                    </p>
                    <p>
                        <Link href="/checkout">결제하기 →</Link>
                    </p>
                </>
            )}
        </main>
    );
}
