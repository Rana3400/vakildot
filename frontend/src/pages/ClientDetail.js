import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, MessageSquare, Phone, Briefcase, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// Firebase Imports
import { firestore } from '../firebase'; 
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [clientCases, setClientCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const WEBHOOK_URL = "https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n";

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Client Profile from Firestore
      const clientRef = doc(firestore, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);

      if (clientSnap.exists()) {
        setClient({ id: clientSnap.id, ...clientSnap.data() });
      } else {
        toast.error("Client not found");
        navigate('/clients');
        return;
      }

      // 2. Fetch Cases associated with this Client ID
      const casesQ = query(collection(firestore, 'cases'), where('client_id', '==', clientId));
      const casesSnap = await getDocs(casesQ);
      const casesList = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClientCases(casesList);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load client profile');
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (type) => {
    const recentCase = clientCases.length > 0 ? clientCases[0] : null;
    const payload = {
      client_name: client.name,
      client_phone: client.mobile,
      notification_type: type,
      case_number: recentCase?.case_number || 'N/A',
      hearing_date: recentCase?.next_hearing_date || 'TBD',
      court_name: recentCase?.court_name || 'N/A',
      source: 'VakilDot_Panel'
    };

    try {
      toast.info(`Triggering ${type} notification...`);
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success(`${type} sent successfully via Make.com!`);
      }
    } catch (error) {
      toast.error(`Failed to send ${type}`);
    }
  };

  if (loading) return <div className="p-20 text-center font-mono">Loading VakilDot Profile...</div>;
  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">ID: {client.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground uppercase text-[10px] tracking-widest">Mobile</Label>
                <p className="text-lg font-bold">+91 {client.mobile}</p>
              </div>
              <div>
                <Label className="text-muted-foreground uppercase text-[10px] tracking-widest">Email</Label>
                <p className="text-lg">{client.email || 'N/A'}</p>
              </div>
              <div className="md:col-span-2 border-t pt-4">
                <Label className="text-muted-foreground uppercase text-[10px] tracking-widest">Address</Label>
                <p className="text-md">{client.address || 'No address provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Communication Hub */}
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Communication Hub
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={() => sendNotification('WhatsApp')} className="bg-[#25D366] hover:bg-[#20BA5A] h-20 flex-col gap-1">
                  <MessageCircle /> WhatsApp
                </Button>
                <Button onClick={() => sendNotification('SMS')} className="bg-blue-600 hover:bg-blue-700 h-20 flex-col gap-1">
                  <MessageSquare /> SMS Alert
                </Button>
                <Button onClick={() => sendNotification('Voice')} className="bg-orange-500 hover:bg-orange-600 h-20 flex-col gap-1">
                  <Phone /> AI Voice Call
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Case History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" /> Case History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientCases.length > 0 ? (
                clientCases.map(c => (
                  <div key={c.id} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-primary">{c.case_number}</p>
                        <p className="text-sm text-muted-foreground">{c.court_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-500">{c.next_hearing_date}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">{c.case_stage}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">No cases found for this client.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6 text-center">
              <p className="text-5xl font-bold">{clientCases.length}</p>
              <p className="text-sm opacity-80 uppercase tracking-widest mt-2">Total Cases</p>
            </CardContent>
          </Card>
          
          <Button className="w-full py-6 text-lg" onClick={() => navigate('/cases')}>
             File New Case
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;