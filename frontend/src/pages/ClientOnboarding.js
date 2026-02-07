import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// Firebase Logic
import { sendOTP, verifyOTP, firestore } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const ClientOnboarding = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ name: '', mobile: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (formData.mobile.length !== 10) return toast.error('Enter valid 10-digit mobile');
    if (!formData.name.trim()) return toast.error('Enter your name');

    setLoading(true);
    try {
      const result = await sendOTP(`+91${formData.mobile}`);
      if (result.success) {
        toast.success('OTP sent!');
        setStep(2);
      } else {
        toast.error(result.error || 'OTP failed');
      }
    } catch (error) {
      toast.error('Service Error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const verifyResult = await verifyOTP(otp);
      if (!verifyResult.success) {
        toast.error('Invalid OTP');
        setLoading(false);
        return;
      }

      const uid = verifyResult.user.uid;

      // 1. Check if user already exists in Firestore
      const userRef = doc(firestore, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        toast.info('Account exists. Logging you in...');
      } else {
        // 2. Save new client data to Firestore
        await setDoc(userRef, {
          name: formData.name,
          mobile: formData.mobile,
          role: 'client',
          createdAt: serverTimestamp()
        });
        toast.success('Profile Registered!');
      }

      // 3. Complete Login Process
      const token = await verifyResult.user.getIdToken();
      onComplete(token, { id: uid, ...formData, role: 'client' });
      navigate('/dashboard');

    } catch (error) {
      toast.error('Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-12">
      <div id="recaptcha-container"></div>
      <div className="max-w-md mx-auto">
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
              {step === 1 ? 'Enter your details to track cases' : 'Enter the code sent to your phone'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="Lawyer will see this name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+91</span>
                    <Input className="rounded-l-none" placeholder="10-digit number" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})} maxLength={10} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Sending...' : 'Request OTP'}</Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <Input placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} required />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Verifying...' : 'Complete Sign Up'}</Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>Edit Number</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientOnboarding;