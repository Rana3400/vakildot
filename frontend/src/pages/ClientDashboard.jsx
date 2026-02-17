import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Calendar, IndianRupee, Video, FileText, Clock, Gavel, Star, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('vakildot_token');
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');
  
  const [myCases, setMyCases] = useState([]);
  const [upcomingHearings, setUpcomingHearings] = useState([]);
  const [myDocuments, setMyDocuments] = useState([]);
  const [liveLawyers, setLiveLawyers] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify user is a client
    if (user.user_role === 'lawyer') {
      navigate('/lawyer-dashboard');
      return;
    }
    
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [casesRes, hearingsRes, docsRes, lawyersRes, walletRes] = await Promise.all([
        axios.get(`${API}/client/my-cases`, { headers }).catch(() => ({ data: { cases: [] } })),
        axios.get(`${API}/client/my-hearings`, { headers }).catch(() => ({ data: { hearings: [] } })),
        axios.get(`${API}/client/my-documents`, { headers }).catch(() => ({ data: { documents: [] } })),
        axios.get(`${API}/live/lawyers/live`).catch(() => ({ data: { lawyers: [] } })),
        axios.get(`${API}/live/wallet/${user.id}`).catch(() => ({ data: { balance: 0 } }))
      ]);
      
      setMyCases(casesRes.data.cases || []);
      setUpcomingHearings(hearingsRes.data.hearings || []);
      setMyDocuments(docsRes.data.documents || []);
      setLiveLawyers(lawyersRes.data.lawyers || []);
      setWallet(walletRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}! Track your legal matters here.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/wallet')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                <p className="text-3xl font-bold text-green-600">₹{wallet.balance?.toLocaleString('en-IN') || 0}</p>
              </div>
              <Wallet className="h-10 w-10 text-green-600" />
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">Add Money</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">My Cases</p>
                <p className="text-3xl font-bold">{myCases.length}</p>
              </div>
              <Briefcase className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Upcoming Hearings</p>
                <p className="text-3xl font-bold text-orange-600">{upcomingHearings.length}</p>
              </div>
              <Calendar className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Lawyers Available */}
      {liveLawyers.length > 0 && (
        <Card className="border-2 border-red-500/30 bg-red-50/30 dark:bg-red-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
              Lawyers Available Now - Get Instant Consultation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveLawyers.slice(0, 3).map(lawyer => (
                <div key={lawyer.id} className="p-4 border rounded-lg bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12">
                      {lawyer.photo_url && <AvatarImage src={lawyer.photo_url} />}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {lawyer.name?.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{lawyer.name}</p>
                      <p className="text-xs text-muted-foreground">{lawyer.court}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm">{lawyer.rating}</span>
                    </div>
                    <span className="font-bold text-green-600">₹{lawyer.rate_per_minute}/min</span>
                  </div>
                  <Button size="sm" className="w-full bg-red-500 hover:bg-red-600" onClick={() => navigate(`/consultation/${lawyer.id}`)}>
                    <Video className="h-4 w-4 mr-2" />
                    Join Stream
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/')}>
              View All Live Lawyers
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Hearings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-orange-500" />
            Your Upcoming Hearings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingHearings.length > 0 ? (
            <div className="space-y-4">
              {upcomingHearings.map((hearing, idx) => (
                <div key={idx} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-mono font-semibold">{hearing.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{hearing.case_type}</p>
                    <p className="text-sm text-muted-foreground">{hearing.court_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">{formatDate(hearing.hearing_date)}</p>
                    <p className="text-xs text-muted-foreground">{hearing.hearing_time}</p>
                    <Badge variant="outline" className="mt-1">{hearing.case_stage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No upcoming hearings</p>
              <p className="text-sm text-muted-foreground mt-1">Your lawyer will update hearing dates here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            My Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myCases.length > 0 ? (
            <div className="space-y-4">
              {myCases.map((caseItem) => (
                <div key={caseItem.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/cases/${caseItem.id}`)}>
                  <div className="flex-1">
                    <p className="font-mono font-semibold">{caseItem.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{caseItem.case_type}</p>
                    <p className="text-sm text-muted-foreground">Lawyer: {caseItem.lawyer_name || 'Assigned'}</p>
                  </div>
                  <Badge variant={caseItem.case_stage === 'Active' ? 'default' : 'secondary'}>
                    {caseItem.case_stage}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No cases assigned yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your lawyer will add your cases here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Documents */}
      {myDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Case Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myDocuments.slice(0, 5).map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientDashboard;
