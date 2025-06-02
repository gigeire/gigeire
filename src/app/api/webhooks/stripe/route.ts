export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const supabaseUserId = session.client_reference_id;

      if (!supabaseUserId) {
        return NextResponse.json(
          { error: "No client_reference_id found in session" },
          { status: 400 }
        );
      }

      // Update the user's plan in Supabase
      const supabase = createClient({ auth: { persistSession: false } });
      const { error: updateError } = await supabase
        .from("users")
        .update({ subscription_plan: "premium" })
        .eq("id", supabaseUserId);

      if (updateError) {
        console.error("Error updating user plan:", updateError);
        return NextResponse.json(
          { error: "Failed to update user plan" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Return a 200 response for other event types
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
} 