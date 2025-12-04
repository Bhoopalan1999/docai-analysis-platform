import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { getUserSubscriptionDetails, getOrCreateStripeCustomer } from '@/lib/subscription/service';
import { createCheckoutSession, createStripeCustomer } from '@/lib/subscription/stripe';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';

/**
 * POST /api/subscriptions/create-checkout
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, priceId } = body;

    if (!tier || !priceId) {
      return NextResponse.json({ error: 'Tier and priceId are required' }, { status: 400 });
    }

    // Validate tier
    if (!['pro', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier. Must be pro or enterprise' }, { status: 400 });
    }

    // Get user details
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await createStripeCustomer(user.email, user.name || undefined, {
        userId: session.user.id,
      });
      customerId = customer.id;

      // Save customer ID to database
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, session.user.id));
    }

    // Get base URL for redirects
    const baseUrl = env.BETTER_AUTH_URL || request.nextUrl.origin;
    const successUrl = `${baseUrl}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/settings/subscription?canceled=true`;

    // Create checkout session
    const checkoutSession = await createCheckoutSession(customerId, priceId, successUrl, cancelUrl, {
      userId: session.user.id,
      tier,
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
