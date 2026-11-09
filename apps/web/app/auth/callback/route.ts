import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam =
    searchParams.get("error_description") || searchParams.get("error");

  // Handle incoming provider error (e.g. user cancelled or permission denied)
  if (errorParam) {
    console.error("OAuth error received from provider:", errorParam);
    return NextResponse.redirect(
      `${origin}/get-started?error=${encodeURIComponent(errorParam)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth exchangeCodeForSession error:", error);
      return NextResponse.redirect(
        `${origin}/get-started?error=${encodeURIComponent(
          error.message || "auth_callback_failed"
        )}`
      );
    }

    const user =
      data?.session?.user ?? (await supabase.auth.getUser()).data?.user;

    if (user) {
      // Sync user profile to database upon OAuth callback
      try {
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || "";
        const firstName =
          meta.first_name || (fullName ? fullName.split(" ")[0] : "");
        const lastName =
          meta.last_name ||
          (fullName ? fullName.split(" ").slice(1).join(" ") : "");
        const avatarUrl = meta.avatar_url || meta.picture || null;

        const admin = createAdminClient();
        await admin.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            full_name:
              fullName ||
              `${firstName} ${lastName}`.trim() ||
              user.email?.split("@")[0] ||
              "User",
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (dbErr) {
        console.warn("OAuth profile sync notice:", dbErr);
      }
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    const redirectUrl = isLocalEnv
      ? `${origin}${next}`
      : forwardedHost
      ? `https://${forwardedHost}${next}`
      : `${origin}${next}`;

    const response = NextResponse.redirect(redirectUrl);

    // Explicitly mirror session cookies to response to guarantee persistence across redirects
    const cookieStore = await cookies();
    cookieStore.getAll().forEach((c) => {
      response.cookies.set(c.name, c.value);
    });

    // Set AMRS user identification cookies for profile isolation
    if (user?.id) {
      response.cookies.set("amrs_user_id", user.id, {
        path: "/",
        maxAge: 2592000,
        sameSite: "lax",
      });
      if (user.email) {
        response.cookies.set("amrs_user_email", user.email, {
          path: "/",
          maxAge: 2592000,
          sameSite: "lax",
        });
      }
    }

    return response;
  }

  // Return the user to get-started with error query param if no code was received
  return NextResponse.redirect(`${origin}/get-started?error=auth_callback_failed`);
}

