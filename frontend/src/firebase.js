import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

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

// Setup reCAPTCHA verifier
export const setupRecaptcha = (containerId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
  }
  return window.recaptchaVerifier;
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber) => {
  try {
    const appVerifier = setupRecaptcha('recaptcha-container');
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    return { success: true, confirmationResult };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { success: false, error: error.message };
  }
};

// Verify OTP code
export const verifyOTP = async (code) => {
  try {
    if (!window.confirmationResult) {
      throw new Error('No confirmation result found. Please request OTP first.');
    }
    const result = await window.confirmationResult.confirm(code);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: error.message };
  }
};

export default app;
