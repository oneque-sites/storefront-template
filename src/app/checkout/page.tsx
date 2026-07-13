"use client";

import {useState, useTransition} from "react";

/**
 * 결제 폼. 구매자 연락처는 게스트 주문 조회 크리덴셜이라 필수. 제출하면 주문 생성 + 결제세션 →
 * paymentUrl 로 이동한다(페이원큐 결제창). 결과는 백엔드 웹훅이 확정하므로 프론트는 이동만.
 */
export default function CheckoutPage() {
    const [form, setForm] = useState({buyerName: "", buyerPhone: "", buyerEmail: "", address1: ""});
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({...f, [k]: e.target.value}));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        startTransition(async () => {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    buyerName: form.buyerName,
                    buyerPhone: form.buyerPhone,
                    buyerEmail: form.buyerEmail || undefined,
                    shipTo: form.address1 ? {name: form.buyerName, phone: form.buyerPhone, address1: form.address1} : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? "결제에 실패했습니다.");
                return;
            }
            // 결제창으로 이동. 실제 결제 확정은 백엔드 웹훅이 한다.
            window.location.href = data.paymentUrl;
        });
    };

    return (
        <main>
            <h1>결제</h1>
            <form onSubmit={submit} style={{display: "grid", gap: 8, maxWidth: 360}}>
                <input required placeholder="이름" value={form.buyerName} onChange={set("buyerName")} />
                <input required placeholder="연락처 (주문 조회에 사용)" value={form.buyerPhone} onChange={set("buyerPhone")} />
                <input placeholder="이메일 (선택)" value={form.buyerEmail} onChange={set("buyerEmail")} />
                <input placeholder="배송지 주소 (재화면)" value={form.address1} onChange={set("address1")} />
                <button type="submit" disabled={pending}>{pending ? "처리 중…" : "결제하기"}</button>
                {error && <p style={{color: "crimson"}}>{error}</p>}
            </form>
        </main>
    );
}
