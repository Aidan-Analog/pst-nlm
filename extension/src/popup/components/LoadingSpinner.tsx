export function LoadingSpinner({ message = 'Searching for better prices…' }: { message?: string }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <div>{message}</div>
    </div>
  );
}
