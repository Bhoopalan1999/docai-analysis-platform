import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  mapStripeStatusToSubscriptionStatus,
  mapStripePriceToTier,
  getStripeSubscription,
} from '@/lib/subscription/stripe';
import { updateUserSubscription } from '@/lib/subscription/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import Stripe from 'stripe';

/**
 * POST /api/subscriptions/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = verifyWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await getStripeSubscription(invoice.subscription as string);
          if (subscription) {
            await handleSubscriptionUpdate(subscription);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await getStripeSubscription(invoice.subscription as string);
          if (subscription) {
            await handleSubscriptionUpdate(subscription);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  // Find user by Stripe customer ID
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);

  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return;
  }

  // Get price ID from subscription
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error('No price ID found in subscription');
    return;
  }

  // Map Stripe price to tier
  const tier = mapStripePriceToTier(priceId);
  const status = mapStripeStatusToSubscriptionStatus(subscription.status);

  // Calculate expiration date (end of current period)
  const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined;

  // Update user subscription
  await updateUserSubscription(user.id, tier, status, {
    customerId,
    subscriptionId: subscription.id,
    expiresAt,
  });

  // Update Stripe subscription ID in user record
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionExpiresAt: expiresAt,
    })
    .where(eq(users.id, user.id));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  // Find user by Stripe customer ID
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);

  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return;
  }

  // Revert to free tier
  await updateUserSubscription(user.id, 'free', 'canceled');
}
