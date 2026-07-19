import {redirect} from "next/navigation";
import {OnequeError, type CustomerSummary} from "@oneque/client";
import {oneq} from "@/lib/oneque";
import {getAccessToken} from "@/lib/session";
import {LogoutButton} from "@/components/LogoutButton";
import {MarketingConsent} from "@/components/MarketingConsent";

/** 갱신 경유지 — 돌아올 자리를 알려준다(내부 경로만 허용된다). */
const REFRESH_PATH = "/api/auth/refresh?next=%2Fmypage";

/**
 * 마이페이지 (RSC). 쿠키의 access 토큰으로 getMe 를 호출해 고객 정보를 보여준다.
 * (access 토큰은 서버에서만 다뤄 JS 에 노출 안 함.)
 *
 * **401 은 "갱신하라"이지 "로그아웃하라"가 아니다**(memo 50 §24-3 후속). access 는 15분, refresh 는
 * 30일이다 — 401 을 곧바로 로그인으로 보내면 그 30일이 무의미해지고 **고객이 15분마다 재로그인**한다.
 * 그래서 갱신 경유지로 보내고, 갱신하고 돌아왔는데도(`r=1`) 또 401 이면 그때 로그인으로 보낸다.
 */
export default async function MyPage({searchParams}: {searchParams: Promise<{r?: string}>}) {
    const accessToken = await getAccessToken();
    const alreadyRefreshed = (await searchParams).r === "1";
    // 토큰이 아예 없으면 갱신 경유지가 판단한다(refresh 쿠키가 살아 있을 수 있다 — 있으면 되살아난다).
    if (!accessToken) redirect(alreadyRefreshed ? "/login" : REFRESH_PATH);

    let me: CustomerSummary;
    try {
        me = await oneq.getMe(accessToken);
    } catch (error) {
        if (error instanceof OnequeError && (error.status === 401 || error.status === 403)) {
            // 이미 갱신하고 왔는데도 거부면 갱신으로 풀 문제가 아니다 — 그때만 로그인.
            redirect(alreadyRefreshed ? "/login" : REFRESH_PATH);
        }
        throw error;
    }

    return (
        <main className="py-8">
            <h1>마이페이지</h1>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 max-w-md">
                <dt className="text-muted">이름</dt>
                <dd className="m-0">{me.name ?? "-"}</dd>
                <dt className="text-muted">이메일</dt>
                <dd className="m-0">{me.email ?? "-"}</dd>
                <dt className="text-muted">연락처</dt>
                <dd className="m-0">{me.phone ?? "-"}</dd>
                <dt className="text-muted">customerKey</dt>
                <dd className="m-0">
                    <code>{me.customerKey}</code>
                </dd>
            </dl>
            <MarketingConsent />
            <div className="mt-4">
                <LogoutButton />
            </div>
        </main>
    );
}
