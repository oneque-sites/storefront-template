import type {Metadata, Viewport} from "next";
import type {ReactNode} from "react";
import {SiteHeader} from "@/components/SiteHeader";

export const metadata: Metadata = {
    title: "원큐 스토어프론트 스타터",
    description: "@oneque/client 위에서 도는 쇼핑몰/예약 사이트 골격",
};

export const viewport: Viewport = {width: "device-width", initialScale: 1};

export default function RootLayout({children}: {children: ReactNode}) {
    return (
        <html lang="ko">
            <body style={{fontFamily: "system-ui, sans-serif", maxWidth: 880, margin: "0 auto", padding: 16}}>
                <SiteHeader />
                {children}
            </body>
        </html>
    );
}
