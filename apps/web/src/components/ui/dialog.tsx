"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type DialogProps = {
  children: ReactNode;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function Dialog({ children, description, onOpenChange, open, title }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="dialog"
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <div className="dialog__content">
        <div className="dialog__header">
          <div>
            <p className="eyebrow">RippleLab preview</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button aria-label="Close dialog" onClick={() => onOpenChange(false)} size="sm" tone="quiet">
            <span aria-hidden="true">×</span>
          </Button>
        </div>
        {description ? <p id={descriptionId}>{description}</p> : null}
        <div className="dialog__body">{children}</div>
      </div>
    </dialog>
  );
}
