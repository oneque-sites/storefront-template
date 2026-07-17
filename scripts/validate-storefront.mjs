#!/usr/bin/env node
/**
 * 원큐 스토어프론트 validator (MVP).
 *
 * AI 가 만든 스토어프론트에서 흔한 보안·정합 실수를 정적으로 잡는다(llms.txt §5). CI 에 걸어
 * 회귀를 막는다. 사용: `node scripts/validate-storefront.mjs [srcDir]` (기본 ./src).
 *
 * 검사:
 *  E1  "use client" 파일에서 @oneque/client 를 값으로 import  → baseUrl/토큰 노출 위험.
 *  E2  "use client" 파일에서 서버 클라이언트 싱글턴(lib/oneque) import → 같은 위험.
 *  W1  클라이언트 싱글턴 파일이 하나도 없음 → 서버 사이드 호출 패턴 미구현 의심.
 *  C1  ISR-우선 게이트(memo31 §0-12) — SEO 라우트 page 가 per-page SSR(동적 렌더)을 강제하면 실패.
 *      codegen 산출물이 홈·목록·상세·콘텐츠 페이지를 동적SSR 로 만들면 CI 를 red 로 만들어 미배포.
 *      정당화된 예외는 파일에 `// oneq-allow-dynamic: <이유>` 마커를 두면 경고로 강등된다.
 */
import {readdirSync, readFileSync, statSync} from "node:fs";
import {basename, join, relative, sep} from "node:path";

const root = process.argv[2] ?? "./src";
const errors = [];
const warnings = [];
let singletonFound = false;

/**
 * ISR-우선 게이트 대상에서 빼는 라우트 세그먼트(app 하위 디렉터리명).
 * 이들은 SEO 페이지가 아니라 **정당하게 동적/세션/쓰기**인 인터랙티브 경로다:
 *  - api      : BFF route handler(ACTION 서버 함수·페이지 아님·revalidate 엔드포인트 포함)
 *  - cart/checkout/mypage/account : 세션·쓰기 인터랙티브
 *  - login/auth                   : 인증 플로우
 *  - orders                       : 주문 조회(토큰·연락처로 식별하는 세션성 조회)
 * 그 외 app 하위의 page.* = 공개 SEO 라우트(홈·목록·상세·콘텐츠)로 간주해 ISR/static 을 강제한다.
 */
const SEO_EXCLUDE_SEGMENTS = new Set(["api", "cart", "checkout", "mypage", "account", "login", "auth", "orders"]);

// 세그먼트 정규화: 라우트 그룹 `(group)`·동적 `[slug]` 껍데기를 벗겨 이름만 비교한다.
function normalizeSegment(seg) {
    return seg.replace(/^\((.*)\)$/, "$1").replace(/^\[+\.*(.*?)\]+$/, "$1");
}

// app/ 하위의 page 파일인지 + SEO(비제외) 라우트인지 판정.
function isSeoPageFile(file) {
    if (!/^page\.(ts|tsx|js|jsx)$/.test(basename(file))) return false;
    const relFromRoot = relative(root, file);
    const segments = relFromRoot.split(sep);
    if (segments[0] !== "app") return false; // src/app 아래만
    // app 과 파일명(page.*) 사이의 디렉터리 세그먼트만 검사.
    const dirSegments = segments.slice(1, -1).map(normalizeSegment);
    return !dirSegments.some((s) => SEO_EXCLUDE_SEGMENTS.has(s));
}

// SEO page 에서 금지되는 per-page SSR 유발 패턴들.
const SSR_FORBIDDEN = [
    {re: /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/, why: `export const dynamic = "force-dynamic" (전 요청 SSR 강제)`},
    {re: /export\s+const\s+revalidate\s*=\s*0\b/, why: `export const revalidate = 0 (ISR 무력화·매 요청 재생성)`},
    {re: /\bcookies\s*\(/, why: `page 레벨 cookies() 호출 (동적 렌더 opt-in — 세션값은 클라이언트 컴포넌트로)`},
    {re: /\bheaders\s*\(/, why: `page 레벨 headers() 호출 (동적 렌더 opt-in)`},
    {re: /cache\s*:\s*["']no-store["']/, why: `fetch(..., { cache: "no-store" }) (캐시 불가·매 요청 fetch)`},
    {re: /next\s*:\s*\{[^}]*\brevalidate\s*:\s*0\b/, why: `fetch(..., { next: { revalidate: 0 } }) (ISR 무력화)`},
];

function walk(dir) {
    for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".next") continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            walk(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
            check(full);
        }
    }
}

function check(file) {
    const src = readFileSync(file, "utf8");
    const rel = relative(process.cwd(), file);
    const isClient = /^["']use client["']/m.test(src);

    // 서버 클라이언트 싱글턴 존재 확인 — createOnequeClient 호출.
    if (/createOnequeClient\s*\(/.test(src)) {
        singletonFound = true;
        if (isClient) errors.push(`[E1] ${rel}: "use client" 파일에서 createOnequeClient 를 만든다 — baseUrl 노출.`);
    }

    if (isClient) {
        // E1: 값 import(= import type 아님)로 @oneque/client 를 들여옴.
        const valueImport = /^import\s+(?!type\s)[^;]*from\s+["']@oneque\/client["']/m.test(src);
        if (valueImport) {
            errors.push(`[E1] ${rel}: "use client" 파일에서 @oneque/client 를 값으로 import 한다 (타입은 \`import type\` 으로).`);
        }
        // E2: 서버 싱글턴(lib/oneque) import.
        if (/from\s+["'][^"']*lib\/oneque["']/.test(src)) {
            errors.push(`[E2] ${rel}: "use client" 파일에서 서버 클라이언트 싱글턴(lib/oneque)을 import 한다.`);
        }
    }

    // C1: ISR-우선 게이트 — SEO 라우트 page 는 per-page SSR 을 강제할 수 없다.
    if (isSeoPageFile(file) && !isClient) {
        const hits = SSR_FORBIDDEN.filter(({re}) => re.test(src)).map(({why}) => why);
        if (hits.length > 0) {
            const allow = src.match(/\/\/\s*oneq-allow-dynamic:\s*(.+)/);
            const detail = `${rel}: SEO 라우트가 동적SSR 을 유발한다 → ${hits.join("; ")}`;
            if (allow) {
                warnings.push(`[C1] ${detail} — 예외 허용(oneq-allow-dynamic: ${allow[1].trim()}).`);
            } else {
                errors.push(
                    `[C1] ${detail}. SEO 페이지는 ISR(export const revalidate = N) 또는 static 이어야 한다. ` +
                        `실시간·개인화 값은 클라이언트 컴포넌트(아일랜드)로, 상태 변경은 BFF route handler 로 옮겨라. ` +
                        `동적 SSR 이 꼭 필요하면 \`// oneq-allow-dynamic: <이유>\` 마커로 정당화하라(memo31 §0-12).`,
                );
            }
        }
    }
}

try {
    statSync(root);
} catch {
    console.error(`디렉터리를 찾을 수 없습니다: ${root}`);
    process.exit(2);
}

walk(root);
if (!singletonFound) warnings.push(`[W1] createOnequeClient 싱글턴을 찾지 못했습니다 — 서버 사이드 호출 패턴이 있는지 확인하세요.`);

for (const w of warnings) console.warn("⚠️  " + w);
for (const e of errors) console.error("❌ " + e);

if (errors.length > 0) {
    console.error(`\n${errors.length}개 오류. 스토어프론트 규약 위반을 고치세요 (llms.txt §5 참고).`);
    process.exit(1);
}
console.log(`✅ 통과 — 검사한 규약 위반 없음${warnings.length ? ` (경고 ${warnings.length})` : ""}.`);
