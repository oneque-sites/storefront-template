"use client";

import {useMemo, useState} from "react";
import type {ConsentType} from "@oneque/client";
import {CONSENT_ITEMS, buildConsents, hasAllRequiredConsents} from "@/lib/oauth";
import {SocialLoginButtons} from "./SocialLoginButtons";
import {TestLogin} from "./TestLogin";

/**
 * 로그인 패널(클라이언트). 약관 동의 상태를 한 곳에서 소유하고, 그 값으로 소셜/테스트 로그인 버튼을
 * 게이트한다. 필수 3종(이용약관·개인정보·만14세)이 모두 체크되기 전에는 로그인 버튼이 비활성화된다.
 *
 * 동의 선택은 `ConsentInput[]` 로 만들어 자식에게 넘긴다. 소셜 버튼은 리다이렉트 전 sessionStorage 에
 * 저장하고, 테스트 로그인은 바로 바디에 싣는다.
 */
export function LoginPanel({showTest}: {showTest: boolean}) {
    const [granted, setGranted] = useState<ReadonlySet<ConsentType>>(new Set());

    const toggle = (type: ConsentType) => {
        setGranted((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            return next;
        });
    };

    const allChecked = granted.size === CONSENT_ITEMS.length;
    const toggleAll = () => {
        setGranted(allChecked ? new Set() : new Set(CONSENT_ITEMS.map((c) => c.type)));
    };

    const ready = hasAllRequiredConsents(granted);
    const consents = useMemo(() => buildConsents(granted), [granted]);

    return (
        <div style={{display: "grid", gap: 16, maxWidth: 320}}>
            <fieldset style={{border: "1px solid #eee", borderRadius: 8, padding: 12, margin: 0}}>
                <legend style={{padding: "0 6px", color: "#555"}}>약관 동의</legend>

                <label style={{display: "flex", alignItems: "center", gap: 8, fontWeight: 600, paddingBottom: 8}}>
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                    전체 동의
                </label>

                <div style={{borderTop: "1px solid #f0f0f0", paddingTop: 8, display: "grid", gap: 6}}>
                    {CONSENT_ITEMS.map((item) => (
                        <label key={item.type} style={{display: "flex", alignItems: "center", gap: 8}}>
                            <input
                                type="checkbox"
                                checked={granted.has(item.type)}
                                onChange={() => toggle(item.type)}
                            />
                            <span>
                                <span style={{color: item.required ? "crimson" : "#888"}}>
                                    [{item.required ? "필수" : "선택"}]
                                </span>{" "}
                                {item.label}
                            </span>
                        </label>
                    ))}
                </div>

                {!ready && (
                    <p style={{color: "#888", fontSize: "0.85rem", marginTop: 8, marginBottom: 0}}>
                        가입을 진행하려면 필수 약관에 모두 동의해 주세요.
                    </p>
                )}
            </fieldset>

            <SocialLoginButtons consents={consents} disabled={!ready} />
            {showTest && <TestLogin consents={consents} disabled={!ready} />}
        </div>
    );
}
