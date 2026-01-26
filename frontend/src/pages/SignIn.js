import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { sendOTP, verifyOTP, getUserFromFirestore } from '@/firebase';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignIn = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
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
        toast.error(verifyResult.error || 'Invalid OTP');
        setLoading(false);
        return;
      }

      // Check if user exists in MongoDB (primary data source for cases)
      const response = await axios.post(`${API}/auth/signin`, { mobile });
      
      if (!response.data.success) {
        toast.error('Account not found. Please sign up first.');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      // Login successful
      onLogin(response.data.token, response.data.user);
      toast.success(`Welcome back, ${response.data.user.name}!`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please try again.');
      console.error(error);
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
            <span className="text-3xl font-bold font-serif text-primary">VakilDesk</span>
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
                <Button type="submit" className="w-full" disabled={loading} data-testid="send-signin-otp-button">
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
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
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
