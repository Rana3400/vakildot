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

  const [formData, setFormData] = useState({
    mobile: mobile,
    name: ''
  });
  const [loading, setLoading] = useState(false);

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
              Enter your details to access your case information
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
