import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold font-serif text-foreground mb-3">VakilDesk</h1>
          <p className="text-xl text-muted-foreground">The Digital Munshi for Indian Advocates</p>
        </div>

        {/* Two Access Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Lawyer Access */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-primary"
            onClick={() => navigate('/login/lawyer')}
            data-testid="lawyer-access-card"
          >
            <CardContent className="pt-12 pb-12 text-center">
              <div className="h-20 w-20 bg-primary text-primary-foreground rounded-sm flex items-center justify-center mx-auto mb-6">
                <UserCheck className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold font-serif text-foreground mb-3">Lawyer Access</h2>
              <p className="text-muted-foreground mb-6">
                Full case management, client tracking, and billing for advocates and law firms
              </p>
              <Button size="lg" className="w-full" data-testid="lawyer-access-button">
                Login as Lawyer
              </Button>
            </CardContent>
          </Card>

          {/* Client Case Status */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-primary"
            onClick={() => navigate('/login/client')}
            data-testid="client-access-card"
          >
            <CardContent className="pt-12 pb-12 text-center">
              <div className="h-20 w-20 bg-tarikh-upcoming text-white rounded-sm flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold font-serif text-foreground mb-3">Client Case Status</h2>
              <p className="text-muted-foreground mb-6">
                View your case details, hearing dates, and track your legal matters
              </p>
              <Button size="lg" variant="outline" className="w-full" data-testid="client-access-button">
                Check My Cases
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Trusted by advocates across District Courts, High Courts, and Supreme Court of India
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
