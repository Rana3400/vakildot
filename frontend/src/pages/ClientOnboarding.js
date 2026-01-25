import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientOnboarding = ({ onComplete }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const mobile = location.state?.mobile || '';

  const [step, setStep] = useState(mobile ? 2 : 1);
  const [mobileNumber, setMobileNumber] = useState(mobile);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState({
    mobile: mobile,
    name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (mobileNumber.length !== 10) {
      toast.error('Please enter valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/send-otp`, { mobile: mobileNumber });
      toast.success('OTP sent successfully!');
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
      const response = await axios.post(`${API}/auth/verify-otp`, { mobile: mobileNumber, otp });
      
      if (!response.data.is_new) {
        toast.error('Account already exists. Please sign in instead.');
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      setFormData(prev => ({ ...prev, mobile: mobileNumber }));
      setStep(2);
      toast.success('Phone verified! Complete your profile.');
    } catch (error) {
      toast.error('Invalid OTP. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register-client`, formData);
      toast.success('Registration successful!');
      onComplete(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Registration failed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scale className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold font-serif text-primary">VakilDesk</span>
          </div>
          <p className="text-muted-foreground">Complete your profile to track your cases</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Registration</CardTitle>
            <CardDescription>
              {step === 1 ? 'Verify your phone number' : 'Complete your profile'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              !otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number *</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      data-testid="client-mobile-input"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP *</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      required
                    />
                    <p className="text-xs text-muted-foreground">OTP sent to +91 {mobileNumber}</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
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
                  >
                    Change Number
                  </Button>
                </form>
              )
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="client-name-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="text"
                  value={mobile}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  This number will be used to show your cases
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="complete-client-registration-button">
                {loading ? 'Registering...' : 'Complete Registration'}
              </Button>
            </form>

            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/signin')}
                  className="text-primary hover:underline font-medium"
                  data-testid="goto-signin-link"
                >
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
