import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  containerClassName,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={twMerge('space-y-1 w-full text-left', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-kms-slate-700">
          {label} {props.required && <span className="text-red-600">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={twMerge(
          clsx(
            'w-full px-3 py-1.5 text-xs bg-white border border-kms-slate-300 rounded text-kms-slate-900 placeholder:text-kms-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors disabled:bg-kms-slate-100 disabled:text-kms-slate-500',
            error && 'border-red-600 focus:ring-red-600',
            className
          )
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-kms-slate-500">{helperText}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className,
  containerClassName,
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={twMerge('space-y-1 w-full text-left', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-kms-slate-700">
          {label} {props.required && <span className="text-red-600">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={twMerge(
          clsx(
            'w-full px-3 py-1.5 text-xs bg-white border border-kms-slate-300 rounded text-kms-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors disabled:bg-kms-slate-100',
            error && 'border-red-600 focus:ring-red-600',
            className
          )
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
};
