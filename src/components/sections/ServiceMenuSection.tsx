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
        <section className="mb-12">
            <ul className="grid list-none gap-3 p-0 m-0 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
                {items.map((p) => (
                    <li key={p.id} className="rounded-xl border border-border bg-background p-4">
                        <Link href={`/products/${p.slug}`} className="text-inherit no-underline">
                            {p.coverAssetId != null && (
                                <img
                                    src={mediaSrc(p.coverAssetId)}
                                    alt={p.name}
                                    loading="lazy"
                                    className="w-full aspect-[4/3] object-cover rounded mb-2"
                                />
                            )}
                            <div className="font-semibold">{p.name}</div>
                            {p.priceFrom != null && (
                                <div className="mt-1 text-primary">
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
