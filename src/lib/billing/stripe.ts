import Stripe from "stripe";
import { Plan } from "@prisma/client";
import { STRIPE_PRICE_IDS } from "./plans";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function createOrRetrieveCustomer(
  teamId: string,
  email: string,
  name: string
): Promise<string> {
  const { db } = await import("@/lib/db");
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { stripeCustomerId: true },
  });

  if (team?.stripeCustomerId) {
    return team.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { teamId },
  });

  await db.team.update({
    where: { id: teamId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(
  teamId: string,
  plan: Plan,
  email: string,
  teamName: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const priceId = STRIPE_PRICE_IDS[plan];
  if (!priceId) throw new Error(`No price ID configured for plan: ${plan}`);

  const customerId = await createOrRetrieveCustomer(teamId, email, teamName);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { teamId, plan },
    subscription_data: {
      metadata: { teamId, plan },
    },
  });

  return session.url!;
}

export async function createPortalSession(
  teamId: string,
  returnUrl: string
): Promise<string> {
  const { db } = await import("@/lib/db");
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { stripeCustomerId: true },
  });

  if (!team?.stripeCustomerId) {
    throw new Error("No Stripe customer found for this team");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function handleSubscriptionEvent(
  event: Stripe.Event
): Promise<void> {
  const { db } = await import("@/lib/db");

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return;

    const teamId = session.metadata?.teamId;
    const plan = session.metadata?.plan as Plan;
    if (!teamId || !plan) return;

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    await db.team.update({
      where: { id: teamId },
      data: { plan, stripeSubId: subscription.id },
    });

    await db.subscription.upsert({
      where: { teamId },
      create: {
        teamId,
        stripeSubId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        plan,
        status: "ACTIVE",
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      update: {
        stripeSubId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        plan,
        status: "ACTIVE",
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const teamId = subscription.metadata?.teamId;
    if (!teamId) return;

    const isActive = subscription.status === "active";
    const plan = isActive
      ? (subscription.metadata?.plan as Plan) || "FREE"
      : "FREE";

    await db.team.update({
      where: { id: teamId },
      data: { plan },
    });

    await db.subscription.updateMany({
      where: { stripeSubId: subscription.id },
      data: {
        status: subscription.status.toUpperCase() as "ACTIVE" | "CANCELED" | "PAST_DUE",
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }
}
