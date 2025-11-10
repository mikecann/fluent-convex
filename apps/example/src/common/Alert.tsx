interface AlertProps {
  children: React.ReactNode;
  className?: string;
}

export const Alert = ({ children, className = "" }: AlertProps) => {
  const baseStyles = "mt-2 p-2 rounded text-sm";

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
};

interface AlertMessageProps {
  children: React.ReactNode;
  className?: string;
}

const AlertMessage = ({ children, className = "" }: AlertMessageProps) => {
  return <p className={`font-semibold ${className}`}>{children}</p>;
};

interface SuccessAlertProps {
  children: React.ReactNode;
}

export const SuccessAlert = ({ children }: SuccessAlertProps) => {
  return (
    <Alert className="bg-green-50 dark:bg-green-900/20">
      <AlertMessage className="text-green-800 dark:text-green-300">
        ✓ {children}
      </AlertMessage>
    </Alert>
  );
};

interface ErrorAlertProps {
  children: React.ReactNode;
}

export const ErrorAlert = ({ children }: ErrorAlertProps) => {
  return (
    <Alert className="bg-red-50 dark:bg-red-900/20">
      <AlertMessage className="text-red-800 dark:text-red-300">
        ✗ Error (expected): {children}
      </AlertMessage>
    </Alert>
  );
};

