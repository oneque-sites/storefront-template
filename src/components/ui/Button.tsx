import type {ButtonHTMLAttributes} from "react";

/** 의존성 최소 — clsx 등을 들이지 않고 한 줄로 클래스를 합친다. */
export function cn(...xs: Array<string | false | null | undefined>): string {
    return xs.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "outline" | "ghost";

const BASE =
    "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold " +
    "transition-colors disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-background text-foreground hover:bg-surface",
    ghost: "text-foreground hover:bg-surface",
};

/**
 * variant 클래스 문자열 헬퍼. `<Link>`·`<a>` 에 그대로 얹는다(BookingCta 가 이 용법).
 * `<button>` 이 아닌 요소는 이 헬퍼를, `<button>` 은 아래 Button 컴포넌트를 쓴다.
 */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string): string {
    return cn(BASE, VARIANTS[variant], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

/**
 * 버튼 프리미티브 — 지시자 없는 공용 컴포넌트(RSC·클라이언트 양쪽에서 쓸 수 있다, 훅 없음).
 * 마크업+variant 분기가 여러 파일에서 반복돼 여기로 모은다.
 */
export function Button({variant = "primary", className, type = "button", ...rest}: ButtonProps) {
    return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}
