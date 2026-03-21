import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { sendOTP, verifyOTP } from '@/firebase';
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
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

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
      const result = await sendOTP(formData.mobile);
      if (result.success) {
        toast.success('OTP sent to your mobile!');
        setStep(2);
        setResendTimer(30);
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Service Error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setOtp('');
    try {
      window.confirmationResult = null;
      const result = await sendOTP(formData.mobile, true); // true = isResend
      if (result.success) {
        toast.success('New OTP sent!');
        setResendTimer(30);
      } else {
        toast.error(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      toast.error('Failed to resend OTP. Please refresh the page.');
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
        const errMsg = verifyResult.error || '';
        if (errMsg.includes('expired') || errMsg.includes('code-expired')) {
          toast.error('OTP expired. Please click Resend OTP.');
        } else {
          toast.error(errMsg || 'Invalid OTP');
        }
        setLoading(false);
        return;
      }

      // Register via backend API (stores in clients collection)
      const response = await axios.post(`${API}/auth/register-client`, {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || ''
      });

      if (response.data.success) {
        toast.success('Account Created Successfully!');
        onComplete(response.data.token, response.data.user);
        navigate('/client-dashboard');
      } else {
        toast.error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      const detail = error.response?.data?.detail || '';
      if (detail.includes('already exists')) {
        toast.error('Account already exists. Please sign in.');
        setTimeout(() => navigate('/signin'), 2000);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-12">
      <div id="recaptcha-container"></div>
      
      <div className="max-w-md mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Scale className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold">VakilDot</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Join as Client</CardTitle>
            <CardDescription>
              {step === 1 ? 'Create your account to connect with lawyers' : 'Verify your mobile number'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" placeholder="Enter your name" value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2 rounded-md">+91</span>
                    <Input id="mobile" type="tel" placeholder="10-digit mobile" value={formData.mobile}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      maxLength={10} required />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input id="email" type="email" placeholder="Your email" value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
                </div>

                <div className="pt-4 border-t mt-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">Security Verification</Label>
                  <SimpleCaptcha onVerify={setCaptchaVerified} />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !captchaVerified}>
                  {loading ? 'Sending OTP...' : 'Sign Up'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP *</Label>
                  <Input id="otp" type="text" placeholder="6-digit OTP" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6} required autoFocus />
                  <p className="text-xs text-muted-foreground">OTP sent to +91 {formData.mobile}</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </Button>

                <Button type="button" variant="outline" className="w-full"
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || loading}
                  data-testid="resend-otp-button"
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </Button>

                <Button type="button" variant="ghost" className="w-full" 
                  onClick={() => { setStep(1); setCaptchaVerified(false); setResendTimer(0); }}>
                  Back to Edit Details
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
