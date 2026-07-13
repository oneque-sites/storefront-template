import {NextResponse} from "next/server";
import {OnequeError} from "@oneque/client";

/**
 * OnequeError → JSON 응답. 네트워크 오류(status 0)는 502 로.
 * 백엔드 에러 코드(`code`)도 함께 실어 클라이언트가 분기할 수 있게 한다(예: CONSENT_REQUIRED).
 */
export function errorResponse(error: unknown): NextResponse {
    if (error instanceof OnequeError) {
        return NextResponse.json({message: error.message, code: error.code}, {status: error.status || 502});
    }
    return NextResponse.json({message: "요청 처리 중 오류가 발생했습니다."}, {status: 500});
}
