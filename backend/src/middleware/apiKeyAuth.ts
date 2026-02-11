import type { NextFunction, Request, Response } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { apiKeys } from '../db/schema.js';

function hashApiKey(apiKey: string) {
  return createHash('sha256').update(apiKey).digest('hex');
}

function extractApiKey(req: Request) {
  const headerKey = req.header('x-api-key');
  if (headerKey) {
    return headerKey.trim();
  }

  const authHeader = req.header('authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const hashedInput = hashApiKey(apiKey);

    const [record] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, hashedInput),
          isNull(apiKeys.revokedAt)
        )
      )
      .limit(1);

    if (!record) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, record.id));

    return next();
  } catch (error) {
    return next(error);
  }
}

export function createApiKey() {
  const raw = `tsia_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
  return {
    raw,
    keyHash: hashApiKey(raw),
    keyPrefix: raw.slice(0, 8),
    keyLastFour: raw.slice(-4),
  };
}
