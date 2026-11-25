"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
const signupSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(80),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(72).refine((password) => new TextEncoder().encode(password).length <= 72, "Use at most 72 UTF-8 bytes."),
});

type Props = { mode: "login" | "signup"; googleEnabled: boolean };
type Values = { name?: string; email: string; password: string };

export default function AuthForm({ mode, googleEnabled }: Props) {
  const isSignup = mode === "signup";
  const schema = isSignup ? signupSchema : loginSchema;
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  function getCallbackUrl() {
    const candidate = new URLSearchParams(window.location.search).get("callbackUrl");
    return candidate?.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith("/\\")
      ? candidate
      : "/bookings";
  }

  async function onSubmit(values: Values) {
    setServerError("");
    setSubmitting(true);
    try {
      if (isSignup) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const result: { error?: string } = await response.json();
        if (!response.ok) {
          setServerError(result.error || "We couldn’t create your account. Please try again.");
          return;
        }
      }

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: getCallbackUrl(),
      });
      if (!result?.ok || result.error) {
        setServerError(isSignup ? "Your account was created, but we couldn’t sign you in. Please log in." : "That email and password don’t match. Try again or reset your password.");
        return;
      }
      toast.success(isSignup ? "Welcome to Namma Stay." : "Welcome back.");
      router.push(result.url || getCallbackUrl());
      router.refresh();
    } catch (error) {
      console.error("Authentication request failed:", error);
      setServerError("We couldn’t reach the sign-in service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-backdrop" />
      <header className="auth-header">
        <Link className="explore-brand" href="/"><span>n</span> namma<em>stay</em></Link>
        <Link className="auth-back-link" href="/"><ArrowLeft size={14} /> Back to exploring</Link>
      </header>
      <section className="auth-card">
        <p className="auth-eyebrow"><span /> A little closer to local</p>
        <h1>{isSignup ? "Come on in." : "Welcome back."}</h1>
        <p className="auth-intro">{isSignup ? "Make yourself at home. Your next somewhere is waiting." : "Your next somewhere—and all your saved stays—are waiting."}</p>

        {googleEnabled && (
          <>
            <button type="button" className="google-signin" onClick={() => void signIn("google", { callbackUrl: getCallbackUrl() })}>
              <span className="google-g">G</span> Continue with Google
            </button>
            <div className="auth-or"><span /> or with email <span /></div>
          </>
        )}

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {isSignup && (
            <label className="auth-input-wrap">
              <span>Your name</span><div><UserRound size={16} /><input autoComplete="name" placeholder="How should we call you?" {...register("name")} /></div>
              {errors.name && <small>{errors.name.message}</small>}
            </label>
          )}
          <label className="auth-input-wrap">
            <span>Email address</span><div><Mail size={16} /><input autoComplete="email" type="email" placeholder="you@example.com" {...register("email")} /></div>
            {errors.email && <small>{errors.email.message}</small>}
          </label>
          <label className="auth-input-wrap">
            <span>Password</span><div><LockKeyhole size={16} /><input autoComplete={isSignup ? "new-password" : "current-password"} type={passwordVisible ? "text" : "password"} placeholder={isSignup ? "At least 8 characters" : "Your password"} {...register("password")} /><button type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
            {errors.password && <small>{errors.password.message}</small>}
          </label>
          {serverError && <p className="auth-error" role="alert">{serverError}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "One moment…" : isSignup ? "Create your account" : "Sign in"}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="auth-switch">{isSignup ? "Already found us? " : "New to Namma Stay? "}<Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p>
        <p className="auth-otp-note">Sign in is available with email and password.</p>
      </section>
      <footer className="auth-footer">Made with care, in Karnataka <span>ನಮ್ಮ ಮನೆ</span></footer>
    </main>
  );
}
