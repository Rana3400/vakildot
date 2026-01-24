import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Briefcase, Bell, IndianRupee, Calendar, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Landing = () => {
  const features = [
    {
      icon: Briefcase,
      title: 'Complete Case Management',
      description: 'Track unlimited cases with FIR numbers, court details, judge names, and hearing dates (tarikh) in one place.'
    },
    {
      icon: Bell,
      title: 'Smart Tarikh Reminders',
      description: 'Automated SMS, voice call, and WhatsApp reminders to clients 3 days before, 1 day before, and on hearing day.'
    },
    {
      icon: IndianRupee,
      title: 'Billing & Invoicing',
      description: 'Generate professional invoices, track payments, and manage law firm accounting effortlessly.'
    },
    {
      icon: Calendar,
      title: 'Legal Calendar',
      description: 'View all hearings at a glance with automatic blocking of national and state court holidays.'
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Upload and organize petitions, affidavits, evidence, and judgments by case with secure cloud storage.'
    },
    {
      icon: CheckCircle2,
      title: 'Bar Council Verified',
      description: 'Secure platform with Bar Council enrollment verification for authentic legal professionals only.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-serif text-primary">VakilDesk</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" data-testid="header-login-button">Login</Button>
            </Link>
            <Link to="/login">
              <Button data-testid="header-signup-button">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <img 
            src="https://images.pexels.com/photos/17843099/pexels-photo-17843099.jpeg" 
            alt="" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              The Digital Munshi for Indian Advocates
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Complete case management, client tracking, automated hearing reminders, billing, and document storage. 
              Zero missed court dates. Professional workflow for modern law practices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto" data-testid="hero-get-started-button">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Watch Demo
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Trusted by advocates across District Courts, High Courts, and Supreme Court
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything Your Law Practice Needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built specifically for Indian legal professionals. From case filing to final judgment, manage every aspect digitally.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="bg-card p-8 rounded-sm border border-border hover:shadow-lg transition-shadow"
                  data-testid={`feature-${index}`}
                >
                  <div className="h-12 w-12 bg-primary text-primary-foreground rounded-sm flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="bg-primary text-primary-foreground p-12 rounded-sm">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Secure & Compliant
              </h2>
              <p className="text-lg mb-8 opacity-90">
                Bar Council enrollment verification, DPDP Act 2023 compliant, encrypted data storage on India servers. 
                Your clients' confidentiality is our priority.
              </p>
              <Link to="/login">
                <Button size="lg" variant="secondary" data-testid="trust-cta-button">
                  Join Thousands of Advocates
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              <span className="font-bold font-serif text-primary">VakilDesk</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 VakilDesk. Built for Indian Legal Professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;