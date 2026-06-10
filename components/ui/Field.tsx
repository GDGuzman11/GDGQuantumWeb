import type { ReactNode } from 'react';

type BaseProps = {
  id: string;
  label: string;
  /** Optional helper/error slot rendered below the control (Phase 4 wires real errors). */
  hint?: ReactNode;
};

type InputFieldProps = BaseProps & {
  as?: 'input';
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  name: string;
};

type TextareaFieldProps = BaseProps & {
  as: 'textarea';
  rows?: number;
  placeholder?: string;
  required?: boolean;
  name: string;
};

type FieldProps = InputFieldProps | TextareaFieldProps;

const controlClasses = [
  'w-full rounded-none border-0 border-b border-hairline bg-transparent px-0 py-3',
  'font-sans text-base text-ink placeholder:text-muted/70',
  'transition-colors duration-300 ease-out',
  'focus:border-accent focus:outline-none',
].join(' ');

/**
 * Labelled form field primitive. Every control is associated with a visible
 * <label> via htmlFor/id. Phase 1 is visual-only — the real validated form
 * (React Hook Form + shared Zod) arrives in Phase 4.
 */
export function Field(props: FieldProps) {
  const { id, label, hint } = props;
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-sans text-xs uppercase tracking-[0.16em] text-muted"
      >
        {label}
      </label>
      {props.as === 'textarea' ? (
        <textarea
          id={id}
          name={props.name}
          rows={props.rows ?? 4}
          required={props.required}
          placeholder={props.placeholder}
          className={`${controlClasses} resize-none`}
        />
      ) : (
        <input
          id={id}
          name={props.name}
          type={props.type ?? 'text'}
          autoComplete={props.autoComplete}
          required={props.required}
          placeholder={props.placeholder}
          className={controlClasses}
        />
      )}
      {hint ? <p className="font-sans text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
