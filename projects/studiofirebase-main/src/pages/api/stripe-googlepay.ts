import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, amount, currency } = req.body;
  if (!token || !amount || !currency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Cria um PaymentMethod usando o token do Google Pay
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token },
    });

    // Cria o PaymentIntent usando o PaymentMethod
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      payment_method: paymentMethod.id,
      confirmation_method: 'automatic',
      confirm: true,
    });

    return res.status(200).json({ success: true, paymentIntent });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
