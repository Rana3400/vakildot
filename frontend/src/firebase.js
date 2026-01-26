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

// Disable app verification for testing (uses Firebase Test Numbers)
if (typeof window !== 'undefined') {
  auth.settings.appVerificationDisabledForTesting = true;
}

console.log('Firebase Initialized - Test Mode Enabled');

// Setup invisible reCAPTCHA
export const setupRecaptcha = (containerId) => {
  // Clear existing verifier
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {}
    window.recaptchaVerifier = null;
  }
  
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
  
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => console.log('reCAPTCHA solved'),
    'expired-callback': () => {
      window.recaptchaVerifier = null;
    }
  });
  
  return window.recaptchaVerifier;
};

// Send OTP (works with Firebase Test Numbers on Spark plan)
export const sendOTP = async (phoneNumber) => {
  try {
    const appVerifier = setupRecaptcha('recaptcha-container');
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    console.log('Sending OTP to:', formattedPhone);
    
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    console.log('OTP sent successfully');
    return { success: true };
  } catch (error) {
    console.error('OTP Error:', error.code);
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch(e) {}
      window.recaptchaVerifier = null;
    }
    return { success: false, error: error.message };
  }
};

// Verify OTP
export const verifyOTP = async (code) => {
  try {
    if (!window.confirmationResult) {
      return { success: false, error: 'Please request OTP first' };
    }
    const result = await window.confirmationResult.confirm(code);
    console.log('OTP verified:', result.user.uid);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Verify Error:', error.code);
    return { success: false, error: 'Invalid OTP' };
  }
};

// Firestore helpers
export const saveUserToFirestore = async (uid, userData, role) => {
  try {
    const collection = role === 'lawyer' ? 'lawyers' : 'clients';
    await setDoc(doc(firestore, collection, uid), { ...userData, uid, role, createdAt: new Date().toISOString() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserFromFirestore = async (uid) => {
  try {
    const lawyerSnap = await getDoc(doc(firestore, 'lawyers', uid));
    if (lawyerSnap.exists()) return { success: true, user: lawyerSnap.data(), role: 'lawyer' };
    const clientSnap = await getDoc(doc(firestore, 'clients', uid));
    if (clientSnap.exists()) return { success: true, user: clientSnap.data(), role: 'client' };
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default app;
