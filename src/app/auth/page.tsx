import { AuthForm } from "./auth-form";
import { signInAction, signUpAction } from "./actions";

export default function AuthPage() {
  return <AuthForm signInAction={signInAction} signUpAction={signUpAction} />;
}
