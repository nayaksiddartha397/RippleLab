import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  elevated?: boolean;
};

export function Card({ children, className, elevated = false, ...props }: CardProps) {
  return (
    <section className={cn("card", elevated && "card--elevated", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="card__header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="card__title">{title}</h2>
      </div>
      {action}
    </header>
  );
}
