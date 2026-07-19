import {asId, asObjectArray, asString, mediaSrc, parseConfig} from "./parse";

type GalleryConfig = Record<string, unknown>;

interface GalleryItem {
    beforeAssetId: number;
    afterAssetId: number;
    caption?: string;
}

/** 시술 전후 갤러리 — 뷰티 차별화의 핵심 섹션. */
export function BeforeAfterGallerySection({config}: {config: string | null}) {
    const c = parseConfig<GalleryConfig>(config);
    // 짝이 갖춰진 항목만 — 한쪽만 있으면 "전후"가 아니다. 형상이 다른 값은 여기서 걸러진다.
    const items: GalleryItem[] = asObjectArray(c?.items).flatMap((raw) => {
        const before = asId(raw.beforeAssetId);
        const after = asId(raw.afterAssetId);
        return before && after ? [{beforeAssetId: before, afterAssetId: after, caption: asString(raw.caption)}] : [];
    });
    if (items.length === 0) return null;

    return (
        <section className="mb-12">
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
                {items.map((item, i) => (
                    <figure key={i} className="m-0">
                        <div className="flex gap-1">
                            <img
                                src={mediaSrc(item.beforeAssetId)}
                                alt={item.caption ? `${item.caption} 전` : "시술 전"}
                                loading="lazy"
                                className="w-1/2 aspect-square object-cover rounded"
                            />
                            <img
                                src={mediaSrc(item.afterAssetId)}
                                alt={item.caption ? `${item.caption} 후` : "시술 후"}
                                loading="lazy"
                                className="w-1/2 aspect-square object-cover rounded"
                            />
                        </div>
                        {item.caption && (
                            <figcaption className="text-sm text-muted mt-1.5">{item.caption}</figcaption>
                        )}
                    </figure>
                ))}
            </div>
        </section>
    );
}
