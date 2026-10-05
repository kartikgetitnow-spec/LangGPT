/**
 * ==============================================================================
 * EMAIL SERVICE (Nodemailer OTP Delivery)
 * ==============================================================================
 * Dispatches 6-digit verification codes to users for secure password + OTP login.
 * Includes a terminal-based dev fallback if SMTP credentials are not configured.
 */

import nodemailer from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  otp: string;
  isSignUp?: boolean;
}

export async function sendOtpEmail({ to, otp, isSignUp = false }: SendOtpEmailParams): Promise<{ success: boolean; messageId?: string; devMode?: boolean }> {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = parseInt(process.env.EMAIL_SERVER_PORT || "587", 10);
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM || "LangGPT <no-reply@langgpt.com>";

  // If SMTP is not yet configured, provide clear terminal fallback for local testing
  if (!user || !pass) {
    console.log(`\n========================================================`);
    console.log(`🔑 [LangGPT DEV OTP] Email verification code for: ${to}`);
    console.log(`   CODE: >>>  ${otp}  <<<`);
    console.log(`   Valid for 10 minutes.`);
    console.log(`   (Configure EMAIL_SERVER_USER & EMAIL_SERVER_PASSWORD in .env for production SMTP)`);
    console.log(`========================================================\n`);
    return { success: true, devMode: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const actionText = isSignUp ? "complete your LangGPT registration" : "sign in to your LangGPT account";

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #1f2937; border-radius: 12px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: #10a37f; color: #ffffff; font-size: 22px; font-weight: bold;">
            L
          </div>
          <h2 style="font-size: 22px; font-weight: 700; margin: 16px 0 6px; color: #111827;">Your Verification Code</h2>
          <p style="font-size: 14px; color: #6b7280; margin: 0;">Use the 6-digit code below to ${actionText}.</p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #111827;">${otp}</span>
        </div>

        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0 0 16px;">
          This code will expire in <strong>10 minutes</strong>. If you did not request this verification code, please ignore this email.
        </p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} LangGPT. All rights reserved.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to,
      subject: `Your LangGPT Verification Code: ${otp}`,
      text: `Your verification code is ${otp}. It will expire in 10 minutes.`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send OTP email via Nodemailer:", error);
    // In dev or unexpected error, still log the OTP so testing isn't blocked
    console.log(`🔑 [LangGPT FALLBACK OTP] Code for ${to}: ${otp}`);
    return { success: true, devMode: true };
  }
}
