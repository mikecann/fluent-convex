type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary:
    "bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
  success: "bg-green-600 hover:bg-green-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-orange-600 hover:bg-orange-700 text-white",
  info: "bg-indigo-600 hover:bg-indigo-700 text-white",
};

export const Button = ({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = "text-sm px-4 py-2 rounded-md transition-colors";
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";
  const variantStyle = variantStyles[variant];

  return (
    <button
      className={`${baseStyles} ${variantStyle} ${disabledStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
