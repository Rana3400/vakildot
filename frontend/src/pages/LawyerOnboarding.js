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

const LawyerOnboarding = ({ onComplete }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const mobile = location.state?.mobile || '';

  const [step, setStep] = useState(mobile ? 2 : 1); // Step 1: OTP, Step 2: Registration
  const [mobileNumber, setMobileNumber] = useState(mobile);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState({
    mobile: mobile,
    name: '',
    email: '',
    bar_council_number: '',
    practice_areas: [],
    courts: [],
    role: 'senior_advocate'
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

      // New user - proceed to registration
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
      const response = await axios.post(`${API}/auth/register`, formData);
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
          <p className="text-muted-foreground">Complete your lawyer profile</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lawyer Registration</CardTitle>
            <CardDescription>
              Provide your details to start managing cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="name-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="email-input"
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
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="complete-registration-button">
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

export default LawyerOnboarding;
