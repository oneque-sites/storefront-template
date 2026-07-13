// 서버 전용. 클라이언트 컴포넌트에서 import 하지 말 것 — baseUrl 이 노출된다.
import {createOnequeClient} from "@oneque/client";

/**
 * 원큐 공개/커머스 API 클라이언트 싱글턴. RSC·route handler·server action 에서만 쓴다.
 * env: ONEQ_API_BASE(백엔드 URL, /api 안 붙임), ONEQ_TENANT(이 사이트 테넌트 코드).
 */
export const oneq = createOnequeClient({
    baseUrl: process.env.ONEQ_API_BASE ?? "http://localhost:8100",
    tenant: process.env.ONEQ_TENANT ?? "birdlab",
});
