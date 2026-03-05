import { NextRequest, NextResponse } from 'next/server';
import { generateResetToken } from '@/lib/auth';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const token = await generateResetToken(email);

    // Always return success (don't reveal if email exists)
    if (!token) {
      return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Send reset email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://joshos-hub.vercel.app';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"JoshOS Hub" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset your JoshOS Hub password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #e2e8f0; background: #0f172a; padding: 24px; border-radius: 12px; text-align: center;">
            🔐 JoshOS Hub
          </h2>
          <p style="color: #334155; font-size: 16px;">You requested a password reset. Click below to set a new password:</p>
          <a href="${resetUrl}" style="display: block; background: linear-gradient(135deg, #D4A020, #B8860B); color: white; text-align: center; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0;">
            Reset Password
          </a>
          <p style="color: #94a3b8; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
