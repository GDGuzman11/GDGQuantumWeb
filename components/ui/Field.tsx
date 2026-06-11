import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

/**
 * Labelled form field primitive. Every control is associated with a visible
 * <label> via htmlFor/id. React-Hook-Form-ready (Phase 4): forwards its ref and
 * spreads through native props, so `<Field {...register('name')} />` wires the
 * name/onChange/onBlur/ref automatically. An `error` renders inline with
 * `aria-invalid` + `aria-describedby` for accessible validation.
 */

type CommonProps = {
  id: string;
  label: string;
  /** Inline validation error; when set, the control is marked invalid. */
  error?: string;
  /** Optional helper text shown when there's no error. */
  hint?: ReactNode;
};

type InputProps = CommonProps & {
  as?: 'input';
} & InputHTMLAttributes<HTMLInputElement>;

type TextareaProps = CommonProps & {
  as: 'textarea';
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export type FieldProps = InputProps | TextareaProps;

const controlClasses = [
  'w-full rounded-none border-0 border-b bg-transparent px-0 py-3',
  'font-sans text-base text-ink placeholder:text-muted/70',
  'transition-colors duration-300 ease-out',
  'focus:outline-none',
].join(' ');

export const Field = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FieldProps
>(function Field(props, ref) {
  const { id, label, error, hint, as, className, ...rest } = props as CommonProps & {
    as?: 'input' | 'textarea';
    className?: string;
  } & Record<string, unknown>;

  const describedBy = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined;

  const borderClass = error
    ? 'border-red-400 focus:border-red-400'
    : 'border-hairline focus:border-accent';

  const control = [controlClasses, borderClass, className ?? ''].join(' ');

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-sans text-xs uppercase tracking-[0.16em] text-muted"
      >
        {label}
      </label>

      {as === 'textarea' ? (
        <textarea
          id={id}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} resize-none`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          ref={ref as React.Ref<HTMLInputElement>}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={control}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error ? (
        <p id={`${id}-error`} role="alert" className="font-sans text-xs text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="font-sans text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
