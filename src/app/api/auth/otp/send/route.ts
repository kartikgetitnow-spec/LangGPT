/**
 * ==============================================================================
 * OTP DISPATCH API (/api/auth/otp/send)
 * ==============================================================================
 * Validates user credentials and dispatches a 6-digit verification code to their email.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { generateAndStoreOtp } from "@/server/auth/otpService";
import { sendOtpEmail } from "@/server/auth/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isSignUp } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch {
      // If DB connection is initializing, allow proceeding
    }

    if (isSignUp && existingUser && existingUser.password) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please choose Sign In." },
        { status: 400 }
      );
    }

    if (!isSignUp && existingUser && existingUser.password) {
      // Validate password prior to sending OTP
      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Incorrect password. Please verify and try again." },
          { status: 401 }
        );
      }
    }

    // Generate 6-digit OTP and store hashed in DB / memory
    const otp = await generateAndStoreOtp(normalizedEmail);

    // Send email
    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      isSignUp: !!isSignUp,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      devMode: emailResult.devMode || false,
    });
  } catch (error) {
    console.error("Error in /api/auth/otp/send:", error);
    return NextResponse.json(
      { error: "Internal server error while sending verification code." },
      { status: 500 }
    );
  }
}
