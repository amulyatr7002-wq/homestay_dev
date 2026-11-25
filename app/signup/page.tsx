import AuthForm from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return <AuthForm mode="signup" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}
