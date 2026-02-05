import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

if (typeof window !== 'undefined') {
  auth.settings.appVerificationDisabledForTesting = true; 
}

console.log('Firebase Initialized for VakilDot');

export const setupRecaptcha = (containerId) => {
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

export const sendOTP = async (phoneNumber) => {
  try {
    const appVerifier = setupRecaptcha('recaptcha-container');
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    return { success: true };
  } catch (error) {
    console.error('OTP Error:', error.code);
    return { success: false, error: error.message };
  }
};

export const verifyOTP = async (code) => {
  try {
    if (!window.confirmationResult) {
      return { success: false, error: 'Please request OTP first' };
    }
    const result = await window.confirmationResult.confirm(code);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: 'Invalid OTP' };
  }
};

export const saveUserToFirestore = async (uid, userData, role) => {
  try {
    const collection = role === 'lawyer' ? 'lawyers' : 'clients';
    await setDoc(doc(firestore, collection, uid), { 
      ...userData, 
      uid, 
      role, 
      createdAt: new Date().toISOString() 
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default app;