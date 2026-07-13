import {redirect} from "next/navigation";
import {OnequeError, type CustomerSummary} from "@oneque/client";
import {oneq} from "@/lib/oneque";
import {getAccessToken} from "@/lib/session";
import {LogoutButton} from "@/components/LogoutButton";
import {MarketingConsent} from "@/components/MarketingConsent";

/**
 * 마이페이지 (RSC). 쿠키의 access 토큰으로 getMe 를 호출해 고객 정보를 보여준다.
 * 미로그인·토큰 만료(401/403)면 로그인으로 리다이렉트한다. (access 토큰은 서버에서만 다뤄 JS 에 노출 안 함.)
 */
export default async function MyPage() {
    const accessToken = await getAccessToken();
    if (!accessToken) redirect("/login");

    let me: CustomerSummary;
    try {
        me = await oneq.getMe(accessToken);
    } catch (error) {
        if (error instanceof OnequeError && (error.status === 401 || error.status === 403)) {
            redirect("/login");
        }
        throw error;
    }

    return (
        <main>
            <h1>마이페이지</h1>
            <dl style={{display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", maxWidth: 480}}>
                <dt style={{color: "#888"}}>이름</dt>
                <dd style={{margin: 0}}>{me.name ?? "-"}</dd>
                <dt style={{color: "#888"}}>이메일</dt>
                <dd style={{margin: 0}}>{me.email ?? "-"}</dd>
                <dt style={{color: "#888"}}>연락처</dt>
                <dd style={{margin: 0}}>{me.phone ?? "-"}</dd>
                <dt style={{color: "#888"}}>customerKey</dt>
                <dd style={{margin: 0}}>
                    <code>{me.customerKey}</code>
                </dd>
            </dl>
            <MarketingConsent />
            <div style={{marginTop: 16}}>
                <LogoutButton />
            </div>
        </main>
    );
}
