import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync user profile to database upon OAuth callback
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const meta = user.user_metadata || {};
          const fullName = meta.full_name || meta.name || "";
          const firstName =
            meta.first_name || (fullName ? fullName.split(" ")[0] : "");
          const lastName =
            meta.last_name ||
            (fullName ? fullName.split(" ").slice(1).join(" ") : "");
          const avatarUrl = meta.avatar_url || meta.picture || null;

          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName || `${firstName} ${lastName}`.trim(),
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (dbErr) {
        console.warn("OAuth profile sync notice:", dbErr);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page or back to get-started with error query param
  return NextResponse.redirect(`${origin}/get-started?error=auth_callback_failed`);
}

