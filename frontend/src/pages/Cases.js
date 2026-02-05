import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WEBHOOK_URL = process.env.REACT_APP_WEBHOOK_URL || 'https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n';

const Cases = ({ userRole = 'lawyer' }) => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    case_number: '',
    fir_number: '',
    case_type: '',
    court_name: '',
    judge_name: '',
    case_stage: 'Filed',
    next_hearing_date: '',
    next_hearing_time: '',
    case_description: '',
    reminder_enabled: true,
    reminder_types: ['sms', 'call']
  });
  const token = localStorage.getItem('vakildot_token');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
    fetchClients();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API}/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
    } catch (error) {
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Failed to load clients', error);
    }
  };

  // Function to trigger Make.com webhook
  const triggerWebhook = async (caseData, clientData) => {
    try {
      const webhookPayload = {
        client_name: clientData.name,
        client_phone: clientData.mobile,
        case_number: caseData.case_number,
        hearing_date: caseData.next_hearing_date,
        hearing_time: caseData.next_hearing_time || '10:00',
        court_name: caseData.court_name,
        case_type: caseData.case_type,
        case_description: caseData.case_description || '',
        trigger_source: 'case_creation',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      if (response.ok) {
        console.log('Webhook Sent Successfully');
        toast.success('Notification sent to Make.com!');
      }
    } catch (error) {
      console.error('Webhook failed:', error);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      // Get selected client info for webhook
      const selectedClient = clients.find(c => c.id === formData.client_id);
      
      const response = await axios.post(`${API}/cases`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Case created successfully!');
      
      // Trigger Make.com webhook after successful case creation
      if (selectedClient) {
        await triggerWebhook(formData, selectedClient);
      }
      
      setDialogOpen(false);
      fetchCases();
      setFormData({
        client_id: '',
        case_number: '',
        fir_number: '',
        case_type: '',
        court_name: '',
        judge_name: '',
        case_stage: 'Filed',
        next_hearing_date: '',
        next_hearing_time: '',
        case_description: '',
        reminder_enabled: true,
        reminder_types: ['sms', 'call']
      });
    } catch (error) {
      toast.error('Failed to create case');
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

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Case deleted successfully!');
      fetchCases();
    } catch (error) {
      toast.error('Failed to delete case');
      console.error(error);
    }
  };

  const filteredCases = cases.filter(c => 
    c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.court_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading cases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Cases</h1>
          <p className="text-muted-foreground mt-1">
            {userRole === 'client' ? 'View your case status and hearing dates' : 'Manage all your legal cases'}
          </p>
        </div>
        {userRole === 'lawyer' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-case-button">
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
              <DialogDescription>Add a new case to your practice</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))} required>
                  <SelectTrigger data-testid="client-select">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Case Number *</Label>
                  <Input
                    value={formData.case_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, case_number: e.target.value }))}
                    placeholder="e.g., CRL/123/2025"
                    data-testid="case-number-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>FIR Number</Label>
                  <Input
                    value={formData.fir_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, fir_number: e.target.value }))}
                    placeholder="Optional"
                    data-testid="fir-number-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Case Type *</Label>
                <Select value={formData.case_type} onValueChange={(value) => setFormData(prev => ({ ...prev, case_type: value }))} required>
                  <SelectTrigger data-testid="case-type-select">
                    <SelectValue placeholder="Select case type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Criminal">Criminal</SelectItem>
                    <SelectItem value="Civil">Civil</SelectItem>
                    <SelectItem value="Constitutional">Constitutional</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                    <SelectItem value="Property">Property</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Court Name *</Label>
                <Input
                  value={formData.court_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, court_name: e.target.value }))}
                  placeholder="e.g., Delhi District Court"
                  data-testid="court-name-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Judge Name</Label>
                <Input
                  value={formData.judge_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, judge_name: e.target.value }))}
                  placeholder="Optional"
                  data-testid="judge-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Case Stage *</Label>
                  <Select value={formData.case_stage} onValueChange={(value) => setFormData(prev => ({ ...prev, case_stage: value }))} required>
                    <SelectTrigger data-testid="case-stage-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Filed">Filed</SelectItem>
                      <SelectItem value="Under Trial">Under Trial</SelectItem>
                      <SelectItem value="Arguments">Arguments</SelectItem>
                      <SelectItem value="Judgment Reserved">Judgment Reserved</SelectItem>
                      <SelectItem value="Judgment">Judgment</SelectItem>
                      <SelectItem value="Appeal">Appeal</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Next Hearing Date *</Label>
                  <Input
                    type="date"
                    value={formData.next_hearing_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_hearing_date: e.target.value }))}
                    data-testid="hearing-date-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hearing Time</Label>
                <Input
                  type="time"
                  value={formData.next_hearing_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, next_hearing_time: e.target.value }))}
                  data-testid="hearing-time-input"
                  placeholder="10:00"
                />
                <p className="text-xs text-muted-foreground">Optional - Time will be included in notifications</p>
              </div>

              <div className="space-y-2">
                <Label>Case Description</Label>
                <Textarea
                  value={formData.case_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, case_description: e.target.value }))}
                  placeholder="Brief description of the case"
                  rows={3}
                  data-testid="case-description-input"
                />
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Reminders</Label>
                  <Switch
                    checked={formData.reminder_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reminder_enabled: checked }))}
                    data-testid="reminder-toggle"
                  />
                </div>

                {formData.reminder_enabled && (
                  <div className="space-y-2">
                    <Label>Reminder Types</Label>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sms"
                          checked={formData.reminder_types.includes('sms')}
                          onCheckedChange={() => toggleReminderType('sms')}
                          data-testid="reminder-sms-checkbox"
                        />
                        <label htmlFor="sms" className="text-sm">SMS</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="call"
                          checked={formData.reminder_types.includes('call')}
                          onCheckedChange={() => toggleReminderType('call')}
                          data-testid="reminder-call-checkbox"
                        />
                        <label htmlFor="call" className="text-sm">Voice Call</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="whatsapp"
                          checked={formData.reminder_types.includes('whatsapp')}
                          onCheckedChange={() => toggleReminderType('whatsapp')}
                          data-testid="reminder-whatsapp-checkbox"
                        />
                        <label htmlFor="whatsapp" className="text-sm">WhatsApp</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="submit-case-button">Create Case</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases by case number, client, or court..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-cases-input"
          />
        </div>
      </div>

      <div className="space-y-4" data-testid="cases-list">
        {filteredCases.length > 0 ? (
          filteredCases.map((caseItem) => (
            <Card 
              key={caseItem.id} 
              className="hover:shadow-md transition-shadow"
              data-testid={`case-card-${caseItem.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/cases/${caseItem.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-mono font-semibold text-foreground">{caseItem.case_number}</h3>
                      <span className="px-3 py-1 bg-muted text-foreground text-xs rounded-sm">
                        {caseItem.case_stage}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-1">{caseItem.client_name}</p>
                    <p className="text-sm text-muted-foreground mb-2">{caseItem.case_type} • {caseItem.court_name}</p>
                    {caseItem.judge_name && (
                      <p className="text-sm text-muted-foreground">Judge: {caseItem.judge_name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Hearing</p>
                    <p className="text-xl font-mono font-bold text-tarikh-urgent">{formatDate(caseItem.next_hearing_date)}</p>
                    {caseItem.reminder_enabled && (
                      <p className="text-xs text-muted-foreground mt-2">Reminders: {caseItem.reminder_types.join(', ')}</p>
                    )}
                    {userRole === 'lawyer' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCase(caseItem.id);
                        }}
                        data-testid={`delete-case-${caseItem.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {userRole === 'client' ? 'No cases found for your phone number.' : 'No cases found. Create your first case to get started.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Cases;