/**
 * 섹션 config 파싱 — **절대 throw 하지 않는다.**
 *
 * config 는 백엔드가 검증하지 않는 raw JSON 이다(의도된 설계 — 사이트마다 백엔드를 배포하지
 * 않으려고). 게다가 콘솔의 raw 편집기는 **JSON 문법만** 보고 저장을 허용한다 — 즉 문법은
 * 맞는데 형상이 다른 config 가 **정상 경로로** 들어온다. `{"productIds": 5}` 같은 것.
 *
 * 그래서 파싱이 성공했다고 필드를 믿으면 안 된다. `.map`·`.trim` 을 그냥 부르면 그 순간
 * **페이지 전체가 500** 이 난다 — 계약은 "그 섹션만 사라진다" 였다. 아래 가드들이 그 계약을
 * 지키는 장치다. `lib/theme.ts` 의 parse() 와 같은 사상.
 */
export function parseConfig<T>(config: string | null): T | null {
    if (!config) return null;
    try {
        const parsed: unknown = JSON.parse(config);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
    } catch {
        return null;
    }
}

/** 양의 정수 id 만 남긴다 — 배열이 아니면 빈 배열. */
export function asIdArray(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is number => typeof v === "number" && Number.isInteger(v) && v > 0);
}

/** 객체 배열만 — 아니면 빈 배열. */
export function asObjectArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (v): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v),
    );
}

/** 문자열이 아니면 undefined — 숫자에 `.trim()` 을 부르는 사고를 막는다. */
export function asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

/** 양의 정수가 아니면 undefined. */
export function asId(value: unknown): number | undefined {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

/** 미디어는 프록시로만 — presigned URL 을 마크업에 넣지 않는다(만료되면 깨진 이미지가 박제된다). */
export function mediaSrc(assetId: number): string {
    return `/media/${assetId}`;
}
