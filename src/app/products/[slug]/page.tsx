import {notFound} from "next/navigation";
import {OnequeError} from "@oneque/client";
import {oneq} from "@/lib/oneque";
import {siteUrl} from "@/lib/site";
import {JsonLd, breadcrumbJsonLd, merchantReturnPolicyJsonLd, parsePolicies, productJsonLd} from "@/components/JsonLd";
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
        // ISR 캐시 태그(memo31 §0-1) — site-config(테마·레이아웃, 전 페이지)·products(카탈로그)·
        // product:{slug}(이 상품만). 백엔드가 해당 태그로 이 상세만 콕 집어 revalidate 한다.
        product = await oneq.getProduct(slug, {tags: ["site-config", "products", `product:${slug}`]});
    } catch (error) {
        if (error instanceof OnequeError && error.status === 404) notFound();
        throw error;
    }

    // 평점 요약 — product 의 비정규화 집계라 값싸다. 후기 도메인이 비어 있어도 페이지는 살아야 하므로
    // 실패는 삼키고 aggregateRating 없이 렌더한다(JSON-LD 는 후기 0건이면 그 필드를 아예 뺀다).
    const rating = await oneq.getProductReviewSummary(product.id).catch(() => null);
    // 환불 정책 — Offer 에 실어 리치결과에 "N일 이내 반품·배송비" 가 노출되게 한다(memo 50 W3).
    // 정책은 부가 정보라 실패해도 상품 페이지는 산다.
    const config = await oneq.getSiteConfig({tags: ["site-config"]}).catch(() => null);
    const returnPolicy = config ? merchantReturnPolicyJsonLd(config, parsePolicies(config.commercePolicies)) : null;
    const base = siteUrl();

    return (
        <main>
            {/* 검색·AI 발견용 구조화 데이터(memo 50 W1) — 아래 보이는 내용과 반드시 일치시킨다. */}
            <JsonLd data={productJsonLd(product, rating, base, returnPolicy)} />
            <JsonLd
                data={breadcrumbJsonLd([
                    {name: "홈", url: base},
                    {name: product.name, url: `${base}/products/${product.slug}`},
                ])}
            />
            <h1>{product.name}</h1>
            {/* 커버 이미지 — /media/{id} 안정 URL(W4). next/image 는 바이트를 Next 런타임에 태우므로
                쓰지 않는다(밀도 비용). 없으면 아무것도 안 그린다 — 플레이스홀더 강제 없음. */}
            {product.coverAssetId != null && (
                <img
                    src={`/media/${product.coverAssetId}`}
                    alt={product.name}
                    loading="lazy"
                    style={{maxWidth: "100%", height: "auto", borderRadius: 8}}
                />
            )}
            {product.description && <p style={{whiteSpace: "pre-wrap"}}>{product.description}</p>}
            <AddToCart product={product} />
        </main>
    );
}
