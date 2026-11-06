import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Get Started — AMRS",
  description: "Create an account or sign in to AMRS (Adaptive Model Recovery System).",
};

export default function GetStartedPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#625e74] px-4 py-8 sm:px-6 lg:px-10">
      <AuthCard initialMode="signup" />
    </main>
  );
}

