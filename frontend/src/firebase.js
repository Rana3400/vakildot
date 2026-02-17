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

const firebaseConfig = {
  apiKey: "AIzaSyCP_CM8lmBY_X42AyrpbJ8IX29cX0U6sDE",
  authDomain: "vakildot.com", 
  projectId: "vakil-app-auth",
  storageBucket: "vakil-app-auth.firebasestorage.app",
  messagingSenderId: "792778219182",
  appId: "1:792778219182:web:ed322ca2dd46c23ed0973f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

console.log('Firebase Initialized for VakilDot');

// INVISIBLE reCAPTCHA - doesn't interfere with custom captcha
export const setupRecaptcha = (containerId) => {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    } catch (e) {
      window.recaptchaVerifier = null;
    }
  }
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container '${containerId}' not found`);
    return null;
  }
  
  container.innerHTML = '';
  
  try {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible', // INVISIBLE - won't show on screen
      callback: (response) => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
        window.recaptchaVerifier = null;
      }
    });
    
    return window.recaptchaVerifier;
  } catch (error) {
    console.error('RecaptchaVerifier error:', error);
    return null;
  }
};

// Send OTP - with proper phone formatting
export const sendOTP = async (phoneNumber) => {
  try {
    window.confirmationResult = null;
    
    // Clean phone number - remove any non-digit characters except +
    let cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure +91 prefix for Indian numbers
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = '+' + cleanPhone;
      } else if (cleanPhone.length === 10) {
        cleanPhone = '+91' + cleanPhone;
      } else {
        cleanPhone = '+91' + cleanPhone;
      }
    }
    
    console.log('Sending OTP to:', cleanPhone);
    
    const appVerifier = setupRecaptcha('recaptcha-container');
    if (!appVerifier) {
      return { success: false, error: 'reCAPTCHA failed. Please refresh page.' };
    }
    
    // Wait for reCAPTCHA
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const confirmationResult = await signInWithPhoneNumber(auth, cleanPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    
    console.log('OTP sent successfully');
    return { success: true };
  } catch (error) {
    console.error('OTP Error:', error.code, error.message);
    
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (e) {}
      window.recaptchaVerifier = null;
    }
    
    let errorMessage = 'Failed to send OTP. Please try again.';
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Try later.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'Security check failed. Refresh page.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMessage = 'SMS quota exceeded. Try later.';
    }
    
    return { success: false, error: errorMessage };
  }
};

export const verifyOTP = async (code) => {
  try {
    if (!window.confirmationResult) {
      return { success: false, error: 'Please request OTP first' };
    }
    
    const result = await window.confirmationResult.confirm(code);
    
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (e) {}
      window.recaptchaVerifier = null;
    }
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Verify Error:', error.code);
    
    let errorMessage = 'Invalid OTP';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Wrong OTP code';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'OTP expired. Request new one.';
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
    console.error('Firestore error:', error);
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

export default app;
