import Link from "next/link";
import {oneq} from "@/lib/oneque";

/**
 * 홈 (RSC · ISR). 사이트 설정·커머스 카테고리는 세션 무관 공개 데이터라 요청마다 서버 렌더할
 * 이유가 없다 — 정적으로 프리렌더하고 `revalidate` 주기로만 갱신한다(SKILL.md "서버 동적 렌더 최소화").
 * revalidate 를 주면 이 세그먼트의 fetch 기본값이 no-store 에서 이 주기 캐시로 바뀌어 라우트가 ISR 이 된다.
 */
export const dynamic = "force-static";
export const revalidate = 600;

export default async function Home() {
    const config = await oneq.getSiteConfig().catch(() => null);
    const categories = await oneq.listProductCategories().catch(() => []);

    return (
        <main>
            <h1>{config?.companyName ?? "원큐 스토어"}</h1>
            <p>스토어프론트 스타터 — 이 골격을 AI 로 원하는 디자인으로 키우세요.</p>

            <h2>카테고리</h2>
            <ul>
                {categories.map((c) => (
                    <li key={c.id}>
                        {c.name} <span style={{color: "#888"}}>/{c.slug}</span>
                    </li>
                ))}
                {categories.length === 0 && <li style={{color: "#888"}}>카테고리가 없습니다.</li>}
            </ul>

            <p>
                <Link href="/cart">장바구니</Link> · 상품 상세는 <code>/products/{"{slug}"}</code>
            </p>
        </main>
    );
}
