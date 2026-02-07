import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Phone, Mail, MapPin, MessageSquare, PhoneCall, Send, Upload, User } from 'lucide-react';
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
  const token = localStorage.getItem('vakildot_token');

  useEffect(() => { fetchClientData(); }, [clientId]);

  const fetchClientData = async () => {
    try {
      const [clientRes, casesRes] = await Promise.all([
        axios.get(`${API}/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/cases`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setClient(clientRes.data);
      setCases(casesRes.data.filter(c => c.client_id === clientId));
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
      toast.error('Failed to upload photo');
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
        case_number: cases[0]?.case_number || '',
        hearing_date: cases[0]?.next_hearing_date || '',
        hearing_time: cases[0]?.next_hearing_time || '',
        message: message,
        notification_type: type
      }, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Webhook Sent Successfully');
      toast.success(`${type.toUpperCase()} sent to ${client.name}!`);
      setMessage('');
    } catch (error) {
      toast.error('Failed to send notification');
    } finally {
      setSendingType(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/clients')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Clients
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="relative inline-block">
                <Avatar className="h-24 w-24 mx-auto">
                  <AvatarImage src={client.photo_url} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{client.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1 rounded-full cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              <h2 className="text-xl font-bold mt-4">{client.name}</h2>
              <div className="mt-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />{client.mobile}
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />{client.email}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />{client.address}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs defaultValue="communication">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="communication">Communication Hub</TabsTrigger>
                <TabsTrigger value="cases">Cases ({cases.length})</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="communication" className="space-y-4">
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message here..." rows={4} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => sendNotification('whatsapp')} disabled={sendingType === 'whatsapp'} className="bg-green-600 hover:bg-green-700">
                    <MessageSquare className="h-4 w-4 mr-2" />{sendingType === 'whatsapp' ? 'Sending...' : 'WhatsApp'}
                  </Button>
                  <Button onClick={() => sendNotification('sms')} disabled={sendingType === 'sms'} variant="secondary">
                    <Send className="h-4 w-4 mr-2" />{sendingType === 'sms' ? 'Sending...' : 'SMS'}
                  </Button>
                  <Button onClick={() => sendNotification('voice')} disabled={sendingType === 'voice'} variant="outline">
                    <PhoneCall className="h-4 w-4 mr-2" />{sendingType === 'voice' ? 'Calling...' : 'Voice Call'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Messages are sent via Make.com webhook to Twilio</p>
              </TabsContent>
              <TabsContent value="cases" className="space-y-4">
                {cases.length > 0 ? cases.map(c => (
                  <Card key={c.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/cases/${c.id}`)}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-semibold">{c.case_number}</p>
                          <p className="text-sm text-muted-foreground">{c.case_type} • {c.court_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-orange-600">{c.next_hearing_date}</p>
                          <span className="text-xs bg-muted px-2 py-1 rounded">{c.case_stage}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">No cases for this client</div>
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
