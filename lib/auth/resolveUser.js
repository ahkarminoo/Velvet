import jwt from 'jsonwebtoken';
import User from '@/models/user';
import { verifyFirebaseAuth } from '@/lib/firebase-admin';

/**
 * Resolve the authenticated user from a Next.js request.
 * Accepts three token formats in the Authorization header:
 *   - `line.<lineUserId>`         LINE login
 *   - `<jwt>`                     custom JWT (HS256 signed with JWT_SECRET or NEXTAUTH_SECRET)
 *   - Firebase ID token           verified via firebase-admin
 *
 * Returns the Mongoose User document, or null if no token / no match.
 * Never throws — callers map null → 401.
 */
export async function resolveUser(request) {
    const authToken = request.headers.get('authorization')?.split(' ')[1];
    if (!authToken) return null;

    if (authToken.startsWith('line.')) {
        const lineUserId = authToken.replace('line.', '');
        return User.findOne({ lineUserId });
    }

    try {
        const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
        if (secret) {
            const { userId } = jwt.verify(authToken, secret);
            const user = await User.findById(userId);
            if (user) return user;
        }
    } catch {}

    try {
        const { success, firebaseUid } = await verifyFirebaseAuth(request);
        if (success) return User.findOne({ firebaseUid });
    } catch {}

    return null;
}
