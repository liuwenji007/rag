interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      style={{
        padding: '20px',
        textAlign: 'center',
        color: '#e74c3c',
      }}
    >
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          重试
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;

