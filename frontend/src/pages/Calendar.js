import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hearings, setHearings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [reminderForm, setReminderForm] = useState({ title: '', date: '', time: '10:00', notes: '' });
  const token = localStorage.getItem('vakildot_token');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [hearingsRes, remindersRes] = await Promise.all([
        axios.get(`${API}/calendar/hearings`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/calendar/reminders`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setHearings(hearingsRes.data);
      setReminders(remindersRes.data || []);
    } catch (error) {
      console.error('Calendar fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/calendar/reminders`, reminderForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Reminder added!');
      setDialogOpen(false);
      setReminderForm({ title: '', date: '', time: '10:00', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add reminder');
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

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayHearings = hearings.filter(h => h.date === dateStr);
    const dayReminders = reminders.filter(r => r.date === dateStr);
    return [...dayHearings.map(h => ({ ...h, type: 'hearing' })), ...dayReminders.map(r => ({ ...r, type: 'reminder' }))];
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const handleDayClick = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setReminderForm(prev => ({ ...prev, date: dateStr }));
    setDialogOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading calendar...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Legal Calendar</h1>
          <p className="text-muted-foreground mt-1">Court hearings and reminders</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Reminder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Reminder</DialogTitle></DialogHeader>
            <form onSubmit={handleAddReminder} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={reminderForm.title} onChange={(e) => setReminderForm(p => ({ ...p, title: e.target.value }))} placeholder="Meeting, Filing deadline, etc." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={reminderForm.date} onChange={(e) => setReminderForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={reminderForm.time} onChange={(e) => setReminderForm(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={reminderForm.notes} onChange={(e) => setReminderForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional details..." rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Add Reminder</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
            <CardTitle className="text-xl">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
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
              <div key={`empty-${i}`} className="h-28 p-1"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              return (
                <div 
                  key={day} 
                  className={`h-28 p-1 border rounded cursor-pointer hover:bg-muted/50 transition-colors ${isToday(day) ? 'bg-primary/10 border-primary' : 'border-border'}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={`text-sm font-medium ${isToday(day) ? 'text-primary font-bold' : ''}`}>{day}</div>
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs px-1 py-0.5 rounded truncate ${event.type === 'hearing' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`} 
                        title={event.title}
                      >
                        {event.time} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-orange-500" />Upcoming Hearings</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hearings.filter(h => new Date(h.date) >= new Date()).slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div>
                    <p className="font-medium">{h.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />{h.court}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-orange-600 font-bold">{h.date}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />{h.time}
                    </div>
                  </div>
                </div>
              ))}
              {hearings.length === 0 && <p className="text-center text-muted-foreground py-4">No upcoming hearings</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-blue-500" />Reminders</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reminders.filter(r => new Date(r.date) >= new Date()).slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    {r.notes && <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-blue-600 font-bold">{r.date}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />{r.time}
                    </div>
                  </div>
                </div>
              ))}
              {reminders.length === 0 && <p className="text-center text-muted-foreground py-4">No reminders. Click a date to add one.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calendar;
