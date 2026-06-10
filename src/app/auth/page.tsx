import { AuthForm } from "./auth-form";
import { signInAction, signUpAction } from "./actions";

export default function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> | { error?: string } }) {
  const error = searchParams instanceof Promise ? undefined : searchParams.error;
  return <AuthForm signInAction={signInAction} signUpAction={signUpAction} error={error} />;
}
