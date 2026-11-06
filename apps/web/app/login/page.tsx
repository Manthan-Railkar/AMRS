import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Log In — AMRS",
  description: "Sign in to your AMRS account.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#625e74] px-4 py-8 sm:px-6 lg:px-10">
      <AuthCard initialMode="login" />
    </main>
  );
}

