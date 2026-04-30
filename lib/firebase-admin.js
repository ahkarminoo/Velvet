import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/user';

// Get Firebase Admin credentials from environment variables or JSON file
function getFirebaseAdminCredentials() {
  // Try environment variables first (for production/Vercel)
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return {
      type: "service_account",
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID || "foodloft-450813",
      private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
    };
  }

  // Fallback to JSON file for local development.
  // On Vercel, allow missing credentials when Firebase features are not in use.
  
  // Try to load the service account file from the project root
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Use process.cwd() to get the project root directory
    const projectRoot = process.cwd();
    const filePath = path.join(projectRoot, 'lib', 'serviceAccountKey.json');
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const serviceAccount = JSON.parse(fileContent);

    return serviceAccount;
  } catch (error) {
    // Check if this is a build process by looking for specific build environment indicators
    const isBuildProcess = process.env.NEXT_PHASE === 'phase-production-build' || 
                          process.argv.includes('build') ||
                          process.env.npm_lifecycle_event === 'build';
    
    if (isBuildProcess) {
      console.log('🔧 Build process detected, skipping Firebase Admin initialization...');
      return null;
    }
    
    return null;
  }
}

// Initialize Firebase Admin with better error handling
let firebaseInitialized = false;
let initializationError = null;

function initializeFirebaseAdmin() {
  if (firebaseInitialized) {
    return firebaseInitialized;
  }
  
  try {
    if (!getApps().length) {
      const credentials = getFirebaseAdminCredentials();
      
      // Skip initialization if no credentials (build time)
      if (credentials) {
        initializeApp({
          credential: cert(credentials),
          storageBucket: 'foodloft-450813.firebasestorage.app',
          projectId: 'foodloft-450813'
        });
        firebaseInitialized = true;
      } else {
        return false;
      }
    } else {
      firebaseInitialized = true;
    }
    return firebaseInitialized;
  } catch (error) {
    initializationError = error;
    console.error('Firebase Admin initialization skipped:', error?.message || error);
    return false;
  }
}

// Export storage and auth with lazy initialization
export const storage = (() => {
  try {
    return initializeFirebaseAdmin() ? getStorage() : null;
  } catch (error) {
    console.error('Failed to get storage:', error);
    return null;
  }
})();

export const adminAuth = (() => {
  try {
    return initializeFirebaseAdmin() ? getAuth() : null;
  } catch (error) {
    console.error('Failed to get auth:', error);
    return null;
  }
})();

// Middleware to verify Firebase Auth token
export const verifyFirebaseAuth = async (req) => {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'No authorization header' };
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    if (token.startsWith('line.')) {
      const lineUserId = token.replace('line.', '');
      await dbConnect();
      const user = await User.findOne({ lineUserId }).lean();

      if (!user) {
        return { success: false, error: 'LINE user not found' };
      }

      return {
        success: true,
        firebaseUid: user.firebaseUid || `line:${lineUserId}`,
        email: user.email,
        lineUserId,
        user
      };
    }

    if (!adminAuth) {
      return { success: false, error: 'Firebase auth is disabled' };
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    return { 
      success: true, 
      firebaseUid: decodedToken.uid, 
      email: decodedToken.email,
      decodedToken 
    };
  } catch (error) {
    console.error('Firebase auth verification failed:', error);
    return { success: false, error: 'Authentication failed' };
  }
};
