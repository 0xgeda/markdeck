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
    <form>
      {error && <p role="alert">{ERROR_MESSAGES[error] ?? "An error occurred."}</p>}
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required minLength={8} />
      </label>
      <button formAction={signInAction}>Sign in</button>
      <button formAction={signUpAction}>Sign up</button>
    </form>
  );
}
