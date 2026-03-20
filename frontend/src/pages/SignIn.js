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

const SignIn = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      toast.error('Please verify the captcha first');
      return;
    }
    
    if (mobile.length !== 10) {
      toast.error('Please enter valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(mobile);
      if (result.success) {
        toast.success('OTP sent to your mobile number!');
        setOtpSent(true);
        setResendTimer(30);
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setOtp('');
    try {
      // Reset recaptcha for resend
      window.confirmationResult = null;
      const result = await sendOTP(mobile);
      if (result.success) {
        toast.success('New OTP sent!');
        setResendTimer(30);
      } else {
        toast.error(result.error || 'Failed to resend OTP');
      }
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const verifyResult = await verifyOTP(otp);
      if (!verifyResult.success) {
        const errMsg = verifyResult.error || '';
        if (errMsg.includes('expired') || errMsg.includes('code-expired')) {
          toast.error('OTP expired. Please click Resend OTP.');
        } else if (errMsg.includes('invalid') || errMsg.includes('code') || errMsg.includes('Wrong')) {
          toast.error('Invalid OTP. Please check and try again.');
        } else {
          toast.error(errMsg || 'OTP verification failed');
        }
        setLoading(false);
        return;
      }

      console.log('[SignIn] OTP verified, calling signin API for mobile:', mobile);
      const response = await axios.post(`${API}/auth/signin`, { mobile });
      console.log('[SignIn] API response:', response.data);
      
      if (!response.data.success) {
        toast.error('Account not found. Please sign up first.');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      onLogin(response.data.token, response.data.user);
      toast.success(`Welcome back, ${response.data.user.name}!`);
      const role = response.data.user.user_role || response.data.user.role;
      navigate(role === 'client' ? '/client-dashboard' : '/lawyer-dashboard');
    } catch (error) {
      console.error('[SignIn] Error:', error);
      const errDetail = error.response?.data?.detail || error.message || '';
      if (errDetail.includes('expired')) {
        toast.error('OTP expired. Please click Resend OTP.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div id="recaptcha-container"></div>
      
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
            data-testid="back-to-welcome-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scale className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold font-serif text-primary">VakilDot</span>
          </div>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              {otpSent ? 'Enter the OTP sent to your mobile' : 'Enter your registered mobile number'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    data-testid="signin-mobile-input"
                    required
                  />
                </div>

                {/* Captcha at Footer */}
                <div className="pt-4 border-t">
                  <Label className="text-sm text-muted-foreground mb-2 block">Security Check</Label>
                  <SimpleCaptcha onVerify={setCaptchaVerified} />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !captchaVerified} 
                  data-testid="send-signin-otp-button"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    data-testid="signin-otp-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    OTP sent to +91 {mobile}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="verify-signin-otp-button">
                  {loading ? 'Verifying...' : 'Sign In'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || loading}
                  data-testid="resend-otp-button"
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setCaptchaVerified(false);
                    setResendTimer(0);
                  }}
                  data-testid="change-signin-number-button"
                >
                  Change Mobile Number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:underline font-medium"
              data-testid="goto-signup-link"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
