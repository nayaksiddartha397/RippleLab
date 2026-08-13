import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type SharedFieldProps = {
  label: string;
  hint?: string;
  error?: string;
};

type TextFieldProps = SharedFieldProps & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, hint, error, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <label className="field" htmlFor={fieldId}>
      <span className="field__label">{label}</span>
      <input
        aria-describedby={hint || error ? messageId : undefined}
        aria-invalid={Boolean(error)}
        className={cn("field__control", error && "field__control--error", className)}
        id={fieldId}
        {...props}
      />
      {hint || error ? (
        <span className={cn("field__message", error && "field__message--error")} id={messageId}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}

type SelectFieldProps = SharedFieldProps & SelectHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ label: string; value: string }>;
};

export function SelectField({
  label,
  hint,
  error,
  className,
  id,
  options,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <label className="field" htmlFor={fieldId}>
      <span className="field__label">{label}</span>
      <span className="field__select-wrap">
        <select
          aria-describedby={hint || error ? messageId : undefined}
          aria-invalid={Boolean(error)}
          className={cn("field__control", error && "field__control--error", className)}
          id={fieldId}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
      {hint || error ? (
        <span className={cn("field__message", error && "field__message--error")} id={messageId}>
          {error ?? hint}
        </span>
      ) : null}
    </label>
  );
}
