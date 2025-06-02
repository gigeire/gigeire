import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export async function POST(req: Request) {
  try {
    // Get Supabase session from cookies
    const supabase = createClient();
    const cookieStore = cookies();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
    const userId = user.id;

    // Create Stripe Checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID!,
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
  } catch (error) {
    console.error("Error creating Stripe Checkout session:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
} 