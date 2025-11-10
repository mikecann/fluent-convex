interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = ({ className = "", ...props }: InputProps) => {
  const baseStyles =
    "px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700";

  return <input className={`${baseStyles} ${className}`} {...props} />;
};
