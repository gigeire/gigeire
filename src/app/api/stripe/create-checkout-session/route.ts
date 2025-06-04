import { NextResponse } from "next/server";
// Stripe import will be done dynamically inside the handler
// import Stripe from "stripe"; 
import { createClient } from "@/utils/supabase/server"; // Assuming this utility is safe or will be made safe
import { cookies } from "next/headers";
import type StripeType from "stripe"; // For type annotations

// Remove top-level Stripe client initialization
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2025-05-28.basil",
// });

export async function POST(req: Request) {
  try {
    // Environment variable checks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePremiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!supabaseUrl) {
      console.error("Missing Supabase URL environment variable (NEXT_PUBLIC_SUPABASE_URL)");
      return NextResponse.json({ error: "Server configuration error: Supabase URL missing" }, { status: 500 });
    }
    if (!supabaseAnonKey) {
      console.error("Missing Supabase Anon Key environment variable (NEXT_PUBLIC_SUPABASE_ANON_KEY)");
      return NextResponse.json({ error: "Server configuration error: Supabase Anon Key missing" }, { status: 500 });
    }
    if (!stripeSecretKey) {
      console.error("Missing Stripe secret key environment variable (STRIPE_SECRET_KEY)");
      return NextResponse.json({ error: "Server configuration error: Stripe secret key missing" }, { status: 500 });
    }
    if (!stripePremiumPriceId) {
      console.error("Missing Stripe Premium Price ID environment variable (STRIPE_PREMIUM_PRICE_ID)");
      return NextResponse.json({ error: "Server configuration error: Stripe Price ID missing" }, { status: 500 });
    }

    // Initialize Stripe client dynamically
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-05-28.basil", // Use your actual API version
    });

    // Initialize Supabase client
    // createClient from @/utils/supabase/server uses cookies and relies on NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
    // being set in the environment. The checks above ensure these are present.
    const supabase = createClient();
    const cookieStore = cookies(); // Get cookies for Supabase auth

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      console.error("User not authenticated:", userError?.message);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = user.id;

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const sessionParams: StripeType.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: stripePremiumPriceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/thank-you`,
      cancel_url: `${origin}/settings`,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
      },
    };
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Error creating Stripe Checkout session:", error.message, error.stack); // Added error.stack for more details
    return NextResponse.json({ error: "Failed to create checkout session", details: error.message }, { status: 500 });
  }
} 