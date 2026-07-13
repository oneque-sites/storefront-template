import {randomUUID} from "node:crypto";
import {cookies} from "next/headers";
import type {ShopSession} from "@oneque/client";

/**
 * 스토어프론트 세션 쿠키. 전부 httpOnly — 브라우저 JS 에서 못 읽는다(토큰 탈취 방지).
 * - 게스트 장바구니: 랜덤 세션키(안정적으로 유지돼야 같은 카트를 본다).
 * - 로그인 고객: access/refresh 토큰.
 */
const CART_COOKIE = "oneq_cart";
const ACCESS_COOKIE = "oneq_access";
const REFRESH_COOKIE = "oneq_refresh";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

const secure = process.env.NODE_ENV === "production";

/** 게스트 카트 세션키를 읽거나(없으면) 만들어 쿠키에 심는다. **route handler/server action 에서만** 호출. */
export async function ensureCartSessionKey(): Promise<string> {
    const jar = await cookies();
    const existing = jar.get(CART_COOKIE)?.value;
    if (existing) return existing;
    const key = randomUUID();
    jar.set(CART_COOKIE, key, {httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: THIRTY_DAYS});
    return key;
}

/** 현재 사용자 식별(로그인 토큰 + 게스트 카트키). 읽기 전용 — RSC 에서도 안전. */
export async function getShopSession(): Promise<ShopSession> {
    const jar = await cookies();
    return {
        accessToken: jar.get(ACCESS_COOKIE)?.value,
        cartSessionKey: jar.get(CART_COOKIE)?.value,
    };
}

export async function getAccessToken(): Promise<string | undefined> {
    return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
    return (await cookies()).get(REFRESH_COOKIE)?.value;
}

/** 소셜 로그인 성공 후 토큰 저장. **route handler/server action 에서만.** */
export async function setCustomerTokens(accessToken: string, refreshToken: string): Promise<void> {
    const jar = await cookies();
    jar.set(ACCESS_COOKIE, accessToken, {httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: THIRTY_DAYS});
    jar.set(REFRESH_COOKIE, refreshToken, {httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: THIRTY_DAYS});
}

export async function clearCustomerTokens(): Promise<void> {
    const jar = await cookies();
    jar.delete(ACCESS_COOKIE);
    jar.delete(REFRESH_COOKIE);
}
