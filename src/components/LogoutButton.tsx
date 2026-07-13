"use client";

import {useTransition} from "react";
import {useRouter} from "next/navigation";

/**
 * 로그아웃 버튼. 서버 라우트 `/api/auth/logout`(백엔드 세션 폐기 + 쿠키 삭제) 호출 후 홈으로 이동한다.
 * 토큰은 httpOnly 쿠키라 JS 에서 만질 수 없다 — 서버 라우트가 삭제한다.
 */
export function LogoutButton() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const logout = () => {
        startTransition(async () => {
            await fetch("/api/auth/logout", {method: "POST"});
            router.push("/");
            router.refresh();
        });
    };

    return (
        <button type="button" onClick={logout} disabled={pending}>
            {pending ? "로그아웃 중…" : "로그아웃"}
        </button>
    );
}
