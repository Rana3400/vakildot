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
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // Step 1: Form, Step 2: OTP
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    bar_council_number: '',
    practice_areas: [],
    courts: [],
    role: 'senior_advocate'
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.mobile.length !== 10) {
      toast.error('Please enter valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/send-otp`, { mobile: formData.mobile });
      toast.success('OTP sent successfully!');
      toast.info(`Demo OTP: ${response.data.otp}`);
      setStep(2);
    } catch (error) {
      toast.error('Failed to send OTP');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // First verify OTP
      const verifyResponse = await axios.post(`${API}/auth/verify-otp`, { 
        mobile: formData.mobile, 
        otp 
      });
      
      if (!verifyResponse.data.is_new) {
        toast.error('Account already exists. Please sign in instead.');
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      // Then register
      const response = await axios.post(`${API}/auth/register`, formData);
      toast.success('Registration successful!');
      onComplete(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
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
            <CardTitle>Lawyer Sign Up</CardTitle>
            <CardDescription>
              {step === 1 ? 'Create your lawyer account' : 'Verify your phone number'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="lawyer-name-input"
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
                    data-testid="lawyer-email-input"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={formData.mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    maxLength={10}
                    data-testid="lawyer-mobile-input"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="lawyer-signup-submit">
                  {loading ? 'Sending OTP...' : 'Sign Up'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP *</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    data-testid="lawyer-otp-input"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">OTP sent to +91 {formData.mobile}</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="lawyer-verify-button">
                  {loading ? 'Verifying...' : 'Verify & Complete Registration'}
                </Button>

                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setStep(1)}
                  data-testid="lawyer-back-button"
                >
                  Back to Edit Details
                </Button>
              </form>
            )}

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
