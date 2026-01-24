import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MessageCircle, MessageSquare, Phone, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [clientCases, setClientCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('vakildesk_token');

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      const [clientRes, casesRes] = await Promise.all([
        axios.get(`${API}/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/cases`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setClient(clientRes.data);
      // Filter cases for this client
      const filteredCases = casesRes.data.filter(c => c.client_id === clientId);
      setClientCases(filteredCases);
    } catch (error) {
      toast.error('Failed to load client details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppReminder = async () => {
    try {
      // Get the most recent case for context
      const recentCase = clientCases.length > 0 ? clientCases[0] : null;
      
      const payload = {
        client_name: client.name,
        client_phone: client.mobile,
        hearing_date: recentCase?.next_hearing_date || 'No upcoming hearing',
        case_description: recentCase?.case_description || `General reminder for ${client.name}`,
        notification_type: 'whatsapp',
        case_number: recentCase?.case_number || null,
        court_name: recentCase?.court_name || null
      };

      toast.info(`Sending WhatsApp reminder to ${client.name}...`);
      
      const response = await axios.post(`${API}/notifications/send-webhook`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('WhatsApp reminder sent successfully!');
        console.log('Webhook response:', response.data.webhook_response);
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send WhatsApp reminder');
    }
  };

  const handleSMSAlert = async () => {
    try {
      const recentCase = clientCases.length > 0 ? clientCases[0] : null;
      
      const payload = {
        client_name: client.name,
        client_phone: client.mobile,
        hearing_date: recentCase?.next_hearing_date || 'No upcoming hearing',
        case_description: recentCase?.case_description || `General alert for ${client.name}`,
        notification_type: 'sms',
        case_number: recentCase?.case_number || null,
        court_name: recentCase?.court_name || null
      };

      toast.info(`Sending SMS alert to ${client.name}...`);
      
      const response = await axios.post(`${API}/notifications/send-webhook`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('SMS alert sent successfully!');
        console.log('Webhook response:', response.data.webhook_response);
      }
    } catch (error) {
      console.error('SMS error:', error);
      toast.error(error.response?.data?.detail || 'Failed to send SMS alert');
    }
  };

  const handleVoiceCall = async () => {
    try {
      const recentCase = clientCases.length > 0 ? clientCases[0] : null;
      
      const payload = {
        client_name: client.name,
        client_phone: client.mobile,
        hearing_date: recentCase?.next_hearing_date || 'No upcoming hearing',
        case_description: recentCase?.case_description || `Voice notification for ${client.name}`,
        notification_type: 'voice',
        case_number: recentCase?.case_number || null,
        court_name: recentCase?.court_name || null
      };

      toast.info(`Initiating AI voice call to ${client.name}...`);
      
      const response = await axios.post(`${API}/notifications/send-webhook`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('AI voice call triggered successfully!');
        console.log('Webhook response:', response.data.webhook_response);
      }
    } catch (error) {
      console.error('Voice call error:', error);
      toast.error(error.response?.data?.detail || 'Failed to trigger voice call');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading client details...</div>;
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/clients')} data-testid="back-to-clients-button">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
          <p className="text-muted-foreground">Client Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Mobile Number</p>
                <p className="text-lg font-mono font-semibold text-foreground">+91 {client.mobile}</p>
              </div>
              {client.email && (
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Email Address</p>
                  <p className="text-lg text-foreground">{client.email}</p>
                </div>
              )}
              {client.address && (
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Address</p>
                  <p className="text-foreground">{client.address}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-foreground">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication Hub */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Communication Hub
              </CardTitle>
              <p className="text-sm text-muted-foreground">Send reminders and alerts to your client instantly</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* WhatsApp Button */}
                <Button
                  onClick={handleWhatsAppReminder}
                  className="h-auto py-6 flex flex-col items-center gap-3 bg-[#25D366] hover:bg-[#20BA5A] text-white transition-all active:scale-95"
                  data-testid="whatsapp-reminder-button"
                >
                  <MessageCircle className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-semibold text-base">WhatsApp Reminder</p>
                    <p className="text-xs opacity-90">Instant message</p>
                  </div>
                </Button>

                {/* SMS Button */}
                <Button
                  onClick={handleSMSAlert}
                  className="h-auto py-6 flex flex-col items-center gap-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-all active:scale-95"
                  data-testid="sms-alert-button"
                >
                  <MessageSquare className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-semibold text-base">SMS Alert</p>
                    <p className="text-xs opacity-90">Text message</p>
                  </div>
                </Button>

                {/* Voice Call Button */}
                <Button
                  onClick={handleVoiceCall}
                  className="h-auto py-6 flex flex-col items-center gap-3 bg-[#F97316] hover:bg-[#EA580C] text-white transition-all active:scale-95"
                  data-testid="voice-call-button"
                >
                  <Phone className="h-8 w-8" />
                  <div className="text-center">
                    <p className="font-semibold text-base">AI Voice Call</p>
                    <p className="text-xs opacity-90">Automated call</p>
                  </div>
                </Button>
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-sm">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> All communications will be sent to +91 {client.mobile}. 
                  Ensure client consent before sending automated messages.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Client Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Associated Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientCases.length > 0 ? (
                <div className="space-y-3">
                  {clientCases.map((caseItem) => (
                    <div 
                      key={caseItem.id} 
                      className="p-4 border border-border rounded-sm hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/cases/${caseItem.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-semibold text-foreground">{caseItem.case_number}</p>
                          <p className="text-sm text-muted-foreground">{caseItem.case_type} • {caseItem.court_name}</p>
                        </div>
                        <span className="px-3 py-1 bg-muted text-foreground text-xs rounded-sm">
                          {caseItem.case_stage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No cases associated with this client yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-sm">
                <p className="text-3xl font-bold text-foreground">{clientCases.length}</p>
                <p className="text-sm text-muted-foreground">Total Cases</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-sm">
                <p className="text-3xl font-bold text-foreground">
                  {clientCases.filter(c => c.case_stage !== 'Closed').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Cases</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => navigate('/cases')}>
                Create New Case
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/billing')}>
                Generate Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;