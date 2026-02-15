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

// ✅ IMPROVED: Better reCAPTCHA handling
export const setupRecaptcha = (containerId) => {
  // Clean up previous verifier completely
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    } catch (e) {
      console.log('Error clearing previous recaptcha:', e);
      window.recaptchaVerifier = null;
    }
  }
  
  // Ensure container exists and is empty
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id '${containerId}' not found`);
    return null;
  }
  
  // Clear any existing content
  container.innerHTML = '';
  
  try {
    // Create new RecaptchaVerifier with visible mode for better reliability
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'normal', // Changed from 'invisible' to 'normal' for better reliability
      callback: (response) => {
        console.log('reCAPTCHA verified successfully');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired, please refresh');
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (e) {}
          window.recaptchaVerifier = null;
        }
      },
      'error-callback': (error) => {
        console.error('reCAPTCHA error:', error);
      }
    });
    
    // Render the reCAPTCHA widget
    window.recaptchaVerifier.render().then((widgetId) => {
      window.recaptchaWidgetId = widgetId;
      console.log('reCAPTCHA rendered with widget ID:', widgetId);
    }).catch((error) => {
      console.error('Error rendering reCAPTCHA:', error);
    });
    
    return window.recaptchaVerifier;
  } catch (error) {
    console.error('Error creating RecaptchaVerifier:', error);
    return null;
  }
};

// ✅ IMPROVED: Better OTP sending with retry logic
export const sendOTP = async (phoneNumber) => {
  try {
    // Clear any previous confirmation result
    window.confirmationResult = null;
    
    const appVerifier = setupRecaptcha('recaptcha-container');
    
    if (!appVerifier) {
      return { success: false, error: 'reCAPTCHA initialization failed. Please refresh the page.' };
    }
    
    // Wait a bit for reCAPTCHA to fully render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    
    console.log('Attempting to send OTP to:', formattedPhone);
    
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    window.confirmationResult = confirmationResult;
    
    console.log('OTP sent successfully!');
    return { success: true };
  } catch (error) {
    console.error('OTP Send Error:', error.code, error.message);
    
    // Clean up on error
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    
    // User-friendly error messages
    let errorMessage = 'Failed to send OTP. Please try again.';
    
    if (error.code === 'auth/invalid-phone-number') {
      errorMessage = 'Invalid phone number format.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try after some time.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMessage = 'reCAPTCHA verification failed. Please refresh and try again.';
    }
    
    return { success: false, error: errorMessage };
  }
};

export const verifyOTP = async (code) => {
  try {
    if (!window.confirmationResult) {
      return { success: false, error: 'Please request OTP first' };
    }
    
    console.log('Verifying OTP...');
    const result = await window.confirmationResult.confirm(code);
    
    // Clean up after successful verification
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    
    console.log('OTP verified successfully!');
    return { success: true, user: result.user };
  } catch (error) {
    console.error('OTP verification error:', error.code, error.message);
    
    let errorMessage = 'Invalid OTP. Please try again.';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid OTP code.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'OTP expired. Please request a new one.';
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
      createdAt: new Date().toISOString() 
    });
    return { success: true };
  } catch (error) {
    console.error('Firestore save error:', error);
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
    console.error("Firebase Error:", error.message);
    return { success: false, error: error.message };
  }
};

export default app;s