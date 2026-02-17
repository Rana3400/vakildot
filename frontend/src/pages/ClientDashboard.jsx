import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Calendar, IndianRupee, Video, FileText, Gavel, Star, Wallet, User, Phone } from 'lucide-react';
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
  const [myLawyer, setMyLawyer] = useState(null); // Only MY assigned lawyer
  const [wallet, setWallet] = useState({ balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify user is a client - redirect if lawyer
    if (user.user_role === 'lawyer' || user.role === 'lawyer') {
      navigate('/lawyer-dashboard');
      return;
    }
    
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch ONLY client's own cases (filtered by their phone/email)
      const casesRes = await axios.get(`${API}/client/my-cases`, { headers }).catch(() => ({ data: { cases: [], assigned_lawyer_id: null } }));
      
      const cases = casesRes.data.cases || [];
      setMyCases(cases);
      
      // Extract upcoming hearings from MY cases only
      const today = new Date().toISOString().split('T')[0];
      const hearings = cases
        .filter(c => c.next_hearing_date && c.next_hearing_date >= today)
        .map(c => ({ 
          ...c, 
          hearing_date: c.next_hearing_date,
          hearing_time: c.next_hearing_time || '10:00 AM'
        }))
        .sort((a, b) => new Date(a.hearing_date) - new Date(b.hearing_date))
        .slice(0, 5);
      setUpcomingHearings(hearings);
      
      // Get MY assigned lawyer only (from my cases)
      if (casesRes.data.assigned_lawyer_id) {
        try {
          const lawyerRes = await axios.get(`${API}/client/my-lawyer`, { headers });
          if (lawyerRes.data.lawyer) {
            setMyLawyer(lawyerRes.data.lawyer);
          }
        } catch (e) {
          console.log('No assigned lawyer');
        }
      }
      
      // Get wallet balance
      const walletRes = await axios.get(`${API}/live/wallet/${user.id}`).catch(() => ({ data: { balance: 0 } }));
      setWallet(walletRes.data);
      
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}! Track your legal matters here.</p>
      </div>

      {/* Quick Stats - Only CLIENT's data */}
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

      {/* MY LAWYER Section - Only shows assigned lawyer if they exist and are live */}
      {myLawyer ? (
        <Card className={`border-2 ${myLawyer.is_live ? 'border-red-500/50 bg-red-50/30 dark:bg-red-950/10' : 'border-slate-200 dark:border-slate-700'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Lawyer
              {myLawyer.is_live && (
                <Badge className="bg-red-500 text-white animate-pulse ml-2">LIVE NOW</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {myLawyer.photo_url && <AvatarImage src={myLawyer.photo_url} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {myLawyer.name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-xl font-semibold">{myLawyer.name}</p>
                <p className="text-muted-foreground">{myLawyer.court || 'Court N/A'}</p>
                <p className="text-sm text-muted-foreground">{myLawyer.practice_field || 'Legal Services'}</p>
                {myLawyer.mobile && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" /> {myLawyer.mobile}
                  </p>
                )}
              </div>
              {myLawyer.is_live && (
                <Button className="bg-red-500 hover:bg-red-600" onClick={() => navigate(`/consultation/${myLawyer.id}`)}>
                  <Video className="h-4 w-4 mr-2" />
                  Join Consultation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No lawyer assigned yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your cases will appear here once a lawyer takes your case</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
              Find a Lawyer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Hearings - Only MY hearings */}
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

      {/* My Cases - Only CLIENT's own cases */}
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
                    <p className="text-sm text-muted-foreground">{caseItem.court_name}</p>
                    {caseItem.next_hearing_date && (
                      <p className="text-xs text-orange-600 mt-1">Next Hearing: {formatDate(caseItem.next_hearing_date)}</p>
                    )}
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
              <p className="text-muted-foreground">No cases yet</p>
              <p className="text-sm text-muted-foreground mt-1">Cases assigned to you will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
