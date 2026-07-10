"use client";

import React from "react";

/** Small, dependency-free UI primitives shared across the app chrome. */

export function Button({
  variant = "solid",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" | "outline" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    solid: "bg-accent hover:bg-accent-soft text-white",
    ghost: "hover:bg-surface-raised text-slate-200",
    outline: "border border-surface-border hover:bg-surface-raised text-slate-200",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-surface-border bg-surface-raised ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-soft placeholder:text-slate-600";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputBase} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputBase} resize-none`} {...props} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={inputBase} {...props}>
      {children}
    </select>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-6 text-sm font-bold uppercase tracking-widest text-slate-300">{children}</h3>;
}
