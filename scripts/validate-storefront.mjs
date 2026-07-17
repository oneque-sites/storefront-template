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
 *  C1b layout 폭발반경 게이트 — layout/template 이 **import 로 도달하는 서버 모듈**에서 동적 API 를
 *      쓰면 실패. C1 과 달리 파일 하나가 아니라 import 그래프를 본다.
 */
import {readdirSync, readFileSync, statSync} from "node:fs";
import {basename, dirname, join, relative, resolve, sep} from "node:path";

const root = process.argv[2] ?? "./src";
const errors = [];
const warnings = [];
const layoutFiles = [];
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
            if (isLayoutFile(full)) layoutFiles.push(full);
        }
    }
}

// ── C1b: layout 폭발반경 게이트 ──────────────────────────────────
//
// 왜 파일 하나가 아니라 그래프인가: 실제로 터졌던 사고가 그 모양이었다. `cookies()` 는 layout 안이
// 아니라 layout 이 import 한 `SiteHeader`(당시 async RSC) 안에 있었고, 그게 **전 라우트**를 요청마다
// 동적 렌더로 끌고 갔다(SiteHeader.tsx 주석에 기록). layout 파일만 훑는 검사는 그 사고를 못 잡는다 —
// 안심만 주는 게이트는 없느니만 못하다.
//
// 폭발반경이 C1 과 다르다: page 의 동적화는 그 라우트 1개, layout 의 동적화는 그 서브트리 전부다.

/**
 * layout/template 파일인가(app 하위). 라우트 그룹 `(shop)`·병렬 라우트 `@slot` 어디에 있든 잡는다.
 *
 * C1 의 SEO 제외 세그먼트(cart·mypage·login…)는 layout 에도 적용한다. `app/mypage/layout.tsx` 의
 * 인증 게이트(`cookies()` + redirect)는 표준 Next 패턴이고, 그 폭발반경은 **어차피 동적인**
 * mypage 서브트리뿐이다 — 이 게이트 자신의 논리로도 잡을 이유가 없다.
 */
function isLayoutFile(file) {
    if (!/^(layout|template)\.(ts|tsx|js|jsx)$/.test(basename(file))) return false;
    const segments = relative(root, file).split(sep);
    if (segments[0] !== "app") return false;
    return !segments.slice(1, -1).map(normalizeSegment).some((s) => SEO_EXCLUDE_SEGMENTS.has(s));
}

/**
 * 서버 렌더를 요청마다 강제하는 어휘. Next 의 동적 opt-in 은 열거적이다 — 태그만 실은 fetch 는
 * 여기 없다(그래서 layout 의 `getSiteConfig({tags})` 는 정적성을 깨지 않는다).
 *
 * `corpus` 가 규칙마다 다른 이유 — **이게 없으면 규칙이 조용히 죽는다**:
 *  - "code": 문자열 리터럴을 지운 사본. 호출형(`cookies()`) 검출용. 문자열을 지워야
 *    `` throw new Error(`cookies() 를 못 읽었습니다`) `` 같은 메시지가 오탐이 안 된다.
 *  - "text": 주석만 지운 사본. **값이 문자열 안에 있는** 규칙용(`"force-dynamic"`·`"no-store"`).
 *    이들을 "code" 에서 돌리면 정규식이 찾는 그 문자열이 검출 전에 `""` 로 소거돼
 *    **영원히 매치되지 않는다**(실제로 그렇게 만들었다가 검수에서 잡혔다 — import 추출에서 밟은
 *    것과 같은 함정을 검출 쪽에 남겨뒀었다). 이 규칙들은 `export const dynamic =`·`cache:` 같은
 *    앞머리를 요구하므로 단순 메시지 문자열엔 걸리지 않는다.
 */
const DYNAMIC_API = [
    {re: /\bcookies\s*\(/, why: "cookies()", corpus: "code"},
    {re: /\bheaders\s*\(/, why: "headers()", corpus: "code"},
    {re: /\bdraftMode\s*\(/, why: "draftMode()", corpus: "code"},
    {re: /\bconnection\s*\(/, why: "connection()", corpus: "code"},
    {re: /\b(?:unstable_noStore|noStore)\s*\(/, why: "unstable_noStore()", corpus: "code"},
    {re: /export\s+const\s+revalidate\s*=\s*0\b/, why: "export const revalidate = 0", corpus: "code"},
    {re: /next\s*:\s*\{[^}]*\brevalidate\s*:\s*0\b/, why: "fetch(..., {next: {revalidate: 0}})", corpus: "code"},
    {re: /cache\s*:\s*["']no-store["']/, why: `fetch(..., {cache: "no-store"})`, corpus: "text"},
    {
        re: /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/,
        why: `export const dynamic = "force-dynamic"`,
        corpus: "text",
    },
];

/**
 * 주석을 지운 사본. 안 지우면 "예전엔 cookies() 를 읽었는데" 같은 **설명 주석**이 오탐이 된다
 * (SiteHeader 주석이 정확히 그렇다). `//` 는 URL(`http://`)과 구분하려고 앞 문자가 `:` 이 아닐 때만.
 */
function stripComments(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * 주석에 더해 **문자열 리터럴까지** 지운 사본 — 호출형 규칙(`corpus: "code"`) 검출용.
 *
 * 문자열을 지우는 이유: `` throw new Error(`cookies() 를 못 읽었습니다`) `` 같은 메시지가 오탐이 된다.
 *
 * ⚠️ 두 가지를 조심해야 한다(둘 다 실제로 밟았다):
 *  1. 이 사본에서 **import 지정자를 뽑으면 안 된다** — `from "@/lib/session"` 이 `from ""` 이 돼
 *     그래프가 조용히 끊긴다. import 추출은 [stripComments] 사본에서 한다.
 *  2. 값이 문자열 안에 있는 규칙(`"force-dynamic"`)을 이 사본에서 찾으면 **영원히 못 찾는다**.
 *     그래서 DYNAMIC_API 에 `corpus` 가 있다.
 *
 * `'`·`"` 는 **개행을 넘지 못하게** 한다. 안 그러면 JSX 의 `Don't` 아포스트로피가 아래쪽 `It's` 와
 * 짝지어져 그 사이의 실코드(`cookies()` 포함)를 통째로 삼키고, 문자열 속 `//`(예: `"//cdn.example.com"`)
 * 가 닫는 따옴표를 주석으로 먹혀 고아 따옴표가 다음 줄까지 삼킨다. 삼켜진 자리는 검출이 안 된다 —
 * 조용한 거짓 음성이다. 자바스크립트 문자열은 어차피 개행을 못 넘으므로(템플릿 리터럴만 넘는다)
 * 이 제약은 정확하기도 하다.
 */
function stripCommentsAndStrings(src) {
    return stripComments(src)
        .replace(/`(?:\\[\s\S]|[^\\`])*`/g, "``")
        .replace(/"(?:\\.|[^\\"\n])*"/g, '""')
        .replace(/'(?:\\.|[^\\'\n])*'/g, "''");
}

/** `@/x`·상대경로만 해석한다. 외부 패키지(next·react·@oneque/client)는 추적 대상이 아니다. */
function resolveImport(spec, fromFile) {
    let base;
    if (spec.startsWith("@/")) base = join(root, spec.slice(2));
    else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
    else return null;

    for (const cand of [base, ...[".ts", ".tsx", ".js", ".jsx"].flatMap((e) => [base + e, join(base, "index" + e)])]) {
        try {
            if (statSync(cand).isFile()) return cand;
        } catch {
            /* 다음 후보 */
        }
    }
    return null;
}

/**
 * 정적 import·re-export 의 모듈 지정자. 동적 `import()`·side-effect import 는 추적하지 않는다
 * (아래 한계 주석).
 *
 * 두 가지로 가짜 간선을 막는다:
 *  - **행 머리 앵커**(`^\s*`): 진짜 import 는 문장 위치에 온다. `const SNIPPET = 'import {x} from
 *    "@/lib/session"'` 처럼 문자열 안에 든 코드 조각은 행 중간이라 안 걸린다.
 *  - **템플릿 리터럴 제거**: codegen 제품이라 코드-as-문자열이 백틱 안에 살고, 거기 든 import 는
 *    행 머리에 올 수 있다.
 *
 * `import type`/`export type` 도 **간선이 아니다** — 컴파일 시 소거돼 런타임에 그 모듈을 물지 않는다.
 * 빼지 않으면 layout 이 `import type {SessionInfo} from "@/lib/session"` 만 해도 session.ts 의
 * `cookies()` 가 잡히는 순수 오탐이 난다.
 */
function importSpecifiers(src) {
    const noTemplates = src.replace(/`(?:\\[\s\S]|[^\\`])*`/g, "``");
    const out = [];
    for (const re of [
        /^\s*import\s+(?!type\s)[^;]*?from\s*["']([^"']+)["']/gm,
        /^\s*export\s+(?!type\s)[^;]*?from\s*["']([^"']+)["']/gm,
    ]) {
        for (const m of noTemplates.matchAll(re)) out.push(m[1]);
    }
    return out;
}

/**
 * `"use client"` 지시자를 가진 파일인가 — 즉 서버 그래프의 **경계**인가.
 *
 * 파일 **선두**에서만 판정한다(주석·BOM 은 건너뛴다). raw 전체에 `/^…/m` 을 걸면:
 *  - 템플릿 리터럴 안 행머리의 `"use client"` 가 파일 전체를 클라이언트로 오판 → 그 파일의
 *    `cookies()` 를 못 본다. codegen 제품이라 **템플릿 문자열이 현실적**이다.
 *  - BOM 이 앞서면 반대로 진짜 지시자를 못 봐서, 클라이언트 컴포넌트 체인을 서버로 오판한다.
 * 지시자는 어차피 선두에만 유효하므로 선두 판정이 정확하기도 하다.
 */
function isClientBoundary(raw) {
    return /^["']use client["']/.test(stripComments(raw).replace(/^﻿/, "").trimStart());
}

/**
 * layout 에서 시작해 서버 모듈만 따라간다. `"use client"` 파일은 **경계라서 멈춘다** — 그 아래는
 * 브라우저에서 돌고 서버 렌더를 동적으로 만들지 않는다(사고의 처방이 정확히 이 경계였다).
 * 반환: [{file, why, chain}] — chain 은 layout→…→범인 경로.
 */
function dynamicApiReachableFrom(entry) {
    const found = [];
    const seen = new Set();
    const queue = [{file: entry, chain: [entry]}];

    while (queue.length > 0) {
        const {file, chain} = queue.shift();
        if (seen.has(file)) continue;
        seen.add(file);

        let raw;
        try {
            raw = readFileSync(file, "utf8");
        } catch {
            continue;
        }
        if (isClientBoundary(raw)) continue; // 클라이언트 경계 — 여기서 끊는다.

        const text = stripComments(raw); // 주석만 제거(문자열 값·import 지정자 보존)
        const code = stripCommentsAndStrings(text); // 문자열까지 제거(호출형 검출)
        for (const {re, why, corpus} of DYNAMIC_API) {
            if (re.test(corpus === "text" ? text : code)) found.push({file, why, chain});
        }
        // import 는 문자열을 남긴 사본에서 — 지운 사본에서 뽑으면 지정자가 사라져 그래프가 끊긴다.
        for (const spec of importSpecifiers(text)) {
            const next = resolveImport(spec, file);
            if (next && !seen.has(next)) queue.push({file: next, chain: [...chain, next]});
        }
    }
    return found;
}

/** 위반마다 맞는 처방. 고정 문구를 쓰면 no-store 위반에 "세션 판정을 내려라"라고 답하게 된다. */
function remedyFor(why) {
    if (/cookies|headers|draftMode|connection/.test(why)) {
        return `세션·요청 의존 값은 클라이언트 컴포넌트(아일랜드)로 내려라 — SiteHeader + useAuthHint 가 그 선례다`;
    }
    return `layout 은 정적으로 두고, 신선도가 필요하면 태그 fetch(\`{tags}\`) + 온디맨드 revalidate 를 써라`;
}

function checkLayoutBlastRadius() {
    // 범인이 같으면 고칠 곳도 하나다 — 조상 layout 수만큼 반복 출력하지 않는다.
    const reported = new Set();
    for (const layout of layoutFiles) {
        for (const {file, why, chain} of dynamicApiReachableFrom(layout)) {
            const key = `${file}|${why}`;
            if (reported.has(key)) continue;
            reported.add(key);

            // 면제는 **범인 파일**에 붙인다 — layout 에 붙이면 그 아래 전부가 한 번에 뚫린다.
            const allow = readFileSync(file, "utf8").match(/\/\/\s*oneq-allow-dynamic:\s*(.+)/);
            const path = chain.map((f) => relative(process.cwd(), f)).join(" → ");
            const detail =
                `${relative(process.cwd(), layout)} 이 ${why} 에 도달한다 → ${path}. ` +
                `layout 의 동적 API 는 **그 아래 전 라우트**를 요청마다 SSR 로 만든다`;
            if (allow) {
                warnings.push(`[C1b] ${detail} — 예외 허용(oneq-allow-dynamic: ${allow[1].trim()}).`);
            } else {
                errors.push(
                    `[C1b] ${detail}(memo31 §0-1). ${remedyFor(why)}. 꼭 필요하면 ` +
                        `${relative(process.cwd(), file)} 에 \`// oneq-allow-dynamic: <이유>\` 마커로 정당화하라 ` +
                        `(마커는 layout 이 아니라 **이 파일**에 붙어야 듣는다).`,
                );
            }
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
checkLayoutBlastRadius(); // walk 가 layoutFiles 를 채운 뒤에.
if (!singletonFound) warnings.push(`[W1] createOnequeClient 싱글턴을 찾지 못했습니다 — 서버 사이드 호출 패턴이 있는지 확인하세요.`);

for (const w of warnings) console.warn("⚠️  " + w);
for (const e of errors) console.error("❌ " + e);

if (errors.length > 0) {
    console.error(`\n${errors.length}개 오류. 스토어프론트 규약 위반을 고치세요 (llms.txt §5 참고).`);
    process.exit(1);
}
console.log(`✅ 통과 — 검사한 규약 위반 없음${warnings.length ? ` (경고 ${warnings.length})` : ""}.`);
