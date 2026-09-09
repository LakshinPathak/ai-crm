import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import {
  clearOAuthStateCookie,
  getOAuthStateFromCookie,
  setOAuthStateCookie,
} from './cookies.js';

export function issueOAuthState(res: Response): string {
  const state = randomUUID();
  setOAuthStateCookie(res, state);
  return state;
}

export function validateOAuthState(
  res: Response,
  cookieHeader: string | undefined,
  queryState: string | undefined,
): boolean {
  const expected = getOAuthStateFromCookie(cookieHeader);
  clearOAuthStateCookie(res);
  if (!expected || !queryState) return false;
  return expected === queryState;
}
