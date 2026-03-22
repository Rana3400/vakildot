import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
// 🔔 NEW: Firebase Messaging for Push Notifications
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCP_CM8lmBY_X42AyrpbJ8IX29cX0U6sDE",
  authDomain: "vakil-app-auth.firebaseapp.com", 
  projectId: "vakil-app-auth",
  storageBucket: "vakil-app-auth.firebasestorage.app",
  messagingSenderId: "792778219182",
  appId: "1:792778219182:web:ed322ca2dd46c23ed0973f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// 🔔 NEW: Initialize Firebase Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
  console.log('✅ Firebase Messaging initialized');
} catch (error) {
  console.warn('⚠️ Firebase Messaging not available:', error.message);
}
export { messaging };

console.log('Firebase Initialized for VakilDot');

// Robust reCAPTCHA management - create once, reuse
const getOrCreateRecaptcha = async (containerId) => {
  // If we already have a working verifier, reuse it
  if (window.recaptchaVerifier) {
    try {
      // Test if it's still valid by checking its type
      if (window.recaptchaVerifier.type === 'recaptcha') {
        return window.recaptchaVerifier;
      }
    } catch (e) {
      // Verifier is broken, will recreate below
      console.log('[Firebase] Existing reCAPTCHA invalid, recreating...');
    }
  }

  // Clean up old verifier if exists
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (e) {}
    window.recaptchaVerifier = null;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[Firebase] Container '${containerId}' not found`);
    return null;
  }
  container.innerHTML = '';

  try {
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => { console.log('[Firebase] reCAPTCHA solved'); },
      'expired-callback': () => {
        console.log('[Firebase] reCAPTCHA expired, will recreate on next use');
        try { window.recaptchaVerifier.clear(); } catch (e) {}
        window.recaptchaVerifier = null;
      }
    });

    // Pre-render to ensure it's ready
    await verifier.render();
    window.recaptchaVerifier = verifier;
    console.log('[Firebase] reCAPTCHA created and rendered');
    return verifier;
  } catch (error) {
    console.error('[Firebase] RecaptchaVerifier error:', error);
    window.recaptchaVerifier = null;
    return null;
  }
};

// Force-create a fresh reCAPTCHA (used after failures)
const forceNewRecaptcha = async (containerId) => {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch (e) {}
    window.recaptchaVerifier = null;
  }
  
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';

  // Small delay to let DOM settle
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return getOrCreateRecaptcha(containerId);
};

// Send OTP with robust retry
export const sendOTP = async (phoneNumber, isResend = false) => {
  try {
    // Clean phone number
    let cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = '+' + cleanPhone;
      } else {
        cleanPhone = '+91' + cleanPhone;
      }
    }

    console.log(`[Firebase] ${isResend ? 'Resending' : 'Sending'} OTP to:`, cleanPhone);

    // 🆕 FIXED: Clear old confirmation result before new OTP request
    if (isResend && window.confirmationResult) {
      window.confirmationResult = null;
    }

    // For resend, force create a fresh reCAPTCHA (old one is used up)
    let appVerifier;
    if (isResend) {
      appVerifier = await forceNewRecaptcha('recaptcha-container');
    } else {
      appVerifier = await getOrCreateRecaptcha('recaptcha-container');
    }

    if (!appVerifier) {
      return { success: false, error: 'Security check failed. Please refresh the page and try again.' };
    }

    const confirmationResult = await signInWithPhoneNumber(auth, cleanPhone, appVerifier);
    window.confirmationResult = confirmationResult;

    console.log('[Firebase] OTP sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[Firebase] OTP Error:', error.code, error.message);

    // Clean up reCAPTCHA on error so it gets recreated fresh next time
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (e) {}
      window.recaptchaVerifier = null;
    }

    let errorMessage = 'Failed to send OTP. Please try again.';
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many OTP requests. Please wait a few minutes and try again.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'Security verification failed. Please refresh the page.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMessage = 'SMS service limit reached. Please try again later.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.code === 'auth/internal-error') {
      errorMessage = 'Service error. Please refresh the page and try again.';
    }

    return { success: false, error: errorMessage };
  }
};

export const verifyOTP = async (code) => {
  try {
    if (!window.confirmationResult) {
      return { success: false, error: 'No OTP session found. Please request a new OTP.' };
    }

    const result = await window.confirmationResult.confirm(code);
    // Don't clear reCAPTCHA here - keep it for potential resend if user tries another flow
    console.log('[Firebase] OTP verified successfully');
    return { success: true, user: result.user };
  } catch (error) {
    console.error('[Firebase] Verify Error:', error.code, error.message);

    let errorMessage = 'Invalid OTP. Please check and try again.';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Wrong OTP code. Please check and try again.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'OTP has expired. Please click Resend OTP to get a new code.';
    } else if (error.code === 'auth/session-expired') {
      errorMessage = 'Session expired. Please click Resend OTP.';
    }

    return { success: false, error: errorMessage };
  }
};

export const saveUserToFirestore = async (uid, userData, role) => {
  try {
    const collectionName = role === 'lawyer' ? 'lawyers' : 'clients';
    await setDoc(doc(firestore, collectionName, uid), { 
      ...userData, 
      uid, 
      role,
      user_role: role,
      createdAt: new Date().toISOString() 
    });
    return { success: true };
  } catch (error) {
    console.error('[Firebase] Firestore save error:', error);
    return { success: false, error: error.message };
  }
};

export const registerNewClient = async (clientData) => {
  try {
    const docRef = await addDoc(collection(firestore, 'clients'), {
      ...clientData,
      status: 'active',
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Legacy export for backward compatibility
export const setupRecaptcha = (containerId) => {
  getOrCreateRecaptcha(containerId);
  return window.recaptchaVerifier;
};

export default app;