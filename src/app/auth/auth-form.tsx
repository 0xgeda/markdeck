"use client";

export function AuthForm({
  signInAction,
  signUpAction,
}: {
  signInAction: (formData: FormData) => void;
  signUpAction: (formData: FormData) => void;
}) {
  return (
    <form>
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
