import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Calendar, Video, Gavel, Star, Wallet, Phone, Shield } from 'lucide-react';
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
  
  const [liveLawyers, setLiveLawyers] = useState([]);
  const [myCases, setMyCases] = useState([]);
  const [upcomingHearings, setUpcomingHearings] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.user_role === 'lawyer' || user.role === 'lawyer') {
      navigate('/lawyer-dashboard');
      return;
    }
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch ALL live lawyers - open marketplace
      const liveRes = await axios.get(`${API}/live/lawyers/live`).catch(() => ({ data: { lawyers: [] } }));
      setLiveLawyers(liveRes.data.lawyers || []);

      // Fetch client's own cases
      const casesRes = await axios.get(`${API}/client/my-cases`, { headers }).catch(() => ({ data: { cases: [] } }));
      const cases = casesRes.data.cases || [];
      setMyCases(cases);

      // Upcoming hearings
      const today = new Date().toISOString().split('T')[0];
      const hearings = cases
        .filter(c => c.next_hearing_date && c.next_hearing_date >= today)
        .sort((a, b) => new Date(a.next_hearing_date) - new Date(b.next_hearing_date))
        .slice(0, 5);
      setUpcomingHearings(hearings);

      // Wallet
      const walletRes = await axios.get(`${API}/live/wallet/${user.id}`).catch(() => ({ data: { balance: 0 } }));
      setWallet(walletRes.data);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsult = (lawyer) => {
    const minBalance = (lawyer.rate_per_minute || 20) * 5;
    if ((wallet.balance || 0) < minBalance) {
      toast.error(`Minimum ₹${minBalance} required. Please add money to wallet.`);
      navigate('/wallet');
      return;
    }
    navigate(`/consultation/${lawyer.id}`);
  };

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'dd MMM yyyy'); } catch { return dateStr || 'N/A'; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div data-testid="client-dashboard" className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}! Connect with a lawyer instantly.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/wallet')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">₹{wallet.balance?.toLocaleString('en-IN') || 0}</p>
              </div>
              <Wallet className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full">Add Money</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">My Cases</p>
                <p className="text-2xl sm:text-3xl font-bold">{myCases.length}</p>
              </div>
              <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lawyers Online</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-500">{liveLawyers.length}</p>
              </div>
              <Video className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Lawyers - Open Marketplace */}
      <Card className="border-2 border-red-500/30 bg-red-50/30 dark:bg-red-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
            Lawyers Available Now
            <Badge className="bg-red-500 text-white ml-2">{liveLawyers.length} Online</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveLawyers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveLawyers.map((lawyer) => (
                <Card key={lawyer.id} data-testid={`live-lawyer-${lawyer.id}`}
                  className="hover:border-primary transition-all hover:shadow-md cursor-pointer"
                  onClick={() => handleConsult(lawyer)}
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-14 w-14 border-2 border-green-500 flex-shrink-0">
                        {lawyer.profile_photo && <AvatarImage src={lawyer.profile_photo} />}
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {lawyer.name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold truncate">{lawyer.name}</p>
                          <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{lawyer.specialization || lawyer.court || 'Legal Expert'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium">{lawyer.rating || 4.8}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">₹{lawyer.rate_per_minute || 20}/min</Badge>
                        </div>
                      </div>
                    </div>
                    <Button data-testid={`consult-btn-${lawyer.id}`}
                      className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white" size="sm"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Consult Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No lawyers are live right now</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon or browse available lawyers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Hearings */}
      {upcomingHearings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-orange-500" />
              Your Upcoming Hearings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingHearings.map((hearing, idx) => (
                <div key={idx} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-mono font-semibold">{hearing.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{hearing.case_type}</p>
                    <p className="text-sm text-muted-foreground">{hearing.court_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">{formatDate(hearing.next_hearing_date)}</p>
                    <Badge variant="outline" className="mt-1">{hearing.case_stage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Cases */}
      {myCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myCases.map((caseItem) => (
                <div key={caseItem.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/cases/${caseItem.id}`)}>
                  <div className="flex-1">
                    <p className="font-mono font-semibold">{caseItem.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{caseItem.case_type}</p>
                    <p className="text-sm text-muted-foreground">{caseItem.court_name}</p>
                    {caseItem.next_hearing_date && (
                      <p className="text-xs text-orange-600 mt-1">Next: {formatDate(caseItem.next_hearing_date)}</p>
                    )}
                  </div>
                  <Badge variant={caseItem.case_stage === 'Active' ? 'default' : 'secondary'}>
                    {caseItem.case_stage}
                  </Badge>
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
