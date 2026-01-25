import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const { userType } = useParams(); // 'lawyer' or 'client'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentOtp, setSentOtp] = useState('');
  const navigate = useNavigate();

  const isLawyer = userType === 'lawyer';

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      toast.error('Please enter valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/send-otp`, { mobile });
      toast.success('OTP sent successfully!');
      setSentOtp(response.data.otp);
      setOtpSent(true);
      toast.info(`Demo OTP: ${response.data.otp}`);
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
      const response = await axios.post(`${API}/auth/verify-otp`, { mobile, otp });
      
      if (response.data.is_new) {
        // New user - redirect to appropriate onboarding
        if (isLawyer) {
          navigate('/onboarding/lawyer', { state: { mobile } });
        } else {
          navigate('/onboarding/client', { state: { mobile } });
        }
      } else {
        // Existing user - check if role matches
        const user = response.data.user;
        const userRole = user.user_role || 'lawyer'; // default to lawyer for existing users
        
        if (isLawyer && userRole !== 'lawyer') {
          toast.error('This account is registered as a client. Please use Client Case Status option.');
          setOtpSent(false);
          setOtp('');
          return;
        }
        
        if (!isLawyer && userRole === 'lawyer') {
          toast.error('This account is registered as a lawyer. Please use Lawyer Access option.');
          setOtpSent(false);
          setOtp('');
          return;
        }
        
        // Login successful
        onLogin(response.data.token, user);
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Invalid OTP. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
          <p className="text-muted-foreground">
            {isLawyer ? 'Login to your advocate account' : 'Check your case status'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isLawyer ? 'Lawyer Login' : 'Client Login'}</CardTitle>
            <CardDescription>
              Enter your registered mobile number to receive OTP
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
                    data-testid="mobile-input"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="send-otp-button">
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
                    data-testid="otp-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    OTP sent to +91 {mobile}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="verify-otp-button">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                  data-testid="change-number-button"
                >
                  Change Mobile Number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;