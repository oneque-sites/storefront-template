import {NextResponse} from "next/server";
import {oneq} from "@/lib/oneque";
import {errorResponse} from "@/lib/http";
import {setCustomerTokens} from "@/lib/session";

/**
 * 소셜 로그인 — 프론트가 소셜 리다이렉트에서 받은 authorization code 를 넘기면 백엔드가 교환한다.
 * 받은 토큰은 httpOnly 쿠키에 저장한다(브라우저 JS 에 노출하지 않는다).
 */
export async function POST(req: Request) {
    const {provider, code, redirectUri, consents} = await req.json();
    try {
        // consents 는 신규 가입 시 백엔드가 필수 동의를 검증하는 데 쓴다(미충족 시 400 CONSENT_REQUIRED).
        const tokens = await oneq.socialLogin({provider, code, redirectUri, consents});
        await setCustomerTokens(tokens.accessToken, tokens.refreshToken);
        return NextResponse.json({customer: tokens.customer});
    } catch (error) {
        return errorResponse(error);
    }
}
