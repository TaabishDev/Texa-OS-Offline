import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const GUEST_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "guest@example.com",
  user_metadata: { full_name: "Guest" }
};

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser().catch(() => ({ data: null, error: new Error("Offline") }));
      if (!error && data?.user) {
        return { user: data.user };
      }

      // Try anonymous sign-in
      const { data: anonData } = await supabase.auth.signInAnonymously().catch(() => ({ data: null, error: new Error("Offline") }));
      if (anonData?.user) {
        return { user: anonData.user };
      }

      // Try guest sign-in
      const { data: guestData } = await supabase.auth.signInWithPassword({
        email: "guest@example.com",
        password: "guestpassword123",
      }).catch(() => ({ data: null, error: new Error("Offline") }));

      if (guestData?.user) {
        return { user: guestData.user };
      }

      // Try guest sign-up
      const { data: signUpData } = await supabase.auth.signUp({
        email: "guest@example.com",
        password: "guestpassword123",
      }).catch(() => ({ data: null, error: new Error("Offline") }));

      if (signUpData?.user) {
        return { user: signUpData.user };
      }
    } catch (e) {
      console.warn("Supabase auth unavailable. Proceeding with local guest session.");
    }

    return { user: GUEST_USER as any };
  },
  component: () => <Outlet />,
});

