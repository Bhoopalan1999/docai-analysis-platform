import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { getUserSubscriptionDetails, updateUserSubscription } from '@/lib/subscription/service';
import { cancelStripeSubscription } from '@/lib/subscription/stripe';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/subscriptions/cancel
 * Cancel user's subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { immediately = false } = body;

    // Get user's subscription details
    const subscriptionDetails = await getUserSubscriptionDetails(session.user.id);

    if (subscriptionDetails.tier === 'free') {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    if (!subscriptionDetails.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 });
    }

    // Cancel Stripe subscription
    await cancelStripeSubscription(subscriptionDetails.stripeSubscriptionId, immediately);

    // If canceling immediately, revert to free tier
    if (immediately) {
      await updateUserSubscription(session.user.id, 'free', 'canceled');
    } else {
      // Update status to indicate cancellation at period end
      await db
        .update(users)
        .set({
          subscriptionStatus: 'canceled',
        })
        .where(eq(users.id, session.user.id));
    }

    return NextResponse.json({
      success: true,
      message: immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      },
      { status: 500 }
    );
  }
}
