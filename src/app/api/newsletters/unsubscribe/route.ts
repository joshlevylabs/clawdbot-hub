import { NextRequest, NextResponse } from 'next/server';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';
import crypto from 'crypto';

// Get or generate HMAC secret
function getUnsubscribeSecret(): string {
  if (process.env.UNSUBSCRIBE_SECRET) {
    return process.env.UNSUBSCRIBE_SECRET;
  }
  
  // Fallback to a stable generated secret
  return crypto
    .createHash('sha256')
    .update('clawdbot-hub-unsubscribe-secret-' + (process.env.AUTH_SECRET || 'fallback'))
    .digest('hex');
}

// Verify HMAC signature
function verifySignature(subscriberId: string, newsletterId: string, signature: string): boolean {
  const secret = getUnsubscribeSecret();
  const payload = `${subscriberId}:${newsletterId}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
}

// Generate unsubscribe confirmation HTML
function generateConfirmationPage(newsletterName: string, subscriberEmail: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribed - ${newsletterName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background-color: #0f172a;
            color: #e2e8f0;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background-color: #1e293b;
            border-radius: 12px;
            padding: 32px;
            max-width: 500px;
            margin: 20px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        .icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            color: #f1f5f9;
            font-size: 24px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        p {
            color: #94a3b8;
            line-height: 1.6;
            margin-bottom: 16px;
        }
        .newsletter-name {
            color: #60a5fa;
            font-weight: 600;
        }
        .email {
            color: #94a3b8;
            font-size: 14px;
            font-family: 'Monaco', 'Consolas', monospace;
            background-color: #334155;
            padding: 8px 12px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 8px;
        }
        .footer {
            margin-top: 24px;
            color: #64748b;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>You've been unsubscribed</h1>
        <p>You have successfully unsubscribed from <span class="newsletter-name">${newsletterName}</span>.</p>
        <p>You will no longer receive emails from this newsletter at:</p>
        <div class="email">${subscriberEmail}</div>
        <div class="footer">
            If this was a mistake, please contact the newsletter sender directly.
        </div>
    </div>
</body>
</html>`;
}

// GET /api/newsletters/unsubscribe?sid=<subscriber_id>&nid=<newsletter_id>&sig=<hmac>
export async function GET(request: NextRequest) {
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('sid');
    const newsletterId = searchParams.get('nid');
    const signature = searchParams.get('sig');

    if (!subscriberId || !newsletterId || !signature) {
      return new NextResponse(
        generateConfirmationPage('Newsletter', 'Invalid link'),
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Verify signature
    if (!verifySignature(subscriberId, newsletterId, signature)) {
      return new NextResponse(
        generateConfirmationPage('Newsletter', 'Invalid or expired link'),
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Check if subscription exists and is active
    const { data: subscription, error: subError } = await supabase
      .from('newsletter_subscribers')
      .select('status, subscriber_id')
      .eq('subscriber_id', subscriberId)
      .eq('newsletter_id', newsletterId)
      .single();

    if (subError || !subscription) {
      return new NextResponse(
        generateConfirmationPage('Newsletter', 'Subscription not found'),
        { 
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Get subscriber and newsletter details for confirmation page
    const [subscriberResult, newsletterResult] = await Promise.all([
      supabase
        .from('subscribers')
        .select('email, name')
        .eq('id', subscriberId)
        .single(),
      supabase
        .from('newsletters')
        .select('name')
        .eq('id', newsletterId)
        .single()
    ]);

    const subscriberEmail = subscriberResult.data?.email || 'unknown';
    const newsletterName = newsletterResult.data?.name || 'Newsletter';

    // If already unsubscribed, just show confirmation
    if (subscription.status === 'unsubscribed') {
      return new NextResponse(
        generateConfirmationPage(newsletterName, subscriberEmail),
        { 
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('subscriber_id', subscriberId)
      .eq('newsletter_id', newsletterId);

    if (updateError) {
      console.error('Failed to update unsubscribe status:', updateError);
      return new NextResponse(
        generateConfirmationPage('Newsletter', 'Error processing unsubscribe'),
        { 
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Log the unsubscribe activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: newsletterId,
      type: 'unsubscribe',
      description: `${subscriberEmail} unsubscribed via email link`,
      metadata: {
        subscriber_id: subscriberId,
        subscriber_email: subscriberEmail,
        unsubscribe_method: 'email_link'
      }
    });

    // Return success confirmation page
    return new NextResponse(
      generateConfirmationPage(newsletterName, subscriberEmail),
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new NextResponse(
      generateConfirmationPage('Newsletter', 'An error occurred'),
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}