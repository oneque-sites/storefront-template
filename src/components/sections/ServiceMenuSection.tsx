import Link from "next/link";
import type {ProductSummary} from "@oneque/client";
import {asIdArray, mediaSrc, parseConfig} from "./parse";

/** 필드를 믿지 않는다 — raw 편집기가 문법만 보고 통과시킨 값이 올 수 있다. */
type ServiceMenuConfig = Record<string, unknown>;

/** 시술 메뉴 — 고른 상품을 순서대로. */
export function ServiceMenuSection({
    config,
    products,
}: {
    config: string | null;
    products: Map<number, ProductSummary>;
}) {
    const c = parseConfig<ServiceMenuConfig>(config);
    // config 의 id 순서를 지킨다(원장이 정한 노출 순서다). 사라진 상품은 카드만 빠진다.
    const items = asIdArray(c?.productIds)
        .map((id) => products.get(id))
        .filter((p): p is ProductSummary => p != null);
    if (items.length === 0) return null;

    return (
        <section style={{marginBottom: 32}}>
            <ul
                style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                }}
            >
                {items.map((p) => (
                    <li key={p.id} style={{border: "1px solid var(--oneq-primary)", borderRadius: 8, padding: 12}}>
                        <Link href={`/products/${p.slug}`} style={{color: "inherit", textDecoration: "none"}}>
                            {p.coverAssetId != null && (
                                <img
                                    src={mediaSrc(p.coverAssetId)}
                                    alt={p.name}
                                    loading="lazy"
                                    style={{
                                        width: "100%",
                                        aspectRatio: "4/3",
                                        objectFit: "cover",
                                        borderRadius: 4,
                                        marginBottom: 8,
                                    }}
                                />
                            )}
                            <div style={{fontWeight: 600}}>{p.name}</div>
                            {p.priceFrom != null && (
                                <div style={{marginTop: 4, color: "var(--oneq-primary)"}}>
                                    {Number(p.priceFrom).toLocaleString("ko-KR")}원~
                                </div>
                            )}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
