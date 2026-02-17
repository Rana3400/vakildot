import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { sendOTP, verifyOTP, firestore } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import SimpleCaptcha from '@/components/SimpleCaptcha';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientOnboarding = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ name: '', mobile: '', email: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      toast.error('Please verify the captcha first');
      return;
    }
    
    if (formData.mobile.length !== 10) {
      toast.error('Enter valid 10-digit mobile');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Enter your name');
      return;
    }

    setLoading(true);
    try {
      // Send OTP with just the 10-digit number (firebase.js will format it)
      const result = await sendOTP(formData.mobile);
      if (result.success) {
        toast.success('OTP sent to your mobile!');
        setStep(2);
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Service Error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);

    try {
      const verifyResult = await verifyOTP(otp);
      if (!verifyResult.success) {
        toast.error(verifyResult.error || 'Invalid OTP');
        setLoading(false);
        return;
      }

      const uid = verifyResult.user.uid;
      
      // Save to Firestore
      const userRef = doc(firestore, 'users', uid);
      await setDoc(userRef, {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || '',
        user_role: 'client',
        role: 'client',
        createdAt: serverTimestamp()
      });

      // Also save to lawyers collection (for unified user management)
      const lawyerRef = doc(firestore, 'lawyers', uid);
      await setDoc(lawyerRef, {
        id: uid,
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || '',
        user_role: 'client',
        role: 'client',
        createdAt: new Date().toISOString()
      });

      toast.success('Account Created Successfully!');

      const token = await verifyResult.user.getIdToken();
      const userData = { 
        id: uid, 
        name: formData.name, 
        mobile: formData.mobile,
        email: formData.email,
        user_role: 'client',
        role: 'client' 
      };
      
      onComplete(token, userData);
      navigate('/client-dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-12">
      {/* Hidden reCAPTCHA container for Firebase */}
      <div id="recaptcha-container"></div>
      
      <div className="max-w-md mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold text-primary">VakilDot</span>
          </div>
          <p className="text-muted-foreground text-sm">Client Portal Registration</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{step === 1 ? 'Client Sign Up' : 'Verify OTP'}</CardTitle>
            <CardDescription>
              {step === 1 ? 'Enter your details to track your cases' : 'Enter the code sent to your phone'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input 
                    placeholder="Your full name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input 
                    type="email"
                    placeholder="your@email.com" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Mobile Number *</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+91</span>
                    <Input 
                      className="rounded-l-none" 
                      placeholder="10-digit number" 
                      value={formData.mobile} 
                      onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
                      maxLength={10} 
                      required 
                    />
                  </div>
                </div>

                {/* Alphanumeric Captcha at Footer */}
                <div className="pt-4 border-t mt-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">Security Verification</Label>
                  <SimpleCaptcha onVerify={setCaptchaVerified} />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !captchaVerified}>
                  {loading ? 'Sending OTP...' : 'Request OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter OTP</Label>
                  <Input 
                    placeholder="6-digit code" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    maxLength={6} 
                    required 
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">OTP sent to +91 {formData.mobile}</p>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Complete Sign Up'}
                </Button>
                
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep(1); setCaptchaVerified(false); }}>
                  Edit Number
                </Button>
              </form>
            )}

            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button onClick={() => navigate('/signin')} className="text-primary hover:underline font-medium">
                  Login here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientOnboarding;
