import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

export default function FormField({ label, name, register, error, type = 'text', hint, className, ...props }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="mb-5">
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium"
      >
        {label}
      </label>
      <div className="relative">
        <Input
          id={name}
          type={isPassword && visible ? 'text' : type}
          {...register(name)}
          {...props}
          className={cn('h-12 rounded-lg bg-card px-3.5 text-sm', isPassword && 'pr-12', className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1.5 size-9 text-muted-foreground"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        )}
      </div>
      {error ? (
        <p
          className="mt-1.5 text-xs leading-relaxed text-destructive"
          id={`${name}-error`}
        >
          {error.message}
        </p>
      ) : hint && (
        <p
          className="mt-1.5 text-xs leading-relaxed text-muted-foreground"
          id={`${name}-hint`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
