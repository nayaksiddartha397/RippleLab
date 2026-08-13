import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonTone = "primary" | "secondary" | "quiet" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
};

export function Button({
  className,
  tone = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("button", `button--${tone}`, `button--${size}`, className)}
      type={type}
      {...props}
    />
  );
}
