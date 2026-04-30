import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn.ts'

export type ButtonVariant = 'primary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ' +
  'transition-colors select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 ' +
  'disabled:cursor-not-allowed'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-surface-0 hover:brightness-110 ' +
    'disabled:bg-surface-2 disabled:text-ink-3',
  ghost:
    'bg-surface-2 text-ink-1 hover:bg-surface-3 ' +
    'disabled:bg-surface-2 disabled:text-ink-3',
  danger:
    'bg-danger text-surface-0 hover:brightness-110 ' +
    'disabled:bg-surface-2 disabled:text-ink-3',
}

export function Button({
  variant = 'ghost',
  className,
  type,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(BASE, VARIANTS[variant], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
