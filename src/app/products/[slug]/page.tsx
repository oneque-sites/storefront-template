import {notFound} from "next/navigation";
import {OnequeError} from "@oneque/client";
import {oneq} from "@/lib/oneque";
import {AddToCart} from "./AddToCart";

/**
 * 상품 상세 (RSC · ISR). ACTIVE 상품만 공개된다 — 없으면 404. 상품 카탈로그는 세션 무관 읽기라
 * 요청마다 SSR 하지 않는다: 첫 요청에 렌더한 뒤 `revalidate` 주기로 캐시한다(SKILL.md "서버 동적 렌더 최소화").
 * 재고·가격은 결제 시점에 백엔드가 원자적으로 재검증하므로 이 주기의 stale 은 안전하다.
 * (generateStaticParams 를 두면 특정 slug 를 빌드 프리렌더할 수도 있으나, 카탈로그가 유동적이라 on-demand ISR 로 둔다.)
 */
export const dynamic = "force-static";
export const revalidate = 300;

export default async function ProductPage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;

    let product;
    try {
        product = await oneq.getProduct(slug);
    } catch (error) {
        if (error instanceof OnequeError && error.status === 404) notFound();
        throw error;
    }

    return (
        <main>
            <h1>{product.name}</h1>
            {product.description && <p style={{whiteSpace: "pre-wrap"}}>{product.description}</p>}
            <AddToCart product={product} />
        </main>
    );
}
