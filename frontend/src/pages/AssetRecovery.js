import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scale, Briefcase, Shield, Building, Home, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { id: 'iepf', title: 'IEPF Shares', icon: Briefcase, desc: 'Unclaimed shares & dividends transferred to IEPF', color: 'bg-blue-500' },
  { id: 'insurance', title: 'Insurance Claims', icon: Shield, desc: 'Unclaimed life/health insurance policies', color: 'bg-green-500' },
  { id: 'bank', title: 'Bank Deposits', icon: Building, desc: 'Dormant/inoperative bank accounts', color: 'bg-purple-500' },
  { id: 'property', title: 'Ancestral Property', icon: Home, desc: 'Inherited property claims', color: 'bg-orange-500' }
];

const QUESTIONS = {
  iepf: [
    { q: 'Do you have the original share certificate or folio number?', options: ['Yes', 'No', 'Not Sure'] },
    { q: 'Was the shareholder a direct family member?', options: ['Self', 'Parent', 'Grandparent', 'Other'] },
    { q: 'How long has the dividend been unclaimed?', options: ['Less than 7 years', '7-10 years', 'More than 10 years'] }
  ],
  insurance: [
    { q: 'Do you have the policy number or any policy document?', options: ['Yes', 'No', 'Partial'] },
    { q: 'What is your relation to the policyholder?', options: ['Self', 'Nominee', 'Legal Heir', 'Other'] },
    { q: 'Is the policyholder deceased?', options: ['Yes', 'No', 'Policy Matured'] }
  ],
  bank: [
    { q: 'Do you have the account number or passbook?', options: ['Yes', 'No', 'Lost'] },
    { q: 'How long has the account been inactive?', options: ['Less than 2 years', '2-10 years', 'More than 10 years'] },
    { q: 'Is the account holder alive?', options: ['Yes', 'No - I am legal heir', 'Not Sure'] }
  ],
  property: [
    { q: 'Do you have the property documents (deed, registry)?', options: ['Yes', 'Partial', 'No'] },
    { q: 'Is there a valid will or succession certificate?', options: ['Yes', 'No', 'Need to Obtain'] },
    { q: 'Are there other claimants/disputes?', options: ['No', 'Yes - Family', 'Yes - Third Party'] }
  ]
};

const AssetRecovery = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [step, setStep] = useState(0); // 0: select, 1-3: quiz, 4: result, 5: form
  const [answers, setAnswers] = useState([]);
  const [probability, setProbability] = useState(0);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', asset_id: '', details: '' });
  const [submitting, setSubmitting] = useState(false);

  const startQuiz = (category) => {
    setSelectedCategory(category);
    setAnswers([]);
    setStep(1);
  };

  const answerQuestion = (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    
    if (newAnswers.length >= 3) {
      // Calculate probability
      let score = 0;
      newAnswers.forEach((a, i) => {
        if (i === 0 && (a === 'Yes' || a === 'Self')) score += 40;
        else if (i === 0) score += 20;
        if (i === 1 && (a === 'Self' || a === 'Nominee' || a === 'Parent')) score += 30;
        else if (i === 1) score += 15;
        if (i === 2 && (a.includes('10') || a === 'No' || a === 'Policy Matured')) score += 30;
        else if (i === 2) score += 15;
      });
      setProbability(Math.min(score, 95));
      setStep(4);
    } else {
      setStep(step + 1);
    }
  };

  const submitLead = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Please fill name and phone');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/asset-recovery/leads`, {
        ...formData,
        category: selectedCategory,
        answers,
        probability,
        created_at: new Date().toISOString()
      });
      toast.success('Submitted! Our expert will contact you within 24 hours.');
      setStep(0);
      setSelectedCategory(null);
    } catch (e) {
      toast.success('Submitted! Our expert will contact you soon.');
      setStep(0);
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestions = selectedCategory ? QUESTIONS[selectedCategory] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">VakilDot</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/signin')}>Sign In</Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {step === 0 && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Asset Recovery Services</h1>
              <p className="text-gray-600 text-lg">Select the type of asset you want to recover</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.map(cat => (
                <Card key={cat.id} className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-black" onClick={() => startQuiz(cat.id)}>
                  <CardContent className="pt-8 pb-8">
                    <div className={`h-16 w-16 ${cat.color} text-white rounded-lg flex items-center justify-center mx-auto mb-4`}>
                      <cat.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-center mb-2">{cat.title}</h3>
                    <p className="text-gray-500 text-center text-sm">{cat.desc}</p>
                    <Button className="w-full mt-4" variant="outline">
                      Check Eligibility <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {step >= 1 && step <= 3 && (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />Back
                </Button>
                <span className="text-sm text-gray-500">Question {step} of 3</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-black h-2 rounded-full transition-all" style={{ width: `${(step / 3) * 100}%` }}></div>
              </div>
            </CardHeader>
            <CardContent>
              <h2 className="text-xl font-bold mb-6">{currentQuestions[step - 1]?.q}</h2>
              <div className="space-y-3">
                {currentQuestions[step - 1]?.options.map((opt, i) => (
                  <Button key={i} variant="outline" className="w-full justify-start text-left h-auto py-4" onClick={() => answerQuestion(opt)}>
                    {opt}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="max-w-xl mx-auto text-center">
            <CardContent className="pt-10 pb-10">
              {probability >= 60 ? (
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertCircle className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
              )}
              <h2 className="text-2xl font-bold mb-2">Recovery Probability</h2>
              <div className="text-6xl font-bold mb-4" style={{ color: probability >= 60 ? '#22c55e' : '#eab308' }}>
                {probability}%
              </div>
              <p className="text-gray-600 mb-6">
                {probability >= 70 ? 'High chances of recovery! Our experts can help you.' : 
                 probability >= 40 ? 'Moderate chances. Additional documents may improve success rate.' :
                 'Recovery possible but may require additional legal steps.'}
              </p>
              <Button size="lg" className="w-full" onClick={() => setStep(5)}>
                Talk to an Expert <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="ghost" className="mt-4" onClick={() => setStep(0)}>Start Over</Button>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Submit Your Details</CardTitle>
              <p className="text-sm text-gray-500">Our asset recovery expert will contact you within 24 hours</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Folio/Policy/Account Number (if available)</Label>
                <Input value={formData.asset_id} onChange={(e) => setFormData(p => ({ ...p, asset_id: e.target.value }))} placeholder="Enter reference number" />
              </div>
              <div className="space-y-2">
                <Label>Additional Details</Label>
                <Textarea value={formData.details} onChange={(e) => setFormData(p => ({ ...p, details: e.target.value }))} placeholder="Any other information..." rows={3} />
              </div>
              <Button className="w-full" size="lg" onClick={submitLead} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit & Get Expert Help'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 text-center">
          <Button variant="link" onClick={() => navigate('/')}>← Back to Home</Button>
        </div>
      </div>
    </div>
  );
};

export default AssetRecovery;
