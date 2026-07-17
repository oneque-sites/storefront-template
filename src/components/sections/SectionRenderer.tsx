import type {PageSection, ProductSummary} from "@oneque/client";
import {BeforeAfterGallerySection} from "./BeforeAfterGallerySection";
import {BookingCtaSection} from "./BookingCtaSection";
import {DoctorIntroSection} from "./DoctorIntroSection";
import {ServiceMenuSection} from "./ServiceMenuSection";

/**
 * 섹션 디스패처.
 *
 * **모르는 타입은 조용히 건너뛴다** — 백엔드 `SectionType` 이 append-only 라, 새 타입이 추가돼도
 * 옛 스토어프론트가 깨지지 않아야 한다는 게 계약이다. 에러도 경고도 내지 않는 게 맞다.
 */
export function SectionRenderer({
    section,
    products,
}: {
    section: PageSection;
    products: Map<number, ProductSummary>;
}) {
    switch (section.type) {
        case "SERVICE_MENU":
            return <ServiceMenuSection config={section.config} products={products} />;
        case "BEFORE_AFTER_GALLERY":
            return <BeforeAfterGallerySection config={section.config} />;
        case "BOOKING_CTA":
            return <BookingCtaSection config={section.config} products={products} />;
        case "DOCTOR_INTRO":
            return <DoctorIntroSection config={section.config} />;
        default:
            return null;
    }
}

/** 상품을 참조하는 섹션이 있는가 — 있을 때만 상품 목록을 부른다. */
export function needsProducts(sections: PageSection[]): boolean {
    return sections.some((s) => s.type === "SERVICE_MENU" || s.type === "BOOKING_CTA");
}
