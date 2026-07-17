import type {Metadata, Viewport} from "next";
import type {ReactNode} from "react";
import {SiteHeader} from "@/components/SiteHeader";
import {oneq} from "@/lib/oneque";
import {fallbackSiteName} from "@/lib/site";

/**
 * 자체 revalidate 가 없는 정적 라우트(checkout·payment/* 등)에 갱신 주기를 준다.
 *
 * 빌드가 백엔드에 못 닿으면 폴백 제목이 산출물에 박히는데, revalidate 가 없으면
 * `revalidateTag("site-config")` 가 올 때까지 **영구 고정**된다 — 테넌트가 설정을 한 번도 안 건드리면
 * 안 낫는다. 자체 revalidate 를 가진 라우트(홈 600 · [slug] 300)는 더 낮은 값이 이기므로 무영향이고,
 * `cookies()` 를 쓰는 동적 라우트(cart·mypage·orders·login)에는 애초에 적용되지 않는다.
 */
export const revalidate = 3600;

export const viewport: Viewport = {width: "device-width", initialScale: 1};

/**
 * `seoDefaults` 는 opaque JSON 패스스루다(백엔드가 검증하지 않는다) — 어떤 쓰레기가 와도
 * throw 하지 않고 폴백 체인으로 강하해야 한다. 제목은 살아야 한다.
 *
 * 권장 구조: `{"title": "…", "description": "…"}`. 길이 제한·정규화는 하지 않는다(패스스루 철학 —
 * 쓰레기를 넣으면 자기 검색결과가 쓰레기가 되는 건 테넌트 몫이다).
 */
function parseSeoDefaults(raw: string | null | undefined): {title?: string; description?: string} {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return {
            title: typeof parsed.title === "string" ? parsed.title : undefined,
            description: typeof parsed.description === "string" ? parsed.description : undefined,
        };
    } catch {
        return {};
    }
}

/**
 * 사이트 제목 — **거래처 것**이지 우리 것이 아니다.
 *
 * 홈에만 두지 않고 루트 layout 에 두는 이유: 제목은 layout 상속으로 전 라우트에 퍼진다. 홈만 고치면
 * 상품 상세(sitemap 등재 라우트)·policies·checkout 의 탭·검색결과 제목이 그대로 남는다.
 *
 * ISR 을 깨지 않는다 — 동적 렌더 opt-in 은 `cookies()`·`headers()`·`no-store`·`force-dynamic` 처럼
 * 열거된 어휘뿐이고, 태그만 실은 fetch 는 거기 해당하지 않는다(호출 위치가 layout 이든 page 든 같다).
 * 홈에서는 page 의 같은 fetch 와 request memoization 으로 1회로 합쳐진다.
 */
export async function generateMetadata(): Promise<Metadata> {
    const config = await oneq.getSiteConfig({tags: ["site-config"]}).catch(() => null);
    const seo = parseSeoDefaults(config?.seoDefaults);
    const siteName = seo.title ?? config?.companyName ?? fallbackSiteName();
    return {
        // 하위 라우트가 문자열 title 을 주면 "페이지제목 | 회사명" 이 된다([slug] 가 그렇다).
        // 접미사는 seo.title 이 아니라 companyName 이다 — seo.title 은 길 수 있어 접미사로는 비대해진다.
        title: {default: siteName, template: `%s | ${config?.companyName ?? siteName}`},
        // 없는 문구를 지어내지 않는다 — 생략이 낫다.
        description: seo.description,
    };
}

export default function RootLayout({children}: {children: ReactNode}) {
    return (
        <html lang="ko">
            <body style={{fontFamily: "system-ui, sans-serif", maxWidth: 880, margin: "0 auto", padding: 16}}>
                <SiteHeader />
                {children}
            </body>
        </html>
    );
}
