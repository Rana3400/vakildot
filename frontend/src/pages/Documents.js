import React from 'react';
import { FileText } from 'lucide-react';

const Documents = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground mt-1">Manage case documents and files</p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-sm">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Document management coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default Documents;