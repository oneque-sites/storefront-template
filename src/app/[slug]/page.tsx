import {OnequeError, type ProductSummary} from "@oneque/client";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {SectionRenderer, needsProducts} from "@/components/sections/SectionRenderer";
import {oneq} from "@/lib/oneque";
import {parseSeo} from "@/lib/seo";

/**
 * 고정 페이지 (RSC · ISR) — 섹션이 있으면 섹션을, 없으면 레거시 본문을.
 *
 * 루트 `[slug]` 라 `/products`·`/cart` 같은 정적 세그먼트가 우선한다(Next 규칙) — 그 이름과 같은
 * slug 의 페이지는 가려진다. 대신 `/about` 처럼 깔끔한 URL 을 얻는다(메뉴가 그렇게 링크한다).
 *
 * 페이지는 세션 무관 읽기라 요청마다 SSR 하지 않는다. 신선도는 온디맨드 revalidate 로 —
 * 백엔드가 발행 시 아래 태그를 콕 집어 무효화한다.
 */
export const dynamic = "force-static";
export const revalidate = 300;

/** ISR 캐시 태그 — site-config(테마·레이아웃 전 페이지)·pages(전체)·page:{slug}(이 페이지만). */
function tagsFor(slug: string): string[] {
    return ["site-config", "pages", `page:${slug}`];
}

async function loadPage(slug: string) {
    try {
        return await oneq.getPage(slug, {tags: tagsFor(slug)});
    } catch (error) {
        if (error instanceof OnequeError && error.status === 404) notFound();
        throw error;
    }
}

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
    const {slug} = await params;
    const page = await loadPage(slug);
    // seo 는 raw JSON 패스스루 — parseSeo 가 어떤 쓰레기도 {} 로 강하시킨다(제목은 살아야 한다).
    const seo = parseSeo(page.seo);
    // layout 의 title.template(`%s | 상호`)을 타서 "페이지제목 | 상호" 가 된다.
    return {title: seo.title ?? page.title, description: seo.description};
}

export default async function StaticPage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = await params;
    const page = await loadPage(slug);

    // 서버가 정렬해 주지만 한 줄로 방어한다 — 순서는 원장이 정한 것이라 틀리면 티가 난다.
    const sections = [...(page.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

    // 상품 참조 섹션이 있을 때만 1회 조회. 공개 API 에 id 필터가 없어 목록을 맵으로 만든다.
    // 실패해도 페이지는 살아야 한다 — 그 섹션들만 빠진다.
    let products = new Map<number, ProductSummary>();
    if (needsProducts(sections)) {
        const list = await oneq
            .listProducts({productType: "SERVICE", size: 100}, {tags: ["products"]})
            .catch(() => null);
        if (list) products = new Map(list.content.map((p) => [p.id, p]));
    }

    return (
        <main>
            <h1 style={{color: "var(--oneq-primary)"}}>{page.title}</h1>
            {sections.length > 0 ? (
                sections.map((s, i) => <SectionRenderer key={i} section={s} products={products} />)
            ) : page.content ? (
                // 레거시 마크다운 본문 — 섹션이 없는 옛 페이지. 마크다운 렌더러를 안 들이고
                // 문단으로 떨군다. 서식이 필요하면 섹션으로 옮기는 게 정본 경로다.
                <div style={{lineHeight: 1.8, whiteSpace: "pre-wrap"}}>{page.content}</div>
            ) : null}
        </main>
    );
}
