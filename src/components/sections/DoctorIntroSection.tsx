import {asId, asString, mediaSrc, parseConfig} from "./parse";

type DoctorIntroConfig = Record<string, unknown>;

/** 원장 소개 — 사진·이름·직함·소개. */
export function DoctorIntroSection({config}: {config: string | null}) {
    const c = parseConfig<DoctorIntroConfig>(config);
    const name = asString(c?.name)?.trim();
    const title = asString(c?.title);
    const bio = asString(c?.bio);
    const photoAssetId = asId(c?.photoAssetId);
    // 이름 없는 소개는 보여줄 게 없다 — 조용히 스킵.
    if (!name) return null;

    return (
        <section style={{display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 32}}>
            {photoAssetId != null && (
                <img
                    src={mediaSrc(photoAssetId)}
                    alt={name}
                    loading="lazy"
                    style={{width: 140, height: 140, objectFit: "cover", borderRadius: 8, flexShrink: 0}}
                />
            )}
            <div>
                <h2 style={{margin: 0, color: "var(--oneq-primary)"}}>{name}</h2>
                {title && <p style={{margin: "4px 0 12px", opacity: 0.75}}>{title}</p>}
                {bio && <p style={{margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7}}>{bio}</p>}
            </div>
        </section>
    );
}
