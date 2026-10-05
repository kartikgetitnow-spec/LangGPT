import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { generateAndStoreOtp } from "@/server/auth/otpService";
import { sendOtpEmail } from "@/server/auth/emailService";

const router = Router();

// POST /api/auth/otp/send
router.post("/otp/send", async (req: Request, res: Response) => {
  try {
    const { email, password, isSignUp } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch {}

    if (isSignUp && existingUser && existingUser.password) {
      return res.status(400).json({
        error: "An account with this email already exists. Please choose Sign In.",
      });
    }

    if (!isSignUp && existingUser && existingUser.password) {
      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (!isMatch) {
        return res.status(401).json({
          error: "Incorrect password. Please verify and try again.",
        });
      }
    }

    const otp = await generateAndStoreOtp(normalizedEmail);

    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      isSignUp: !!isSignUp,
    });

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      devMode: emailResult.devMode || false,
    });
  } catch (error) {
    console.error("Error in POST /api/auth/otp/send:", error);
    res.status(500).json({ error: "Internal server error while sending verification code." });
  }
});

export default router;
