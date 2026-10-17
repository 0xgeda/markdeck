"use client";

const ERROR_MESSAGES: Record<string, string> = {
  signin: "Invalid email or password.",
  signup: "Could not create account. The email may already be registered.",
};

export function AuthForm({
  signInAction,
  signUpAction,
  error,
}: {
  signInAction: (formData: FormData) => void;
  signUpAction: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl shadow-black/40">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-white">Markdeck</h1>
          <p className="text-sm text-zinc-400 mt-2">Sign in to your account</p>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-4 py-3" role="alert">
            {ERROR_MESSAGES[error] ?? "An error occurred."}
          </div>
        )}
        <form className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="auth-email" className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Email</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="auth-password" className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50"
            />
          </div>
          <div className="space-y-2 pt-2">
            <button
              formAction={signInAction}
              className="w-full bg-gold text-zinc-950 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gold/90 transition"
            >
              Sign in
            </button>
            <button
              formAction={signUpAction}
              className="w-full border border-zinc-700 text-zinc-300 rounded-lg px-4 py-2 text-sm font-medium hover:border-zinc-500 hover:text-white transition"
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
