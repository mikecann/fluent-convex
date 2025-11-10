interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = "" }: CardProps) => {
  const baseStyles =
    "flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg min-w-[400px] max-w-[500px]";

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent = ({ children, className = "" }: CardContentProps) => {
  const baseStyles = "p-4 bg-white dark:bg-slate-800 rounded-md";

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle = ({ children, className = "" }: CardTitleProps) => {
  return <h2 className={`text-2xl font-bold ${className}`}>{children}</h2>;
};

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription = ({
  children,
  className = "",
}: CardDescriptionProps) => {
  return (
    <p className={`text-sm text-slate-600 dark:text-slate-400 ${className}`}>
      {children}
    </p>
  );
};
