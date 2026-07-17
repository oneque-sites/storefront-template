"use client";

import Link from "next/link";
import {useAuthHint} from "@/lib/useAuthHint";
import {LogoutButton} from "./LogoutButton";

/**
 * 사이트 헤더 (클라이언트 컴포넌트). 로그인 ↔ 마이페이지/로그아웃 토글을 **낙관적 힌트 쿠키**
 * (`useAuthHint`, 비-httpOnly `oneq_authed`)로 클라이언트에서 판정한다.
 *
 * 예전엔 async RSC 로 서버에서 `getAccessToken()`(=`cookies()`)을 읽었는데, 그러면 이 헤더가 실린
 * 루트 레이아웃이 전 라우트를 요청마다 동적 렌더로 강제해 SEO 페이지(홈·상세)가 정적/ISR 로 CDN
 * 캐시될 수 없었다(memo31 §0-1). 세션 판정을 클라이언트로 내려 페이지는 static/ISR 로 남는다.
 * (토큰 유효성까지는 확인하지 않는다 — 만료라면 마이페이지 진입 시 백엔드 401 로 로그인으로 보낸다.)
 */
export function SiteHeader() {
    const loggedIn = useAuthHint();

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
