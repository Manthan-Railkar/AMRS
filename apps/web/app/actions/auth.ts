"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

/**
 * Handles account creation on the server.
 * Uses the Supabase admin client to create a confirmed user without browser API key leaks or email verification delays,
 * synchronizes user data to the public.profiles database table, and signs the user in via session cookies.
 */
export async function signUpAction(formData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = formData.email?.trim().toLowerCase();
  const password = formData.password;
  const firstName = formData.firstName?.trim() || "";
  const lastName = formData.lastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0];

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  try {
    const admin = createAdminClient();
    const serverSupabase = await createClient();

    // Check if user already exists
    const { data: listData } = await admin.auth.admin.listUsers();
    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    let userId = existingUser?.id;

    if (existingUser) {
      // Existing user: update password and confirm email so they can log in immediately
      const { error: updateErr } = await admin.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName || existingUser.user_metadata?.first_name || "",
            last_name: lastName || existingUser.user_metadata?.last_name || "",
            full_name: fullName,
          },
        }
      );
      if (updateErr) {
        return { success: false, error: updateErr.message };
      }
    } else {
      // Create new confirmed user via admin API
      const { data: createData, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
          },
        });

      if (createErr) {
        return { success: false, error: createErr.message };
      }
      if (!createData.user) {
        return { success: false, error: "Failed to create user account." };
      }
      userId = createData.user.id;
    }

    // Explicitly synchronize profile to database public.profiles table
    if (userId) {
      const { error: profileErr } = await admin.from("profiles").upsert(
        {
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (profileErr) {
        console.warn("Notice syncing public.profiles:", profileErr);
      }
    }

    // Sign user in with password to establish session cookies in Next.js
    const { error: signInErr } = await serverSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      console.warn("Post-signup sign in notice:", signInErr);
    }

    return {
      success: true,
      user: {
        id: userId || "",
        email,
        firstName,
        lastName,
        fullName,
        avatarUrl: null,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred during signup.";
    return { success: false, error: msg };
  }
}

/**
 * Handles account authentication on the server.
 * Automatically confirms pending emails if needed and stores the session in HTTP cookies.
 */
export async function signInAction(formData: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = formData.email?.trim().toLowerCase();
  const password = formData.password;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  try {
    const admin = createAdminClient();
    const serverSupabase = await createClient();

    let { data: signInData, error: signInErr } =
      await serverSupabase.auth.signInWithPassword({
        email,
        password,
      });

    // Auto-confirm if user has pending email confirmation
    if (signInErr && signInErr.message?.toLowerCase().includes("email not confirmed")) {
      const { data: listData } = await admin.auth.admin.listUsers();
      const user = listData?.users?.find((u) => u.email?.toLowerCase() === email);
      if (user) {
        await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
        const retry = await serverSupabase.auth.signInWithPassword({
          email,
          password,
        });
        signInData = retry.data;
        signInErr = retry.error;
      }
    }

    if (signInErr) {
      return { success: false, error: signInErr.message };
    }

    const user = signInData.user;
    const meta = user?.user_metadata || {};
    const fullName = meta.full_name || user?.email?.split("@")[0] || "User";
    const firstName = meta.first_name || fullName.split(" ")[0] || "";
    const lastName = meta.last_name || fullName.split(" ").slice(1).join(" ") || "";

    // Sync profile in public.profiles table
    if (user?.id) {
      await admin.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    return {
      success: true,
      user: {
        id: user?.id || "",
        email: user?.email || email,
        firstName,
        lastName,
        fullName,
        avatarUrl: meta.avatar_url || null,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected error occurred during login.";
    return { success: false, error: msg };
  }
}

/**
 * Signs the user out on the server and clears session cookies.
 */
export async function signOutAction(): Promise<{ success: boolean }> {
  try {
    const serverSupabase = await createClient();
    await serverSupabase.auth.signOut();
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Retrieves the currently logged-in user profile from session cookies and the database.
 */
export async function getCurrentUserAction(): Promise<UserProfile | null> {
  try {
    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return null;
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const meta = user.user_metadata || {};
    const firstName = profile?.first_name || meta.first_name || "";
    const lastName = profile?.last_name || meta.last_name || "";
    const fullName =
      profile?.full_name ||
      meta.full_name ||
      `${firstName} ${lastName}`.trim() ||
      user.email?.split("@")[0] ||
      "User";

    return {
      id: user.id,
      email: user.email || "",
      firstName,
      lastName,
      fullName,
      avatarUrl: profile?.avatar_url || meta.avatar_url || null,
    };
  } catch (err) {
    console.warn("getCurrentUserAction notice:", err);
    return null;
  }
}

/**
 * Generates Google OAuth redirect URL using server-side client.
 */
export async function getGoogleOAuthUrlAction(
  redirectTo?: string
): Promise<{ url?: string; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          redirectTo ||
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { url: data.url };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to generate Google login URL.",
    };
  }
}

