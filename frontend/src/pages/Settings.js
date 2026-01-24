import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Settings = ({ lawyer }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{lawyer?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{lawyer?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Mobile</p>
            <p className="font-medium">{lawyer?.mobile}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bar Council Number</p>
            <p className="font-medium font-mono">{lawyer?.bar_council_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium">{lawyer?.role?.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Practice Areas</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {lawyer?.practice_areas?.map(area => (
                <span key={area} className="bg-muted px-3 py-1 rounded-sm text-sm">{area}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Courts</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {lawyer?.courts?.map(court => (
                <span key={court} className="bg-muted px-3 py-1 rounded-sm text-sm">{court}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;