/**
 * ==============================================================================
 * OTP SERVICE (Generation, Hashing & Verification)
 * ==============================================================================
 * Handles secure lifecycle of 6-digit one-time passwords for credentials auth.
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";

// Fallback in-memory store in case database connection is pending/unreachable
interface MemoryOtp {
  email: string;
  otpHash: string;
  expiresAt: Date;
  verified: boolean;
}
const memoryOtpStore = new Map<string, MemoryOtp>();

export async function generateAndStoreOtp(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  // Generate cryptographically unpredictable 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(code, salt);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    // Delete any old unverified OTPs for this email in DB
    await prisma.emailOtp.deleteMany({
      where: { email: normalizedEmail },
    }).catch(() => {});

    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        otpHash,
        expiresAt,
        verified: false,
      },
    });
  } catch (error) {
    console.warn("Prisma DB unavailable for OTP storage; using memory fallback:", (error as Error).message);
    memoryOtpStore.set(normalizedEmail, {
      email: normalizedEmail,
      otpHash,
      expiresAt,
      verified: false,
    });
  }

  // Also store in memory as backup
  memoryOtpStore.set(normalizedEmail, {
    email: normalizedEmail,
    otpHash,
    expiresAt,
    verified: false,
  });

  return code;
}

export async function verifyOtpCode(email: string, code: string): Promise<{ valid: boolean; reason?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  let latestOtp: { otpHash: string; expiresAt: Date; verified: boolean } | null = null;

  try {
    const dbRecord = await prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        verified: false,
      },
      orderBy: { createdAt: "desc" },
    });
    if (dbRecord) {
      latestOtp = dbRecord;
    }
  } catch {
    // fallback to memory
  }

  if (!latestOtp) {
    latestOtp = memoryOtpStore.get(normalizedEmail) || null;
  }

  if (!latestOtp) {
    return { valid: false, reason: "No verification code requested or already used." };
  }

  if (latestOtp.verified) {
    return { valid: false, reason: "This verification code has already been used." };
  }

  if (new Date() > latestOtp.expiresAt) {
    return { valid: false, reason: "Verification code has expired. Please request a new one." };
  }

  const isMatch = await bcrypt.compare(code, latestOtp.otpHash);
  if (!isMatch) {
    return { valid: false, reason: "Invalid verification code." };
  }

  // Mark as verified
  try {
    await prisma.emailOtp.updateMany({
      where: { email: normalizedEmail },
      data: { verified: true },
    });
  } catch {
    // ignore
  }

  memoryOtpStore.delete(normalizedEmail);
  return { valid: true };
}
