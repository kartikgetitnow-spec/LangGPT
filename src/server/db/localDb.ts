/**
 * ==============================================================================
 * LOCAL DATABASE FOR USER PROFILE & CONTEXT MEMORY
 * ==============================================================================
 * Stores the user's ongoing profile as a natural, narrative paragraph
 * (e.g. "Kartik is a software engineer who specializes in Next.js...").
 * 
 * Stored at: `data/context_db.json`
 */

import fs from "fs/promises";
import path from "path";

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
   * Ensures the data directory and context_db.json file exist.
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
   * Reads the current user profile state from disk.
   */
  async getProfile(): Promise<UserProfileState> {
    await this.ensureInitialized();
    try {
      const content = await fs.readFile(this.dbPath, "utf-8");
      const parsed = JSON.parse(content);
      // Support backward compatibility if previous schema was object
      if (typeof parsed.profileText === "string") {
        return parsed as UserProfileState;
      }
      // If previous format had userName or role
      if (parsed.userName || parsed.role) {
        const synthesized = `${parsed.userName || "User"} is a ${parsed.role || "developer"} who works with ${(parsed.preferredLanguages || []).join(", ") || "modern tech"}.`;
        return {
          profileText: synthesized,
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        profileText: DEFAULT_PROFILE,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Error reading context_db.json:", err);
      return {
        profileText: DEFAULT_PROFILE,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Saves and updates the narrative profile paragraph.
   */
  async updateProfile(newText: string): Promise<UserProfileState> {
    await this.ensureInitialized();
    const updatedState: UserProfileState = {
      profileText: newText.trim(),
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      this.dbPath,
      JSON.stringify(updatedState, null, 2),
      "utf-8"
    );
    return updatedState;
  }

  /**
   * Clears the profile back to an empty slate.
   */
  async clearProfile(): Promise<UserProfileState> {
    await this.ensureInitialized();
    const emptyState: UserProfileState = {
      profileText: "",
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      this.dbPath,
      JSON.stringify(emptyState, null, 2),
      "utf-8"
    );
    return emptyState;
  }
}

// Global database instance
export const localContextDb = new LocalContextDatabase();
