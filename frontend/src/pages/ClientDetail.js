import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Phone, Mail, MapPin, MessageSquare, PhoneCall, Send, Upload, Trash2, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sendingType, setSendingType] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const token = localStorage.getItem('vakildot_token');

  useEffect(() => { fetchClientData(); }, [clientId]);

  const fetchClientData = async () => {
    try {
      const [clientRes, casesRes] = await Promise.all([
        axios.get(`${API}/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/cases`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setClient(clientRes.data);
      const clientCases = casesRes.data.filter(c => c.client_id === clientId);
      setCases(clientCases);
      if (clientCases.length > 0) setSelectedCase(clientCases[0]);
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API}/clients/${clientId}/upload-photo`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo uploaded!');
      fetchClientData();
    } catch (error) {
      toast.error('Failed to upload');
    }
  };

  const handleDeleteClient = async () => {
    if (!window.confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Client deleted');
      navigate('/clients');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const sendNotification = async (type) => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setSendingType(type);
    try {
      await axios.post(`${API}/notifications/send-webhook`, {
        client_name: client.name,
        client_phone: client.mobile,
        case_number: selectedCase?.case_number || '',
        hearing_date: selectedCase?.next_hearing_date || '',
        hearing_time: selectedCase?.next_hearing_time || '',
        message: message,
        notification_type: type
      }, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Webhook Sent Successfully');
      toast.success(`${type.toUpperCase()} sent successfully!`);
      setMessage('');
    } catch (error) {
      toast.error('Failed to send');
    } finally {
      setSendingType(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDeleteClient}>
          <Trash2 className="h-4 w-4 mr-2" />Delete Client
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="relative inline-block">
                <Avatar className="h-32 w-32 mx-auto border-4 border-primary/20">
                  <AvatarImage src={client.photo_url} />
                  <AvatarFallback className="text-4xl bg-primary text-primary-foreground">{client.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              <h2 className="text-2xl font-bold mt-4">{client.name}</h2>
              <p className="text-muted-foreground text-sm">Client ID: {clientId.slice(0, 8)}</p>
              
              <div className="mt-6 space-y-3 text-left bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-mono">{client.mobile}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-sm">{client.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-center">
                  <FileText className="h-6 w-6 mx-auto text-blue-600" />
                  <p className="text-2xl font-bold text-blue-600 mt-1">{cases.length}</p>
                  <p className="text-xs text-muted-foreground">Cases</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg text-center">
                  <Calendar className="h-6 w-6 mx-auto text-orange-600" />
                  <p className="text-2xl font-bold text-orange-600 mt-1">{cases.filter(c => c.case_stage !== 'Closed').length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communication Hub & Cases */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="communication">
            <CardHeader className="pb-2">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="communication" className="flex-1">Communication Hub</TabsTrigger>
                <TabsTrigger value="cases" className="flex-1">Cases ({cases.length})</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="communication" className="space-y-4 mt-0">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                  <h3 className="font-semibold text-lg">Send Notification to {client.name}</h3>
                  <p className="text-sm opacity-90">WhatsApp, SMS or Voice Call via Make.com + Twilio</p>
                </div>

                {cases.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Case (optional)</Label>
                    <select 
                      className="w-full p-2 border rounded-md bg-background"
                      value={selectedCase?.id || ''}
                      onChange={(e) => setSelectedCase(cases.find(c => c.id === e.target.value))}
                    >
                      <option value="">No case selected</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.case_number} - {c.court_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    placeholder="Type your message here... e.g., 'Your next hearing is scheduled for...'" 
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Button 
                    onClick={() => sendNotification('whatsapp')} 
                    disabled={sendingType === 'whatsapp'} 
                    className="bg-green-600 hover:bg-green-700 h-16 flex-col"
                  >
                    <MessageSquare className="h-6 w-6 mb-1" />
                    <span className="text-xs">{sendingType === 'whatsapp' ? 'Sending...' : 'WhatsApp'}</span>
                  </Button>
                  <Button 
                    onClick={() => sendNotification('sms')} 
                    disabled={sendingType === 'sms'} 
                    variant="secondary"
                    className="h-16 flex-col"
                  >
                    <Send className="h-6 w-6 mb-1" />
                    <span className="text-xs">{sendingType === 'sms' ? 'Sending...' : 'SMS'}</span>
                  </Button>
                  <Button 
                    onClick={() => sendNotification('voice')} 
                    disabled={sendingType === 'voice'} 
                    variant="outline"
                    className="h-16 flex-col"
                  >
                    <PhoneCall className="h-6 w-6 mb-1" />
                    <span className="text-xs">{sendingType === 'voice' ? 'Calling...' : 'Voice Call'}</span>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Notifications are sent via Make.com webhook to Twilio for delivery
                </p>
              </TabsContent>

              <TabsContent value="cases" className="space-y-3 mt-0">
                {cases.length > 0 ? cases.map(c => (
                  <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/cases/${c.id}`)}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-bold text-lg">{c.case_number}</p>
                          <p className="text-sm text-muted-foreground">{c.case_type} • {c.court_name}</p>
                          {c.judge_name && <p className="text-xs text-muted-foreground">Judge: {c.judge_name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-mono font-bold text-orange-600">{c.next_hearing_date}</p>
                          <p className="text-sm text-muted-foreground">{c.next_hearing_time}</p>
                          <span className="inline-block mt-1 text-xs bg-muted px-2 py-1 rounded">{c.case_stage}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cases linked to this client</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/cases')}>
                      Create New Case
                    </Button>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default ClientDetail;
