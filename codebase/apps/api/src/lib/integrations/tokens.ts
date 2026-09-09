import { IntegrationConnection } from '@ai-crm/db';
import { decrypt, encrypt } from '../crypto.js';

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
};

export type TokenRefreshResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
};

const DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function saveTokens(
  workspaceId: string,
  providerKey: string,
  tokens: OAuthTokens,
): Promise<void> {
  const update: Record<string, unknown> = {
    encryptedAccessToken: encrypt(tokens.accessToken),
    tokenExpiresAt: tokens.expiresAt ?? null,
  };

  if (tokens.refreshToken) {
    update.encryptedRefreshToken = encrypt(tokens.refreshToken);
  }

  await IntegrationConnection.findOneAndUpdate({ workspaceId, providerKey }, update);
}

export async function getAccessToken(
  workspaceId: string,
  providerKey: string,
): Promise<string | null> {
  const conn = await IntegrationConnection.findOne({ workspaceId, providerKey }).select(
    'encryptedAccessToken',
  );
  if (!conn?.encryptedAccessToken) {
    return null;
  }
  return decrypt(conn.encryptedAccessToken);
}

export async function refreshIfNeeded(
  workspaceId: string,
  providerKey: string,
  refreshFn: (refreshToken: string) => Promise<TokenRefreshResult>,
  bufferMs = DEFAULT_REFRESH_BUFFER_MS,
): Promise<string | null> {
  const conn = await IntegrationConnection.findOne({ workspaceId, providerKey }).select(
    'encryptedAccessToken encryptedRefreshToken tokenExpiresAt',
  );
  if (!conn?.encryptedAccessToken) {
    return null;
  }

  const expiresAt = conn.tokenExpiresAt?.getTime();
  const needsRefresh = expiresAt != null && expiresAt - bufferMs <= Date.now();

  if (!needsRefresh) {
    return decrypt(conn.encryptedAccessToken);
  }

  if (!conn.encryptedRefreshToken) {
    return decrypt(conn.encryptedAccessToken);
  }

  const refreshToken = decrypt(conn.encryptedRefreshToken);
  const refreshed = await refreshFn(refreshToken);

  await saveTokens(workspaceId, providerKey, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? refreshToken,
    expiresAt: refreshed.expiresAt ?? null,
  });

  return refreshed.accessToken;
}
