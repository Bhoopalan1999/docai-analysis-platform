import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { getUserSubscription, getUserSubscriptionDetails } from '@/lib/subscription/service';
import { getQuotaSummary } from '@/lib/quota/quota-manager';

/**
 * GET /api/subscriptions/status
 * Get user's subscription status and quota summary
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription details
    const subscriptionDetails = await getUserSubscriptionDetails(session.user.id);
    const tier = await getUserSubscription(session.user.id);

    // Get quota summary
    const quotaSummary = await getQuotaSummary(session.user.id, tier);

    return NextResponse.json({
      success: true,
      subscription: subscriptionDetails,
      quota: quotaSummary,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get subscription status',
      },
      { status: 500 }
    );
  }
}
