import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { NextFunction, Request, Response } from 'express';

export interface VerifiedAdminUser {
  uid: string;
  email: string;
  name?: string;
}

export interface AdminRequest extends Request {
  adminUser?: VerifiedAdminUser;
}

const DEFAULT_FIREBASE_PROJECT_ID = 'animated-pad-gpz3c';
const DEFAULT_ADMIN_EMAIL = 'lungile.carl@gmail.com';

export function getConfiguredFirebaseProjectId(): string {
  return (process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID).trim();
}

export function getConfiguredAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

function getFirebaseAuthVerifier() {
  const projectId = getConfiguredFirebaseProjectId();
  const app = getApps().length
    ? getApp()
    : initializeApp({
        projectId,
      });
  // NOTE: verifyIdToken(token) verifies Google's public signing keys locally
  // and requires ZERO IAM permissions and ZERO Firestore access.
  return getAuth(app);
}

/**
 * Strict server-side administrator verification middleware.
 * Rejects missing/malformed/expired tokens with 401 and non-admin accounts with 403.
 */
export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Never allow wildcard CORS on authenticated admin endpoints
  res.setHeader('Cache-Control', 'no-store');

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required. Please sign in with your authorized administrator Google account.',
    });
    return;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || idToken.length > 8192) {
    res.status(401).json({
      error: 'invalid_token',
      message: 'Invalid bearer token format.',
    });
    return;
  }

  try {
    const auth = getFirebaseAuthVerifier();
    // Standard cryptographic verification (no IAM / revocation RPC required on Starter Tier)
    const decoded = await auth.verifyIdToken(idToken, false);
    const email = (decoded.email || '').trim().toLowerCase();
    const expectedAdmin = getConfiguredAdminEmail();

    if (!decoded.email_verified || !email || email !== expectedAdmin) {
      res.status(403).json({
        error: 'forbidden',
        message: 'Access denied. This account is not authorized as the NEF123123 administrator.',
      });
      return;
    }

    req.adminUser = {
      uid: decoded.uid,
      email,
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
    };
    next();
  } catch {
    res.status(401).json({
      error: 'invalid_or_expired_token',
      message: 'Firebase ID token verification failed or token has expired. Please sign in again.',
    });
  }
}
