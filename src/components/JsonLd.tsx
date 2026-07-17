import type {ProductDetail, RatingSummary, SiteConfig} from "@oneque/client";

/**
 * schema.org JSON-LD 삽입 — 검색·AI 발견 경로의 입장권(memo 50 W1).
 *
 * **왜 필요한가**: 구글 리치결과(가격·재고·평점 노출)는 확립된 가치이고, AI 발견(ChatGPT·Gemini 등)은
 * 그 위에 공짜로 얹힌다. 네이버는 자체 에이전트를 돌리며 외부 AI 크롤러를 막으므로(memo 50 §9-3),
 * 독립 브랜드 사이트가 발견될 수 있는 경로는 네이버 밖이고 그 입장권이 이것이다.
 *
 * **AI 가 이 파일을 고칠 때 지킬 것**:
 *  - JSON-LD 는 **페이지에 실제로 보이는 내용만** 서술한다. 없는 이미지·가짜 평점을 넣으면 구조화
 *    데이터 정책 위반(리치결과 박탈)이다.
 *  - 서버 컴포넌트로 유지한다("use client" 금지) — 이 값들은 전부 ISR 로 프리렌더된다.
 */
export function JsonLd({data}: {data: object}) {
    return (
        <script
            type="application/ld+json"
            // `<` 를 유니코드 이스케이프 — 데이터에 `</script>` 가 섞여도 스크립트가 조기 종료되지
            // 않는다(JSON-LD 삽입의 고전적 XSS 벡터). JSON.stringify 는 이걸 해주지 않는다.
            dangerouslySetInnerHTML={{__html: JSON.stringify(data).replace(/</g, "\\u003c")}}
        />
    );
}

/**
 * 상품 상세용 Product + Offer(+ AggregateRating).
 *
 * **variant 마다 Offer 를 하나씩** 낸다 — 우리는 항상 variant 단위로 판다(memo 03 A.1). 옵션 없는
 * 상품도 default variant 1개라 분기가 없다.
 *
 * **image 는 `/media/{id}` 안정 URL 로 낸다**(W4). presigned URL(`getMediaUrl`)을 여기 넣으면 수 분 뒤
 * 만료돼 크롤러가 캐시한 링크가 죽는다 — 절대 쓰지 마라. `coverAssetId` 가 없으면 필드를 생략한다
 * (페이지도 이미지를 안 그리므로 "보이는 것만 서술" 정합). image 는 구글 merchant listing 필수 필드다.
 */
export function productJsonLd(
    product: ProductDetail,
    rating?: RatingSummary | null,
    siteBase?: string,
    /** 있으면 각 Offer 에 환불 정책을 붙인다([merchantReturnPolicyJsonLd] 산출물). 없으면 생략. */
    returnPolicy?: object | null,
) {
    const url = `${siteBase ?? ""}/products/${product.slug}`;

    const offers = product.variants.map((v) => ({
        "@type": "Offer",
        url,
        price: v.price,
        priceCurrency: v.currency,
        availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        ...(v.sku ? {sku: v.sku} : {}),
        // optionSignature 는 단순 상품에서 빈 문자열 — 그때는 이름을 붙이지 않는다.
        ...(v.optionSignature ? {name: v.optionSignature} : {}),
        ...(returnPolicy ? {hasMerchantReturnPolicy: returnPolicy} : {}),
    }));

    return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        url,
        // 페이지가 그리는 바로 그 이미지 — 안정 URL(/media/{id}). 없으면 필드 자체를 뺀다.
        ...(product.coverAssetId != null ? {image: [`${siteBase ?? ""}/media/${product.coverAssetId}`]} : {}),
        ...(product.description ? {description: product.description} : {}),
        ...(offers.length > 0 ? {offers} : {}),
        // 후기가 0건이면 aggregateRating 자체를 뺀다 — ratingValue: 0 은 "0점짜리 상품"이라는
        // 거짓 진술이고, 구글은 후기 없는 aggregateRating 을 구조화 데이터 위반으로 본다.
        ...(rating && rating.reviewCount > 0
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: rating.averageRating,
                      reviewCount: rating.reviewCount,
                  },
              }
            : {}),
    };
}

/**
 * 업종 → schema.org 타입. 서버가 **실제 업태를 명시 입력받아** 주는 값만 좁힌다
 * (테마 선택에서 유도한 값이 아니다 — 디자인은 업태 진술이 아니므로).
 * 모르는 값·미설정은 `Organization` 으로 흘려보낸다 — 거짓 진술보다 덜 구체적인 진술이 낫다.
 */
function schemaTypeOf(businessType: SiteConfig["businessType"]): string {
    return businessType === "BEAUTY" ? "BeautySalon" : "Organization";
}

/**
 * 사이트 주체(회사) — 홈에 1회.
 *
 * 타입은 `config.businessType` 으로 자동 판별한다(BEAUTY→`BeautySalon`, 미설정→`Organization`).
 * `type` 인자로 덮어쓸 수 있으나 **실제로 그 업태일 때만** 좁혀라 — 온라인 전용 몰에 LocalBusiness 를
 * 붙이면 거짓 진술이다(주소·영업시간을 요구하는 타입).
 */
export function organizationJsonLd(config: SiteConfig, siteBase: string, type?: string) {
    return {
        "@context": "https://schema.org",
        "@type": type ?? schemaTypeOf(config.businessType),
        name: config.companyName,
        url: siteBase,
        ...(config.tel ? {telephone: config.tel} : {}),
        ...(config.email ? {email: config.email} : {}),
        ...(config.address
            ? {address: {"@type": "PostalAddress", streetAddress: config.address, addressCountry: "KR"}}
            : {}),
    };
}

/**
 * 테넌트가 채운 커머스 정책(스키마리스 JSON)의 **읽기 전용 뷰**. 파싱 실패·미설정이면 빈 객체 —
 * 정책은 부가 정보라 여기서 페이지를 죽이지 않는다.
 *
 * 서버가 스키마를 못박지 않는 자리라(문구가 테넌트·업태마다 다르다) 소비 쪽에서 방어적으로 읽는다.
 */
export type CommercePolicies = {
    returns?: {windowDays?: number; notes?: string};
    exchange?: {notes?: string};
    shipping?: {notes?: string};
    as?: {notes?: string};
};

export function parsePolicies(raw: string | null): CommercePolicies {
    if (!raw) return {};
    try {
        return JSON.parse(raw) as CommercePolicies;
    } catch {
        return {};
    }
}

/**
 * 환불 정책(`MerchantReturnPolicy`) — 상품 Offer 에 붙는다. 구글이 리치결과에 "무료 반품·N일 이내"를
 * 노출하는 입력이고, AI 에이전트가 "이 가게 환불 되나"를 읽는 자리다.
 *
 * **금액은 `config.defaultReturnShippingFee`(운영 값) 를 쓴다** — 정책 JSON 의 문구가 아니라.
 * 실제 환불에서 차감되는 값과 표시가 갈리면 그게 표시 의무 위반이다.
 *
 * 기간(`windowDays`)이 없으면 **정책 전체를 내지 않는다** — 반품 창구를 모르는 채 "반품 됨"만
 * 주장하는 건 구조화 데이터로서 무의미하고, 구글도 merchantReturnDays 를 요구한다.
 */
export function merchantReturnPolicyJsonLd(config: SiteConfig, policies: CommercePolicies) {
    const days = policies.returns?.windowDays;
    if (days == null) return null;
    const fee = config.defaultReturnShippingFee;
    return {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "KR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: days,
        returnMethod: "https://schema.org/ReturnByMail",
        // 반품비 0원이면 무료 반품 — 그 사실 자체가 리치결과에 노출된다.
        ...(fee != null && fee > 0
            ? {
                  returnFees: "https://schema.org/ReturnShippingFees",
                  returnShippingFeesAmount: {
                      "@type": "MonetaryAmount",
                      value: fee,
                      currency: "KRW",
                  },
              }
            : {returnFees: "https://schema.org/FreeReturn"}),
    };
}

/** 경로 이동 표시 — 검색결과에 `홈 > 상품 > 이름` 형태로 노출된다. items 는 표시순. */
export function breadcrumbJsonLd(items: Array<{name: string; url: string}>) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };
}
