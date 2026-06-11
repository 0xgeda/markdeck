import { AuthForm } from "./auth-form";
import { signInAction, signUpAction } from "./actions";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthForm signInAction={signInAction} signUpAction={signUpAction} error={error} />;
}
