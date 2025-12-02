import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SubscriptionTier } from './tiers';

/**
 * Get user's current subscription tier
 * @param userId - User ID
 * @returns Subscription tier (defaults to 'free' if not set)
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return 'free';
    }

    // Check if subscription is expired
    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
      // Subscription expired, revert to free
      if (user.subscriptionTier !== 'free') {
        await updateUserSubscription(userId, 'free', 'expired');
      }
      return 'free';
    }

    // Check if subscription status is active
    if (user.subscriptionStatus !== 'active' && user.subscriptionTier !== 'free') {
      // Subscription not active, revert to free
      await updateUserSubscription(userId, 'free', user.subscriptionStatus || 'inactive');
      return 'free';
    }

    return (user.subscriptionTier as SubscriptionTier) || 'free';
  } catch (error) {
    console.error('Error getting user subscription:', error);
    // Fail safe - return free tier
    return 'free';
  }
}

/**
 * Update user subscription
 * @param userId - User ID
 * @param tier - Subscription tier
 * @param status - Subscription status (defaults to 'active')
 * @param stripeData - Optional Stripe-related data
 */
export async function updateUserSubscription(
  userId: string,
  tier: SubscriptionTier,
  status: string = 'active',
  stripeData?: {
    customerId?: string;
    subscriptionId?: string;
    expiresAt?: Date;
  }
): Promise<void> {
  try {
    const updateData: {
      subscriptionTier: string;
      subscriptionStatus: string;
      subscriptionExpiresAt?: Date;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      updatedAt: Date;
    } = {
      subscriptionTier: tier,
      subscriptionStatus: status,
      updatedAt: new Date(),
    };

    if (stripeData?.customerId) {
      updateData.stripeCustomerId = stripeData.customerId;
    }

    if (stripeData?.subscriptionId) {
      updateData.stripeSubscriptionId = stripeData.subscriptionId;
    }

    if (stripeData?.expiresAt) {
      updateData.subscriptionExpiresAt = stripeData.expiresAt;
    }

    // If reverting to free, clear Stripe data
    if (tier === 'free') {
      updateData.stripeSubscriptionId = null;
      updateData.subscriptionExpiresAt = null;
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    // Create subscription history record
    await db.insert(subscriptions).values({
      userId,
      tier,
      status,
      stripeSubscriptionId: stripeData?.subscriptionId || null,
      currentPeriodStart: stripeData?.expiresAt
        ? new Date(stripeData.expiresAt.getTime() - 30 * 24 * 60 * 60 * 1000)
        : null, // Approximate
      currentPeriodEnd: stripeData?.expiresAt || null,
    });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Check if user's subscription is active
 * @param userId - User ID
 * @returns True if subscription is active
 */
export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return false;
    }

    // Free tier is always "active"
    if (user.subscriptionTier === 'free') {
      return true;
    }

    // Check if subscription is expired
    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
      return false;
    }

    // Check if subscription status is active
    return user.subscriptionStatus === 'active';
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Get or create Stripe customer ID for user
 * @param userId - User ID
 * @param email - User email
 * @returns Stripe customer ID
 */
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string | null> {
  try {
    const [user] = await db
      .select({
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    // Return existing customer ID if available
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Customer ID will be created by Stripe API and stored via webhook
    // This function is mainly for checking if customer exists
    return null;
  } catch (error) {
    console.error('Error getting Stripe customer:', error);
    return null;
  }
}

/**
 * Get user subscription details
 * @param userId - User ID
 * @returns User subscription details
 */
export async function getUserSubscriptionDetails(userId: string) {
  try {
    const [user] = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return {
        tier: 'free' as SubscriptionTier,
        status: 'active',
        expiresAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }

    return {
      tier: (user.subscriptionTier as SubscriptionTier) || 'free',
      status: user.subscriptionStatus || 'active',
      expiresAt: user.subscriptionExpiresAt,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
    };
  } catch (error) {
    console.error('Error getting user subscription details:', error);
    return {
      tier: 'free' as SubscriptionTier,
      status: 'active',
      expiresAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }
}
