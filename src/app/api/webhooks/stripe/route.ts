import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil', // Latest API version
});

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify the event using the signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get the supabase_user_id from the session metadata
      const supabaseUserId = session.metadata?.supabase_user_id;
      
      if (!supabaseUserId) {
        console.error('No supabase_user_id found in session metadata');
        return NextResponse.json(
          { error: 'No supabase_user_id found in session metadata' },
          { status: 400 }
        );
      }

      // Initialize Supabase client
      const supabase = createClient();

      // Update the user's plan in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ plan: 'premium' })
        .eq('id', supabaseUserId);

      if (updateError) {
        console.error('Error updating user plan:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user plan' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Return a 200 response for other event types
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 