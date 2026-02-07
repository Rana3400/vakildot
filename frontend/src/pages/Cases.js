import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CASE_TYPES = ['Criminal', 'Civil', 'Constitutional', 'Family', 'Property', 'Corporate', 'Tax', 'Labour', 'Consumer', 'Cyber', 'Environmental'];
const CASE_STAGES = ['Filed', 'Under Trial', 'Arguments', 'Judgment Reserved', 'Judgment', 'Appeal', 'Closed'];
const TIME_SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'];
const INDIAN_COURTS = [
  'Supreme Court of India',
  'Delhi High Court', 'Bombay High Court', 'Calcutta High Court', 'Madras High Court',
  'Karnataka High Court', 'Gujarat High Court', 'Allahabad High Court',
  'Punjab & Haryana High Court', 'Rajasthan High Court', 'Kerala High Court',
  'Telangana High Court', 'Andhra Pradesh High Court', 'Patna High Court',
  'Jharkhand High Court', 'Orissa High Court', 'Chhattisgarh High Court',
  'Madhya Pradesh High Court', 'Uttarakhand High Court', 'Himachal Pradesh High Court',
  'Jammu & Kashmir High Court', 'Gauhati High Court',
  'District Court', 'Sessions Court', 'Magistrate Court', 'Civil Court',
  'Consumer Forum', 'Labour Court', 'Family Court',
  'NCLT', 'NCLAT', 'DRT', 'DRAT', 'ITAT', 'Customs Tribunal', 'CAT'
];

const Cases = ({ userRole = 'lawyer' }) => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '', case_number: '', fir_number: '', case_type: '', court_name: '', judge_name: '',
    case_stage: 'Filed', next_hearing_date: '', next_hearing_time: '10:00 AM', case_description: '',
    reminder_enabled: true, reminder_types: ['sms', 'call']
  });
  const token = localStorage.getItem('vakildot_token');
  const navigate = useNavigate();

  useEffect(() => { fetchCases(); fetchClients(); }, []);

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API}/cases`, { headers: { Authorization: `Bearer ${token}` } });
      setCases(response.data);
    } catch (error) {
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } });
      setClients(response.data);
    } catch (error) {
      console.error('Failed to load clients');
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/cases`, formData, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Webhook Sent Successfully');
      toast.success('Case created & notification sent!');
      setDialogOpen(false);
      fetchCases();
      setFormData({
        client_id: '', case_number: '', fir_number: '', case_type: '', court_name: '', judge_name: '',
        case_stage: 'Filed', next_hearing_date: '', next_hearing_time: '10:00 AM', case_description: '',
        reminder_enabled: true, reminder_types: ['sms', 'call']
      });
    } catch (error) {
      toast.error('Failed to create case');
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm('Delete this case?')) return;
    try {
      await axios.delete(`${API}/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Case deleted');
      fetchCases();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const toggleReminderType = (type) => {
    setFormData(prev => ({
      ...prev,
      reminder_types: prev.reminder_types.includes(type)
        ? prev.reminder_types.filter(t => t !== type)
        : [...prev.reminder_types, type]
    }));
  };

  const filteredCases = cases.filter(c =>
    c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.court_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'dd/MM/yyyy'); } catch { return dateStr; }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading cases...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cases</h1>
          <p className="text-muted-foreground mt-1">{userRole === 'client' ? 'Your case status' : 'Manage legal cases'}</p>
        </div>
        {userRole === 'lawyer' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Case</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Case</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateCase} className="space-y-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select value={formData.client_id} onValueChange={(v) => setFormData(p => ({ ...p, client_id: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.mobile}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Case Number *</Label>
                    <Input value={formData.case_number} onChange={(e) => setFormData(p => ({ ...p, case_number: e.target.value }))} placeholder="CRL/123/2025" required />
                  </div>
                  <div className="space-y-2">
                    <Label>FIR Number</Label>
                    <Input value={formData.fir_number} onChange={(e) => setFormData(p => ({ ...p, fir_number: e.target.value }))} placeholder="Optional" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Case Type *</Label>
                    <Select value={formData.case_type} onValueChange={(v) => setFormData(p => ({ ...p, case_type: v }))} required>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Case Stage *</Label>
                    <Select value={formData.case_stage} onValueChange={(v) => setFormData(p => ({ ...p, case_stage: v }))} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Court Name *</Label>
                  <Select value={formData.court_name} onValueChange={(v) => setFormData(p => ({ ...p, court_name: v }))} required>
                    <SelectTrigger><SelectValue placeholder="Select court" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_COURTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Judge Name</Label>
                  <Input value={formData.judge_name} onChange={(e) => setFormData(p => ({ ...p, judge_name: e.target.value }))} placeholder="Hon'ble Justice..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Next Hearing Date *</Label>
                    <Input type="date" value={formData.next_hearing_date} onChange={(e) => setFormData(p => ({ ...p, next_hearing_date: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Hearing Time</Label>
                    <Select value={formData.next_hearing_time} onValueChange={(v) => setFormData(p => ({ ...p, next_hearing_time: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Case Description</Label>
                  <Textarea value={formData.case_description} onChange={(e) => setFormData(p => ({ ...p, case_description: e.target.value }))} placeholder="Brief description..." rows={3} />
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Reminders</Label>
                    <Switch checked={formData.reminder_enabled} onCheckedChange={(c) => setFormData(p => ({ ...p, reminder_enabled: c }))} />
                  </div>
                  {formData.reminder_enabled && (
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={formData.reminder_types.includes('sms')} onCheckedChange={() => toggleReminderType('sms')} />
                        <label className="text-sm">SMS</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={formData.reminder_types.includes('call')} onCheckedChange={() => toggleReminderType('call')} />
                        <label className="text-sm">Voice Call</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={formData.reminder_types.includes('whatsapp')} onCheckedChange={() => toggleReminderType('whatsapp')} />
                        <label className="text-sm">WhatsApp</label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Case</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by case number, client, or court..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-4">
        {filteredCases.length > 0 ? filteredCases.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-mono font-semibold">{c.case_number}</h3>
                    <span className="px-3 py-1 bg-muted text-xs rounded">{c.case_stage}</span>
                  </div>
                  <p className="text-muted-foreground mb-1">{c.client_name}</p>
                  <p className="text-sm text-muted-foreground">{c.case_type} • {c.court_name}</p>
                  {c.judge_name && <p className="text-sm text-muted-foreground">Judge: {c.judge_name}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Next Hearing</p>
                  <p className="text-xl font-mono font-bold text-orange-600">{formatDate(c.next_hearing_date)}</p>
                  <p className="text-sm text-muted-foreground">{c.next_hearing_time}</p>
                  {userRole === 'lawyer' && (
                    <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCase(c.id); }}>
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No cases found. Create your first case.</p></CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default Cases;
