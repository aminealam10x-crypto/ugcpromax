import { AuthScreen } from "@/components/auth-screen";
export const dynamic = "force-dynamic";
export const metadata = { title: "Create account" };
export default function SignUpPage() { return <AuthScreen mode="sign-up" />; }
