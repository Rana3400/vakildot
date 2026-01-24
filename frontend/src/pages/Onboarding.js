import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Onboarding = ({ onComplete }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const mobile = location.state?.mobile || '';

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

  const practiceAreaOptions = [
    'Criminal Law', 'Civil Law', 'Constitutional Law', 'Family Law', 
    'Corporate Law', 'Tax Law', 'Labour Law', 'Property Law', 'Consumer Law'
  ];

  const courtOptions = [
    'Supreme Court of India', 'Delhi High Court', 'Bombay High Court', 
    'Madras High Court', 'Calcutta High Court', 'District Court'
  ];

  const [selectedPracticeArea, setSelectedPracticeArea] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');

  const handleAddPracticeArea = () => {
    if (selectedPracticeArea && !formData.practice_areas.includes(selectedPracticeArea)) {
      setFormData(prev => ({
        ...prev,
        practice_areas: [...prev.practice_areas, selectedPracticeArea]
      }));
      setSelectedPracticeArea('');
    }
  };

  const handleAddCourt = () => {
    if (selectedCourt && !formData.courts.includes(selectedCourt)) {
      setFormData(prev => ({
        ...prev,
        courts: [...prev.courts, selectedCourt]
      }));
      setSelectedCourt('');
    }
  };

  const handleRemovePracticeArea = (area) => {
    setFormData(prev => ({
      ...prev,
      practice_areas: prev.practice_areas.filter(a => a !== area)
    }));
  };

  const handleRemoveCourt = (court) => {
    setFormData(prev => ({
      ...prev,
      courts: prev.courts.filter(c => c !== court)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.practice_areas.length === 0) {
      toast.error('Please add at least one practice area');
      return;
    }

    if (formData.courts.length === 0) {
      toast.error('Please add at least one court');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      toast.success('Registration successful!');
      onComplete(response.data.token, response.data.lawyer);
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
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scale className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold font-serif text-primary">VakilDesk</span>
          </div>
          <p className="text-muted-foreground">Complete your profile to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Advocate Profile</CardTitle>
            <CardDescription>
              Provide your professional details for verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <Label htmlFor="bar-council">Bar Council Enrollment Number *</Label>
                <Input
                  id="bar-council"
                  type="text"
                  placeholder="e.g., D/1234/2020"
                  value={formData.bar_council_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, bar_council_number: e.target.value }))}
                  data-testid="bar-council-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger data-testid="role-select">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="senior_advocate">Senior Advocate</SelectItem>
                    <SelectItem value="junior_advocate">Junior Advocate</SelectItem>
                    <SelectItem value="clerk">Clerk / Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Practice Areas *</Label>
                <div className="flex gap-2">
                  <Select value={selectedPracticeArea} onValueChange={setSelectedPracticeArea}>
                    <SelectTrigger data-testid="practice-area-select">
                      <SelectValue placeholder="Select practice area" />
                    </SelectTrigger>
                    <SelectContent>
                      {practiceAreaOptions.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddPracticeArea} data-testid="add-practice-area-button">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.practice_areas.map(area => (
                    <span key={area} className="bg-muted px-3 py-1 rounded-sm text-sm flex items-center gap-2">
                      {area}
                      <button type="button" onClick={() => handleRemovePracticeArea(area)} className="text-destructive">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Courts *</Label>
                <div className="flex gap-2">
                  <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                    <SelectTrigger data-testid="court-select">
                      <SelectValue placeholder="Select court" />
                    </SelectTrigger>
                    <SelectContent>
                      {courtOptions.map(court => (
                        <SelectItem key={court} value={court}>{court}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddCourt} data-testid="add-court-button">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.courts.map(court => (
                    <span key={court} className="bg-muted px-3 py-1 rounded-sm text-sm flex items-center gap-2">
                      {court}
                      <button type="button" onClick={() => handleRemoveCourt(court)} className="text-destructive">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="complete-registration-button">
                {loading ? 'Registering...' : 'Complete Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;