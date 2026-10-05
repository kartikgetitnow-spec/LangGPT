/**
 * ==============================================================================
 * LOCAL DATABASE FOR CONTEXT AWARENESS & MEMORY
 * ==============================================================================
 * A lightweight, file-based JSON database that stores user preferences, custom
 * instructions, and learned context across all conversations.
 * 
 * WHY A LOCAL FILE-BASED DB?
 * - No external database infrastructure required (zero setup).
 * - Fully persistent: Survives app restarts and browser cache clears.
 * - Simple JSON structure: Easy to inspect, backup, edit, or migrate to PostgreSQL / MongoDB.
 */

import fs from "fs/promises";
import path from "path";

export interface UserPreferences {
  userName: string;
  role: string;
  preferredLanguages: string[];
  codingStyle: string;
  tone: string;
  customRules: string[];
  learnedPreferences: string[]; // Dynamically extracted from chat turns
  updatedAt: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  userName: "",
  role: "",
  preferredLanguages: [],
  codingStyle: "",
  tone: "informative and balanced",
  customRules: [],
  learnedPreferences: [],
  updatedAt: new Date().toISOString(),
};

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
        // File does not exist, write default clean schema
        await fs.writeFile(
          this.dbPath,
          JSON.stringify(DEFAULT_PREFERENCES, null, 2),
          "utf-8"
        );
      }
      this.isInitialized = true;
    } catch (err) {
      console.error("Failed to initialize LocalContextDatabase:", err);
    }
  }

  /**
   * Reads and parses all context data from the local database.
   */
  async getPreferences(): Promise<UserPreferences> {
    await this.ensureInitialized();
    try {
      const content = await fs.readFile(this.dbPath, "utf-8");
      return JSON.parse(content) as UserPreferences;
    } catch (err) {
      console.error("Error reading context_db.json:", err);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Persists the given preferences object to the file.
   */
  private async writePreferences(data: UserPreferences): Promise<void> {
    await this.ensureInitialized();
    const updated = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.dbPath, JSON.stringify(updated, null, 2), "utf-8");
  }

  /**
   * Updates partial user preference fields.
   */
  async updatePreferences(partial: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const merged: UserPreferences = {
      ...current,
      ...partial,
      userName: partial.userName !== undefined ? partial.userName.trim() : current.userName,
      role: partial.role !== undefined ? partial.role.trim() : current.role,
      codingStyle: partial.codingStyle !== undefined ? partial.codingStyle.trim() : current.codingStyle,
      tone: partial.tone !== undefined ? partial.tone.trim() : current.tone,
      preferredLanguages: partial.preferredLanguages ?? current.preferredLanguages,
      customRules: partial.customRules ?? current.customRules,
      learnedPreferences: partial.learnedPreferences ?? current.learnedPreferences,
    };

    await this.writePreferences(merged);
    return merged;
  }

  /**
   * Appends an automatically learned preference if not already present.
   */
  async addLearnedPreference(preference: string): Promise<boolean> {
    if (!preference || !preference.trim()) return false;
    const clean = preference.trim();

    const current = await this.getPreferences();
    const exists = current.learnedPreferences.some(
      (p) => p.toLowerCase() === clean.toLowerCase()
    );

    if (exists) return false;

    current.learnedPreferences.push(clean);
    await this.writePreferences(current);
    return true;
  }

  /**
   * Deletes a learned preference by index.
   */
  async deleteLearnedPreference(index: number): Promise<UserPreferences> {
    const current = await this.getPreferences();
    if (index >= 0 && index < current.learnedPreferences.length) {
      current.learnedPreferences.splice(index, 1);
      await this.writePreferences(current);
    }
    return current;
  }

  /**
   * Adds a user-defined custom instruction / rule.
   */
  async addCustomRule(rule: string): Promise<UserPreferences> {
    if (!rule || !rule.trim()) return this.getPreferences();
    const current = await this.getPreferences();
    current.customRules.push(rule.trim());
    await this.writePreferences(current);
    return current;
  }

  /**
   * Deletes a user-defined custom instruction / rule by index.
   */
  async deleteCustomRule(index: number): Promise<UserPreferences> {
    const current = await this.getPreferences();
    if (index >= 0 && index < current.customRules.length) {
      current.customRules.splice(index, 1);
      await this.writePreferences(current);
    }
    return current;
  }

  /**
   * Resets all stored context data back to pristine defaults.
   */
  async clearAllContext(): Promise<UserPreferences> {
    const reset = {
      ...DEFAULT_PREFERENCES,
      updatedAt: new Date().toISOString(),
    };
    await this.writePreferences(reset);
    return reset;
  }
}

// Global database instance
export const localContextDb = new LocalContextDatabase();
