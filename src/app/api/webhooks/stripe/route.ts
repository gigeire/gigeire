export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Create Supabase client with service role key for admin access
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateUserPlan(supabaseUserId: string, plan: string, maxRetries = 3) {
  console.log(`[updateUserPlan] Called with supabaseUserId=${supabaseUserId}, plan=${plan}`);
  const supabase = supabaseAdmin;
  let attempt = 0;
  let lastError = null;
  while (attempt < maxRetries) {
    const { error } = await supabase
      .from("users")
      .update({ plan })
      .eq("id", supabaseUserId);
    if (!error) {
      console.log(`[updateUserPlan] Success: Updated user ${supabaseUserId} to plan '${plan}' on attempt ${attempt + 1}`);
      return true;
    }
    lastError = error;
    attempt++;
    console.error(`[updateUserPlan] Attempt ${attempt} failed to update user ${supabaseUserId} to plan '${plan}':`, error);
    await new Promise((res) => setTimeout(res, 500 * attempt)); // Exponential backoff
  }
  console.error(`[updateUserPlan] Failed to update user ${supabaseUserId} to plan '${plan}' after ${maxRetries} attempts. Last error:`, lastError);
  return lastError;
}

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing Stripe environment variables");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const supabaseUserId = session.client_reference_id;
        if (!supabaseUserId) {
          return NextResponse.json(
            { error: "No client_reference_id found in session" },
            { status: 400 }
          );
        }
        const updateResult = await updateUserPlan(supabaseUserId, "premium");
        if (updateResult !== true) {
          console.error("Error updating user plan after checkout:", updateResult);
          return NextResponse.json(
            { error: "Failed to update user plan" },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true });
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const supabaseUserId = subscription.metadata?.user_id || subscription.metadata?.supabase_user_id;
        if (!supabaseUserId) {
          console.error("No user_id in subscription metadata");
          return NextResponse.json({ error: "No user_id in subscription metadata" }, { status: 400 });
        }
        const plan = subscription.status === "active" ? "premium" : "free";
        const updateResult = await updateUserPlan(supabaseUserId, plan);
        if (updateResult !== true) {
          console.error("Error updating user plan on subscription update:", updateResult);
          return NextResponse.json({ error: "Failed to update user plan" }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const supabaseUserId = subscription.metadata?.user_id || subscription.metadata?.supabase_user_id;
        if (!supabaseUserId) {
          console.error("No user_id in subscription metadata");
          return NextResponse.json({ error: "No user_id in subscription metadata" }, { status: 400 });
        }
        const updateResult = await updateUserPlan(supabaseUserId, "free");
        if (updateResult !== true) {
          console.error("Error downgrading user plan on subscription deletion:", updateResult);
          return NextResponse.json({ error: "Failed to downgrade user plan" }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const supabaseUserId = invoice.metadata?.user_id || invoice.metadata?.supabase_user_id;
        if (supabaseUserId) {
          // Optionally, downgrade or flag the user, or notify them
          console.warn(`Payment failed for user ${supabaseUserId}`);
        } else {
          console.warn("Payment failed but no user_id in invoice metadata");
        }
        return NextResponse.json({ received: true });
      }
      default: {
        console.log(`Unhandled Stripe event type: ${event.type}`);
        return NextResponse.json({ received: true });
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
}