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
 */
import {readdirSync, readFileSync, statSync} from "node:fs";
import {join, relative} from "node:path";

const root = process.argv[2] ?? "./src";
const errors = [];
const warnings = [];
let singletonFound = false;

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
