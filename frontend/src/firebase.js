import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCP_CM8lmBY_X42AyrpbJ8IX29cX0U6sDE",
  authDomain: "vakil-app-auth.firebaseapp.com",
  projectId: "vakil-app-auth",
  storageBucket: "vakil-app-auth.firebasestorage.app",
  messagingSenderId: "792778219182",
  appId: "1:792778219182:web:ed322ca2dd46c23ed0973f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

console.log('Firebase Initialized with config:', firebaseConfig.projectId);

// Clear any stale reCAPTCHA verifier
const clearRecaptcha = () => {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.log('Recaptcha clear error (ignored):', e);
    }
    window.recaptchaVerifier = null;
  }
  // Also clear the DOM element content
  const container = document.getElementById('recaptcha-container');
  if (container) {
    container.innerHTML = '';
  }
};

// Setup reCAPTCHA verifier - creates new instance each time
export const setupRecaptcha = (containerId) => {
  // Always clear previous verifier to avoid stale state
  clearRecaptcha();
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Recaptcha container not found:', containerId);
    throw new Error('Recaptcha container not found');
  }
  
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: (response) => {
      console.log('reCAPTCHA verified successfully');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired, clearing...');
      clearRecaptcha();
    }
  });
  
  return window.recaptchaVerifier;
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber) => {
  try {
    const appVerifier = setupRecaptcha('recaptcha-container');
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    console.log('Sending OTP to:', formattedPhone);
    
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    console.log('OTP sent successfully');
    return { success: true, confirmationResult };
  } catch (error) {
    console.error('Error sending OTP:', error.code, error.message);
    clearRecaptcha(); // Clear on error to allow retry
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later.';
    } else if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format. Please enter a valid 10-digit number.';
    } else if (error.code === 'auth/billing-not-enabled') {
      errorMessage = 'Phone authentication is not enabled. Please contact the administrator to enable Firebase billing.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Phone authentication is not enabled in Firebase Console. Please enable it first.';
    } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      errorMessage = 'Request timed out. Please refresh the page and try again.';
    }
    
    return { success: false, error: errorMessage, code: error.code };
  }
};

// Verify OTP code
export const verifyOTP = async (code) => {
  try {
    if (!window.confirmationResult) {
      throw new Error('No confirmation result found. Please request OTP first.');
    }
    const result = await window.confirmationResult.confirm(code);
    console.log('OTP verified, user:', result.user.uid);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error verifying OTP:', error.code, error.message);
    
    let errorMessage = error.message;
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid OTP. Please check and try again.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'OTP has expired. Please request a new one.';
    }
    
    return { success: false, error: errorMessage, code: error.code };
  }
};

// Save user profile to Firestore
export const saveUserToFirestore = async (uid, userData, role) => {
  try {
    const collection = role === 'lawyer' ? 'lawyers' : 'clients';
    const userRef = doc(firestore, collection, uid);
    await setDoc(userRef, {
      ...userData,
      uid,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`User saved to Firestore ${collection} collection`);
    return { success: true };
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    return { success: false, error: error.message };
  }
};

// Get user profile from Firestore
export const getUserFromFirestore = async (uid) => {
  try {
    // Check lawyers collection first
    const lawyerRef = doc(firestore, 'lawyers', uid);
    const lawyerSnap = await getDoc(lawyerRef);
    if (lawyerSnap.exists()) {
      return { success: true, user: lawyerSnap.data(), role: 'lawyer' };
    }
    
    // Check clients collection
    const clientRef = doc(firestore, 'clients', uid);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      return { success: true, user: clientSnap.data(), role: 'client' };
    }
    
    return { success: false, error: 'User not found in Firestore' };
  } catch (error) {
    console.error('Error getting user from Firestore:', error);
    return { success: false, error: error.message };
  }
};

export default app;
