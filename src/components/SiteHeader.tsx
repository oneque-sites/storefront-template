import Link from "next/link";
import {getAccessToken} from "@/lib/session";
import {LogoutButton} from "./LogoutButton";

/**
 * 사이트 헤더 (async RSC). 쿠키의 access 토큰 유무로 "로그인" ↔ "마이페이지/로그아웃" 을 토글한다.
 * (토큰 유효성까지는 확인하지 않는다 — 만료라면 마이페이지 진입 시 로그인으로 보낸다.)
 */
export async function SiteHeader() {
    const loggedIn = Boolean(await getAccessToken());

    return (
        <header
            style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                paddingBottom: 12,
                marginBottom: 16,
                borderBottom: "1px solid #eee",
            }}
        >
            <Link href="/">홈</Link>
            <Link href="/cart">장바구니</Link>
            <span style={{marginLeft: "auto"}} />
            {loggedIn ? (
                <>
                    <Link href="/mypage">마이페이지</Link>
                    <LogoutButton />
                </>
            ) : (
                <Link href="/login">로그인</Link>
            )}
        </header>
    );
}
