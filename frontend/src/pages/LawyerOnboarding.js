import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scale, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { toast } from 'sonner';
import { sendOTP, verifyOTP, saveUserToFirestore } from '@/firebase';
import SimpleCaptcha from '@/components/SimpleCaptcha';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PRACTICE_FIELDS = [
  'Criminal Law', 'Civil Law', 'Constitutional Law', 'Corporate Law', 'Family Law',
  'Property Law', 'Tax Law', 'Labour Law', 'Intellectual Property', 'Banking & Finance',
  'Environmental Law', 'Cyber Law', 'Consumer Protection', 'Immigration Law', 'Human Rights'
];

const LawyerOnboarding = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', mobile: '', practice_field: '', state: '', court: '',
    lawyer_type: '', chamber_number: '', bar_council_number: '',
    practice_areas: [], courts: [], role: 'senior_advocate'
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [states, setStates] = useState([]);
  const [courtGroups, setCourtGroups] = useState({});
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    axios.get(`${API}/live/filters/states`).then(res => setStates(res.data.states || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleStateChange = async (state) => {
    setFormData(prev => ({ ...prev, state, court: '' }));
    try {
      const res = await axios.get(`${API}/live/filters/courts/${encodeURIComponent(state)}`);
      setCourtGroups(res.data.grouped || {});
    } catch {
      setCourtGroups({});
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      toast.error('Please verify the captcha first');
      return;
    }
    
    if (formData.mobile.length !== 10) {
      toast.error('Please enter valid 10-digit mobile number');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!formData.practice_field) {
      toast.error('Please select your practice field');
      return;
    }
    if (!formData.court) {
      toast.error('Please select your court');
      return;
    }
    if (!formData.lawyer_type) {
      toast.error('Please select Advocate or Practitioner');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(formData.mobile);
      if (result.success) {
        toast.success('OTP sent to your mobile number!');
        setStep(2);
        setResendTimer(30);
      } else {
        toast.error(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send OTP');
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

      const firebaseUser = verifyResult.user;
      const checkResponse = await axios.post(`${API}/auth/check-existing`, { mobile: formData.mobile });
      
      if (checkResponse.data.exists) {
        toast.error('Account already exists. Please sign in instead.');
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      await saveUserToFirestore(firebaseUser.uid, {
        name: formData.name, email: formData.email, phone: formData.mobile,
        practice_field: formData.practice_field, court: formData.court,
        lawyer_type: formData.lawyer_type, chamber_number: formData.chamber_number
      }, 'lawyer');

      const response = await axios.post(`${API}/auth/register`, {
        ...formData, practice_areas: [formData.practice_field], courts: [formData.court]
      });
      
      toast.success('Registration successful!');
      onComplete(response.data.token, response.data.user);
      navigate('/lawyer-dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div id="recaptcha-container"></div>
      
      <div className="max-w-md mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Scale className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-serif text-primary">VakilDot</span>
          </div>
          <p className="text-muted-foreground text-sm">Complete your lawyer profile</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Lawyer Sign Up</CardTitle>
            <CardDescription>
              {step === 1 ? 'Create your lawyer account' : 'Verify your phone number'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" placeholder="Enter your full name" value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <Input id="mobile" type="tel" placeholder="10-digit mobile number" value={formData.mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    maxLength={10} required />
                </div>

                <div className="space-y-1">
                  <Label>Practice Field *</Label>
                  <Select value={formData.practice_field} onValueChange={(value) => setFormData(prev => ({ ...prev, practice_field: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select your practice field" /></SelectTrigger>
                    <SelectContent>
                      {PRACTICE_FIELDS.map(field => <SelectItem key={field} value={field}>{field}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>State / UT *</Label>
                  <Select value={formData.state} onValueChange={handleStateChange}>
                    <SelectTrigger><SelectValue placeholder="Select your state" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="National">National (Supreme Court / Tribunals)</SelectItem>
                      {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Court *</Label>
                  <Select value={formData.court} onValueChange={(value) => setFormData(prev => ({ ...prev, court: value }))} disabled={!formData.state}>
                    <SelectTrigger><SelectValue placeholder={formData.state ? "Select your court" : "Select state first"} /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(courtGroups).map(([group, courts]) => (
                        <SelectGroup key={group}>
                          <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{group}</SelectLabel>
                          {courts.map(court => <SelectItem key={court} value={court}>{court}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Type *</Label>
                  <Select value={formData.lawyer_type} onValueChange={(value) => setFormData(prev => ({ ...prev, lawyer_type: value }))}>
                    <SelectTrigger><SelectValue placeholder="Advocate or Practitioner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Advocate">Advocate</SelectItem>
                      <SelectItem value="Practitioner">Practitioner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="chamber">Chamber Number</Label>
                  <Input id="chamber" placeholder="Enter your chamber number" value={formData.chamber_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, chamber_number: e.target.value }))} />
                </div>

                {/* Captcha at Footer */}
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
                  {loading ? 'Verifying...' : 'Verify & Complete Registration'}
                </Button>

                <Button type="button" variant="outline" className="w-full" 
                  onClick={async () => {
                    if (resendTimer > 0) return;
                    setOtp('');
                    setLoading(true);
                    window.confirmationResult = null;
                    const result = await sendOTP(formData.mobile);
                    if (result.success) { toast.success('New OTP sent!'); setResendTimer(30); }
                    else { toast.error(result.error || 'Failed to resend OTP'); }
                    setLoading(false);
                  }}
                  disabled={resendTimer > 0 || loading}
                  data-testid="resend-otp-button"
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </Button>

                <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep(1); setCaptchaVerified(false); setResendTimer(0); }}>
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

export default LawyerOnboarding;
