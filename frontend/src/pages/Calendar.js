import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

const Calendar = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground mt-1">View hearings and court holidays</p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-sm">
        <div className="text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Calendar view coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default Calendar;