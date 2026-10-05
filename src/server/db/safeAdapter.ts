/**
 * ==============================================================================
 * RESILIENT PRISMA ADAPTER WRAPPER FOR NEXTAUTH
 * ==============================================================================
 * Wraps PrismaAdapter with an automatic fallback mechanism.
 * If the PostgreSQL database server is offline or unreachable at DATABASE_URL:
 * - Logs an informative warning rather than crashing NextAuth with 500 AdapterError.
 * - Safely stores accounts and users in a local fallback store so Google, GitHub,
 *   and credentials authentication continue to work seamlessly.
 * - Once PostgreSQL is running, queries automatically execute against PostgreSQL.
 */

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser, AdapterAccount } from "@auth/core/adapters";
import type { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

interface FallbackAuthStore {
  users: Record<string, AdapterUser>;
  usersByEmail: Record<string, string>; // email -> userId
  accounts: Record<string, AdapterAccount>; // provider_providerAccountId -> account
}

const FALLBACK_FILE = path.join(process.cwd(), "data", "fallback_auth.json");

function loadFallbackStore(): FallbackAuthStore {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const data = fs.readFileSync(FALLBACK_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return { users: {}, usersByEmail: {}, accounts: {} };
}

function saveFallbackStore(store: FallbackAuthStore) {
  try {
    const dir = path.dirname(FALLBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write to fallback_auth.json:", err);
  }
}

export function createSafePrismaAdapter(prisma: PrismaClient): Adapter {
  const baseAdapter = PrismaAdapter(prisma);
  const store = loadFallbackStore();

  let hasLoggedDbWarning = false;
  const handleDbError = (operation: string, _error: unknown) => {
    if (!hasLoggedDbWarning) {
      console.warn(
        `\n⚠️ [Prisma Safe Adapter] PostgreSQL database is currently unreachable for operation "${operation}".` +
        `\n   Falling back to persistent local storage so login succeeds.` +
        `\n   (Start PostgreSQL or update DATABASE_URL in .env to sync directly to Postgres)\n`
      );
      hasLoggedDbWarning = true;
    }
  };

  return {
    ...baseAdapter,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async createUser(user: any): Promise<AdapterUser> {
      try {
        if (baseAdapter.createUser) {
          return (await baseAdapter.createUser(user)) as AdapterUser;
        }
      } catch (err) {
        handleDbError("createUser", err);
      }

      const id = "usr_" + Math.random().toString(36).substring(2, 11);
      const newUser: AdapterUser = {
        id,
        ...user,
        emailVerified: user.emailVerified || null,
      };

      store.users[id] = newUser;
      if (newUser.email) {
        store.usersByEmail[newUser.email.toLowerCase()] = id;
      }
      saveFallbackStore(store);
      return newUser;
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      try {
        if (baseAdapter.getUser) {
          return await baseAdapter.getUser(id);
        }
      } catch (err) {
        handleDbError("getUser", err);
      }
      return store.users[id] || null;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const normalized = email.toLowerCase().trim();
      try {
        if (baseAdapter.getUserByEmail) {
          return await baseAdapter.getUserByEmail(normalized);
        }
      } catch (err) {
        handleDbError("getUserByEmail", err);
      }
      const userId = store.usersByEmail[normalized];
      return userId ? store.users[userId] || null : null;
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }: {
      provider: string;
      providerAccountId: string;
    }): Promise<AdapterUser | null> {
      try {
        if (baseAdapter.getUserByAccount) {
          return await baseAdapter.getUserByAccount({ provider, providerAccountId });
        }
      } catch (err) {
        handleDbError("getUserByAccount", err);
      }

      const key = `${provider}:${providerAccountId}`;
      const account = store.accounts[key];
      if (account) {
        return store.users[account.userId] || null;
      }
      return null;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updateUser(user: any): Promise<AdapterUser> {
      try {
        if (baseAdapter.updateUser) {
          return await baseAdapter.updateUser(user);
        }
      } catch (err) {
        handleDbError("updateUser", err);
      }

      const existing = store.users[user.id] || { id: user.id, emailVerified: null, email: "" };
      const updated = { ...existing, ...user };
      store.users[user.id] = updated;
      if (updated.email) {
        store.usersByEmail[updated.email.toLowerCase()] = user.id;
      }
      saveFallbackStore(store);
      return updated;
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount | null | undefined> {
      try {
        if (baseAdapter.linkAccount) {
          const res = await baseAdapter.linkAccount(account);
          return (res as AdapterAccount | null | undefined) ?? account;
        }
      } catch (err) {
        handleDbError("linkAccount", err);
      }

      const key = `${account.provider}:${account.providerAccountId}`;
      store.accounts[key] = account;
      saveFallbackStore(store);
      return account;
    },

    async deleteUser(userId: string) {
      try {
        if (baseAdapter.deleteUser) {
          await baseAdapter.deleteUser(userId);
        }
      } catch (err) {
        handleDbError("deleteUser", err);
      }
      delete store.users[userId];
      saveFallbackStore(store);
    },

    async unlinkAccount({
      provider,
      providerAccountId,
    }: {
      provider: string;
      providerAccountId: string;
    }) {
      try {
        if (baseAdapter.unlinkAccount) {
          await baseAdapter.unlinkAccount({ provider, providerAccountId });
        }
      } catch (err) {
        handleDbError("unlinkAccount", err);
      }
      delete store.accounts[`${provider}:${providerAccountId}`];
      saveFallbackStore(store);
    },
  };
}
