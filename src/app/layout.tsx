import "./globals.css";
import type {Metadata, Viewport} from "next";
import type {ReactNode} from "react";
import {SiteHeader} from "@/components/SiteHeader";
import {oneq} from "@/lib/oneque";
import {parseSeo} from "@/lib/seo";
import {fallbackSiteName} from "@/lib/site";
import {parseThemeColors} from "@/lib/theme";

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
    const seo = parseSeo(config?.seoDefaults);
    const siteName = seo.title ?? config?.companyName ?? fallbackSiteName();
    return {
        // 하위 라우트가 문자열 title 을 주면 "페이지제목 | 회사명" 이 된다([slug] 가 그렇다).
        // 접미사는 seo.title 이 아니라 companyName 이다 — seo.title 은 길 수 있어 접미사로는 비대해진다.
        title: {default: siteName, template: `%s | ${config?.companyName ?? siteName}`},
        // 없는 문구를 지어내지 않는다 — 생략이 낫다.
        description: seo.description,
    };
}

export default async function RootLayout({children}: {children: ReactNode}) {
    // generateMetadata 와 **같은 인자로** 부른다 → request memoization 이 1회로 합친다(태그가 갈리면
    // 조용히 2회가 된다). 태그만 실은 fetch 는 동적 opt-in 이 아니므로 정적성을 깨지 않는다(§6).
    const config = await oneq.getSiteConfig({tags: ["site-config"]}).catch(() => null);
    // themeColors → CSS 변수. inline style 은 어떤 스타일시트보다 우선하므로 @theme 기본값을 덮는다.
    const {cssVars} = parseThemeColors(config?.themeColors);

    return (
        <html lang="ko" style={cssVars}>
            <body className="bg-background text-foreground font-sans antialiased">
                <div className="mx-auto max-w-4xl px-4">
                    <SiteHeader />
                    {children}
                </div>
            </body>
        </html>
    );
}
