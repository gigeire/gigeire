export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
// Import types for Stripe and Supabase client
import type StripeType from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
// Stripe and Supabase clients will be initialized inside the POST handler.

// updateUserPlan now accepts a Supabase client instance.
async function updateUserPlan(
  supabaseClient: SupabaseClient, // Changed from supabaseAdmin to a generic SupabaseClient type
  supabaseUserId: string,
  plan: string,
  maxRetries = 3
) {
  console.log(
    `[updateUserPlan] Called with supabaseUserId=${supabaseUserId}, plan=${plan}`
  );
  // const supabase = supabaseAdmin; // supabaseAdmin is no longer a global/module-level variable
  let attempt = 0;
  let lastError = null;
  while (attempt < maxRetries) {
    const { error } = await supabaseClient // Use the passed client
      .from("users")
      .update({ plan })
      .eq("id", supabaseUserId);
    if (!error) {
      console.log(
        `[updateUserPlan] Success: Updated user ${supabaseUserId} to plan '${plan}' on attempt ${
          attempt + 1
        }`
      );
      return true;
    }
    lastError = error;
    attempt++;
    console.error(
      `[updateUserPlan] Attempt ${attempt} failed to update user ${supabaseUserId} to plan '${plan}':`,
      error
    );
    await new Promise((res) => setTimeout(res, 500 * attempt)); // Exponential backoff
  }
  console.error(
    `[updateUserPlan] Failed to update user ${supabaseUserId} to plan '${plan}' after ${maxRetries} attempts. Last error:`,
    lastError
  );
  return lastError;
}

export async function POST(req: Request) {
  // Environment variable checks at the beginning of the handler
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey) {
    console.error("Missing Stripe secret key environment variable (STRIPE_SECRET_KEY)");
    return NextResponse.json({ error: "Server configuration error: Stripe secret key missing" }, { status: 500 });
  }
  if (!webhookSecret) {
    console.error("Missing Stripe webhook secret environment variable (STRIPE_WEBHOOK_SECRET)");
    return NextResponse.json({ error: "Server configuration error: Stripe webhook secret missing" }, { status: 500 });
  }
  if (!supabaseUrl) {
    console.error("Missing Supabase URL environment variable (NEXT_PUBLIC_SUPABASE_URL)");
    return NextResponse.json({ error: "Server configuration error: Supabase URL missing" }, { status: 500 });
  }
  if (!supabaseServiceRoleKey) {
    console.error("Missing Supabase service role key environment variable (SUPABASE_SERVICE_ROLE_KEY)");
    return NextResponse.json({ error: "Server configuration error: Supabase service role key missing" }, { status: 500 });
  }

  try {
    // Dynamically import and initialize Stripe
    const { default: Stripe } = await import("stripe");
    const stripe: StripeType = new Stripe(stripeSecretKey, {
      apiVersion: "2025-05-28.basil", // Use your actual API version
    });

    // Dynamically import and initialize Supabase Admin Client
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const supabaseAdmin: SupabaseClient = createSupabaseClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: StripeType.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret // Use the guarded variable
      );
    } catch (err: any) { // Catch as any for broader error handling
      console.error("Stripe webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature", details: err.message }, { status: 400 });
    }

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as StripeType.Checkout.Session;
        const supabaseUserId = session.client_reference_id;

        console.log(
          `[Webhook] checkout.session.completed: Received for client_reference_id: ${supabaseUserId}`
        );

        if (!supabaseUserId) {
          console.error(
            "[Webhook] checkout.session.completed: No client_reference_id found in session."
          );
          return NextResponse.json(
            { error: "No client_reference_id found in session" },
            { status: 400 }
          );
        }

        if (!session.subscription) {
          console.warn(
            "[Webhook] checkout.session.completed: No subscription ID (session.subscription) found on the session object. Session ID:",
            session.id
          );
        } else {
          console.log(
            `[Webhook] checkout.session.completed: Subscription ID found: ${session.subscription}. Attempting to update metadata.`
          );
          try {
            await stripe.subscriptions.update(
              session.subscription.toString(),
              {
                metadata: {
                  user_id: supabaseUserId,
                },
              }
            );
            console.log(
              `[Webhook] checkout.session.completed: Successfully updated metadata for subscription ${session.subscription} with user_id: ${supabaseUserId}`
            );
          } catch (metadataError: any) {
            console.error(
              `[Webhook] checkout.session.completed: Failed to update metadata for subscription ${session.subscription}:`,
              metadataError.message
            );
            return NextResponse.json(
              {
                error: "Failed to update subscription metadata.",
                details: metadataError.message,
              },
              { status: 500 }
            );
          }
        }

        console.log(
          `[Webhook] checkout.session.completed: Attempting to update user plan in Supabase for user_id: ${supabaseUserId} to premium.`
        );
        // Pass the initialized supabaseAdmin client to updateUserPlan
        const updateResult = await updateUserPlan(
          supabaseAdmin,
          supabaseUserId,
          "premium"
        );
        if (updateResult !== true) {
          console.error(
            "[Webhook] checkout.session.completed: Error updating user plan in Supabase after checkout:",
            updateResult
          );
          const errorMessage =
            updateResult instanceof Error
              ? updateResult.message
              : "Failed to update user plan in Supabase.";
          return NextResponse.json(
            {
              error: "Failed to update user plan in Supabase.",
              details: errorMessage,
            },
            { status: 500 }
          );
        }
        console.log(
          `[Webhook] checkout.session.completed: Successfully processed for user_id: ${supabaseUserId}. User plan updated.`
        );
        return NextResponse.json({ success: true });
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as StripeType.Subscription;
        const supabaseUserId =
          subscription.metadata?.user_id ||
          subscription.metadata?.supabase_user_id;
        if (!supabaseUserId) {
          console.error("No user_id in subscription metadata");
          return NextResponse.json(
            { error: "No user_id in subscription metadata" },
            { status: 400 }
          );
        }
        const plan = subscription.status === "active" ? "premium" : "free";
        // Pass the initialized supabaseAdmin client
        const updateResult = await updateUserPlan(
          supabaseAdmin,
          supabaseUserId,
          plan
        );
        if (updateResult !== true) {
          console.error(
            "Error updating user plan on subscription update:",
            updateResult
          );
          const errorMessage =
            updateResult instanceof Error
              ? updateResult.message
              : "Failed to update user plan.";
          return NextResponse.json(
            { error: "Failed to update user plan", details: errorMessage },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true });
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as StripeType.Subscription;
        const supabaseUserId =
          subscription.metadata?.user_id ||
          subscription.metadata?.supabase_user_id;
        if (!supabaseUserId) {
          console.error("No user_id in subscription metadata");
          return NextResponse.json(
            { error: "No user_id in subscription metadata" },
            { status: 400 }
          );
        }
        // Pass the initialized supabaseAdmin client
        const updateResult = await updateUserPlan(
          supabaseAdmin,
          supabaseUserId,
          "free"
        );
        if (updateResult !== true) {
          console.error(
            "Error downgrading user plan on subscription deletion:",
            updateResult
          );
           const errorMessage =
            updateResult instanceof Error
              ? updateResult.message
              : "Failed to downgrade user plan.";
          return NextResponse.json(
            { error: "Failed to downgrade user plan", details: errorMessage },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true });
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as StripeType.Invoice;
        const supabaseUserId =
          invoice.metadata?.user_id || invoice.metadata?.supabase_user_id;
        if (supabaseUserId) {
          console.warn(`Payment failed for user ${supabaseUserId}`);
          // Optionally: use supabaseAdmin to update user status or log more details
          // Example: await supabaseAdmin.from('user_issues').insert([{ user_id: supabaseUserId, issue: 'payment_failed', invoice_id: invoice.id }]);
        } else {
          console.warn(
            "Payment failed but no user_id in invoice metadata. Invoice ID:", invoice.id
          );
        }
        return NextResponse.json({ received: true });
      }
      default: {
        console.log(`Unhandled Stripe event type: ${event.type}`);
        return NextResponse.json({ received: true });
      }
    }
  } catch (err: any) {
    console.error("Webhook error:", err.message, err.stack); // Log stack for better debugging
    return NextResponse.json(
      { error: "Webhook handler failed", details: err.message },
      { status: 400 } // Changed to 400 as it's often client-side (e.g. bad payload) or config error
    );
  }
}