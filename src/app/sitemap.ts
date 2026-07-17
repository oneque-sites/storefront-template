import type {MetadataRoute} from "next";
import {oneq} from "@/lib/oneque";
import {siteUrl} from "@/lib/site";

/**
 * sitemap.xml — 크롤러에게 "이 사이트에 어떤 URL 이 있는지" 알린다(memo 50 W1).
 *
 * ISR 로 굳힌다. 카탈로그가 바뀌어도 크롤러는 이 주기 안에 따라오면 충분하고, 크롤러 요청마다
 * 전 상품을 훑는 것은 낭비다. (여기서 `headers()` 를 쓰지 않으므로 §0-12 ISR-우선 게이트와 무충돌.)
 *
 * **여기 넣는 것은 실제로 존재하는 공개 라우트뿐이다.** 스타터는 홈과 상품 상세만 공개다 —
 * 장바구니·결제·마이페이지는 세션 경로라 색인 대상이 아니다(robots.ts 에서도 막는다).
 * AI 가 페이지를 추가하면 여기에도 추가해야 색인된다.
 */
export const revalidate = 3600;

/** 페이지네이션 안전 상한 — 카탈로그가 폭증해도 크롤 1회가 무한 루프가 되지 않게 한다. */
const MAX_PAGES = 50;
const PAGE_SIZE = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = siteUrl();

    const products: MetadataRoute.Sitemap = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        // 백엔드가 죽어도 sitemap 은 홈만이라도 내야 한다 — 500 보다 축소된 sitemap 이 낫다.
        const result = await oneq.listProducts({page, size: PAGE_SIZE}).catch(() => null);
        if (!result) break;

        for (const p of result.content) {
            products.push({url: `${base}/products/${p.slug}`, changeFrequency: "daily", priority: 0.8});
        }
        if (result.last) break;
    }

    return [
        {url: base, changeFrequency: "daily", priority: 1},
        // 구매 정책 — 사람에게는 거래조건 표시면, 기계에게는 MerchantReturnPolicy 의 근거 페이지.
        {url: `${base}/policies`, changeFrequency: "monthly", priority: 0.3},
        ...products,
    ];
}
