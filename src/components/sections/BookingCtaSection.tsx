import Link from "next/link";
import type {ProductSummary} from "@oneque/client";
import {buttonClasses} from "@/components/ui/Button";
import {asId, asString, parseConfig} from "./parse";

type BookingCtaConfig = Record<string, unknown>;

/** 예약 유도 버튼 — 상품 상세로 보낸다(거기서 슬롯을 고른다). */
export function BookingCtaSection({
    config,
    products,
}: {
    config: string | null;
    products: Map<number, ProductSummary>;
}) {
    const c = parseConfig<BookingCtaConfig>(config);
    const productId = asId(c?.productId);
    const product = productId != null ? products.get(productId) : undefined;
    // 가리키던 상품이 사라졌으면 아무 데도 못 보내는 버튼이 된다 — 안 그린다.
    if (!product) return null;

    return (
        <section className="mb-12 text-center">
            <Link href={`/products/${product.slug}`} className={buttonClasses("primary", "no-underline")}>
                {asString(c?.label)?.trim() || "예약하기"}
            </Link>
        </section>
    );
}
