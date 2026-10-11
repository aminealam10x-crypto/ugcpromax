import { AuthScreen } from "@/components/auth-screen";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };
export default function SignInPage() { return <AuthScreen mode="sign-in" />; }
