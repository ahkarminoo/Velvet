// Utility to handle Google authentication with CORS workarounds

import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";

export const handleGoogleAuth = async (auth, onSuccess, onError) => {
  try {
    const provider = new GoogleAuthProvider();
    
    // Add custom parameters to improve popup reliability
    provider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'offline'
    });

    // Try popup first with timeout
    const popupPromise = signInWithPopup(auth, provider);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('POPUP_TIMEOUT')), 10000)
    );

    try {
      const result = await Promise.race([popupPromise, timeoutPromise]);
      
      if (result && result.user) {
        const { uid, email, displayName, photoURL } = result.user;
        return await onSuccess({ uid, email, displayName, photoURL });
      }
    } catch (popupError) {
      console.log('Popup method failed:', popupError.code || popupError.message);
      
      // If popup fails due to CORS or blocking, try redirect
      if (
        popupError.code === 'auth/popup-blocked' ||
        popupError.code === 'auth/popup-closed-by-user' ||
        popupError.code === 'auth/cancelled-popup-request' ||
        popupError.message.includes('Cross-Origin-Opener-Policy') ||
        popupError.message === 'POPUP_TIMEOUT'
      ) {
        console.log('Falling back to redirect method...');
        
        // Store state for after redirect
        localStorage.setItem('googleAuthAttempt', JSON.stringify({
          timestamp: Date.now(),
          url: window.location.href
        }));
        
        // Use redirect as fallback
        await signInWithRedirect(auth, provider);
        return; // Will complete after redirect
      }
      
      throw popupError;
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    onError(error);
  }
};

export const handleGoogleAuthRedirectResult = async (auth, onSuccess, onError) => {
  try {
    const authAttempt = localStorage.getItem('googleAuthAttempt');
    if (authAttempt) {
      const { timestamp } = JSON.parse(authAttempt);
      
      // Only process if attempt was recent (within 5 minutes)
      if (Date.now() - timestamp < 300000) {
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          const { uid, email, displayName, photoURL } = result.user;
          await onSuccess({ uid, email, displayName, photoURL });
        }
      }
      
      // Clean up
      localStorage.removeItem('googleAuthAttempt');
    }
  } catch (error) {
    console.error('Redirect result error:', error);
    localStorage.removeItem('googleAuthAttempt');
    onError(error);
  }
};
