import {NextResponse} from "next/server";
import {oneq} from "@/lib/oneque";
import {clearCustomerTokens, getAccessToken} from "@/lib/session";

/** 로그아웃 — 백엔드 세션 폐기 + 쿠키 삭제. */
export async function POST() {
    const accessToken = await getAccessToken();
    if (accessToken) {
        await oneq.logout(accessToken).catch(() => undefined);
    }
    await clearCustomerTokens();
    return NextResponse.json({ok: true});
}
