import {oneq} from "@/lib/oneque";
import {fallbackSiteName, siteUrl} from "@/lib/site";
import {JsonLd, organizationJsonLd} from "@/components/JsonLd";

/**
 * 홈 (RSC · ISR). 사이트 설정·커머스 카테고리는 세션 무관 공개 데이터라 요청마다 서버 렌더할
 * 이유가 없다 — 정적으로 프리렌더하고 `revalidate` 주기로만 갱신한다(SKILL.md "서버 동적 렌더 최소화").
 * revalidate 를 주면 이 세그먼트의 fetch 기본값이 no-store 에서 이 주기 캐시로 바뀌어 라우트가 ISR 이 된다.
 */
export const dynamic = "force-static";
export const revalidate = 600;

export default async function Home() {
    // ISR 캐시 태그(memo31 §0-1) — 백엔드가 설정/상품 변경 시 revalidateTag 로 이 페이지만 콕 집어 무효화한다.
    // site-config: 사이트 설정·테마·레이아웃(전 페이지 영향) · products: 카탈로그 변경.
    const config = await oneq.getSiteConfig({tags: ["site-config"]}).catch(() => null);
    const categories = await oneq.listProductCategories({tags: ["products"]}).catch(() => []);

    return (
        <main className="py-8">
            {/* 사이트 주체 — 홈에 1회만(memo 50 W1). 오프라인 점포·뷰티샵 테마는 organizationJsonLd 의
                type 을 LocalBusiness·BeautySalon 으로 좁힌다. 설정이 비면 낼 게 없으므로 생략한다. */}
            {config && <JsonLd data={organizationJsonLd(config, siteUrl())} />}
            <h1>{config?.companyName ?? fallbackSiteName()}</h1>

            <h2>카테고리</h2>
            <ul className="flex flex-wrap gap-2 list-none p-0">
                {categories.map((c) => (
                    <li key={c.id} className="rounded-full border border-border px-3 py-1 text-sm">
                        {c.name} <span className="text-muted">/{c.slug}</span>
                    </li>
                ))}
                {categories.length === 0 && <li className="text-muted">카테고리가 없습니다.</li>}
            </ul>
            {/* 여기가 거래처 홈이 자랄 자리다 — 히어로·상품 그리드·예약 CTA 를 AI 로 붙인다.
                개발자용 안내 문구는 두지 않는다: 이 골격은 거래처 사이트로 그대로 복제된다.
                장바구니·마이페이지 링크는 SiteHeader 에 이미 있다. */}
        </main>
    );
}
