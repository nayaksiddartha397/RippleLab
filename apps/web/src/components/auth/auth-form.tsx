"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthActionState } from "@/lib/auth/types";
import { initialAuthState } from "@/lib/auth/types";

type AuthAction = (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;

type Field = {
  autoComplete: string;
  hint?: string;
  label: string;
  minLength?: number;
  name: string;
  placeholder?: string;
  required?: boolean;
  type: "email" | "password";
};

type AuthFormProps = {
  action: AuthAction;
  fields: Field[];
  next?: string;
  secondary?: { href: string; label: string };
  submitLabel: string;
};

export function AuthForm({ action, fields, next, secondary, submitLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);

  return (
    <form action={formAction} className="auth-form" noValidate>
      {next ? <input name="next" type="hidden" value={next} /> : null}
      {fields.map((field) => {
        const errorId = `${field.name}-error`;
        const hintId = `${field.name}-hint`;
        const errors = state.fieldErrors?.[field.name];

        return (
          <div className="field" key={field.name}>
            <label className="field__label" htmlFor={field.name}>
              {field.label}
            </label>
            <input
              aria-describedby={errors ? errorId : field.hint ? hintId : undefined}
              aria-invalid={Boolean(errors)}
              autoComplete={field.autoComplete}
              className={`field__control${errors ? " field__control--error" : ""}`}
              id={field.name}
              minLength={field.minLength}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required ?? true}
              type={field.type}
            />
            {errors ? (
              <span className="field__message field__message--error" id={errorId}>
                {errors.join(" ")}
              </span>
            ) : field.hint ? (
              <span className="field__message" id={hintId}>
                {field.hint}
              </span>
            ) : null}
          </div>
        );
      })}

      {state.message ? (
        <p className={`auth-message auth-message--${state.status}`} role="status">
          {state.message}
        </p>
      ) : null}

      <div className="auth-form__actions">
        <button className="button button--primary button--md" disabled={pending} type="submit">
          {pending ? "Please wait…" : submitLabel}
        </button>
        {secondary ? <Link href={secondary.href}>{secondary.label}</Link> : null}
      </div>
    </form>
  );
}
