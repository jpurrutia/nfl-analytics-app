'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Global Error</h2>
              <p className="text-gray-600 mb-6">
                A critical error occurred. Please refresh the page.
              </p>
              <button
                onClick={reset}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}