import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('vakildot_token');

  useEffect(() => { fetchHearings(); }, []);

  const fetchHearings = async () => {
    try {
      const response = await axios.get(`${API}/calendar/hearings`, { headers: { Authorization: `Bearer ${token}` } });
      setHearings(response.data);
    } catch (error) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getHearingsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return hearings.filter(h => h.date === dateStr);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading calendar...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Legal Calendar</h1>
        <p className="text-muted-foreground mt-1">Court hearings and important dates</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-xl">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 p-1"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayHearings = getHearingsForDay(day);
              return (
                <div key={day} className={`h-24 p-1 border rounded ${isToday(day) ? 'bg-primary/10 border-primary' : 'border-border'}`}>
                  <div className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>{day}</div>
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayHearings.slice(0, 2).map((h, idx) => (
                      <div key={idx} className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded truncate" title={h.title}>
                        {h.time} - {h.title}
                      </div>
                    ))}
                    {dayHearings.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayHearings.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upcoming Hearings</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {hearings.filter(h => new Date(h.date) >= new Date()).slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div>
                  <p className="font-medium">{h.title}</p>
                  <p className="text-sm text-muted-foreground">{h.court}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-orange-600">{h.date}</p>
                  <p className="text-sm text-muted-foreground">{h.time}</p>
                </div>
              </div>
            ))}
            {hearings.length === 0 && <p className="text-center text-muted-foreground py-4">No upcoming hearings</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;
