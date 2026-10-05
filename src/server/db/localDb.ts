/**
 * ==============================================================================
 * DATABASE FOR USER PROFILE & CONTEXT MEMORY (PostgreSQL + Local File Fallback)
 * ==============================================================================
 * Stores the user's ongoing profile as a natural, narrative paragraph
 * (e.g. "Kartik is a software engineer who specializes in Next.js...").
 * 
 * Persists to PostgreSQL via Prisma `ProfileContext` model for signed-in users,
 * with a resilient local JSON file fallback (`data/context_db.json`).
 */

import fs from "fs/promises";
import path from "path";
import { prisma } from "./prisma";

export interface UserProfileState {
  profileText: string;
  updatedAt: string;
}

const DEFAULT_PROFILE =
  "Kartik is a software engineer who specializes in Next.js and TypeScript. He prefers clean, modular code and uses Tailwind CSS v4 for styling.";

export class LocalContextDatabase {
  private dbPath: string;
  private isInitialized = false;

  constructor() {
    this.dbPath = path.join(process.cwd(), "data", "context_db.json");
  }

  /**
   * Ensures the fallback data directory and context_db.json file exist.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      try {
        await fs.access(this.dbPath);
      } catch {
        const initialData: UserProfileState = {
          profileText: DEFAULT_PROFILE,
          updatedAt: new Date().toISOString(),
        };
        await fs.writeFile(
          this.dbPath,
          JSON.stringify(initialData, null, 2),
          "utf-8"
        );
      }
      this.isInitialized = true;
    } catch (err) {
      console.error("Failed to initialize LocalContextDatabase:", err);
    }
  }

  /**
   * Reads user profile state. First checks Prisma PostgreSQL if userId is provided,
   * otherwise reads from the local file fallback.
   */
  async getProfile(userId?: string): Promise<UserProfileState> {
    if (userId) {
      try {
        const dbContext = await prisma.profileContext.findUnique({
          where: { userId },
        });
        if (dbContext) {
          return {
            profileText: dbContext.profileText,
            updatedAt: dbContext.updatedAt.toISOString(),
          };
        }
      } catch (err) {
        console.warn("PostgreSQL profile lookup failed; using local fallback:", (err as Error).message);
      }
    }

    await this.ensureInitialized();
    try {
      const content = await fs.readFile(this.dbPath, "utf-8");
      const parsed = JSON.parse(content);
      if (typeof parsed.profileText === "string") {
        return parsed as UserProfileState;
      }
      return {
        profileText: DEFAULT_PROFILE,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        profileText: DEFAULT_PROFILE,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Saves and updates the narrative profile paragraph in PostgreSQL & fallback.
   */
  async updateProfile(newText: string, userId?: string): Promise<UserProfileState> {
    const trimmed = newText.trim();
    const now = new Date().toISOString();

    if (userId) {
      try {
        await prisma.profileContext.upsert({
          where: { userId },
          update: { profileText: trimmed },
          create: { userId, profileText: trimmed },
        });
      } catch (err) {
        console.warn("PostgreSQL profile update failed; falling back to local file:", (err as Error).message);
      }
    }

    await this.ensureInitialized();
    const updatedState: UserProfileState = {
      profileText: trimmed,
      updatedAt: now,
    };
    try {
      await fs.writeFile(
        this.dbPath,
        JSON.stringify(updatedState, null, 2),
        "utf-8"
      );
    } catch (writeErr) {
      console.error("Failed to write to context_db.json:", writeErr);
    }
    return updatedState;
  }

  /**
   * Clears the profile back to an empty slate.
   */
  async clearProfile(userId?: string): Promise<UserProfileState> {
    const now = new Date().toISOString();

    if (userId) {
      try {
        await prisma.profileContext.deleteMany({
          where: { userId },
        });
      } catch {
        // ignore
      }
    }

    await this.ensureInitialized();
    const emptyState: UserProfileState = {
      profileText: "",
      updatedAt: now,
    };
    try {
      await fs.writeFile(
        this.dbPath,
        JSON.stringify(emptyState, null, 2),
        "utf-8"
      );
    } catch {
      // ignore
    }
    return emptyState;
  }
}

// Global database instance
export const localContextDb = new LocalContextDatabase();
