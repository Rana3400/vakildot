import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Calendar, IndianRupee, AlertCircle, TrendingUp, Video, FileText, Clock, Gavel, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Lawyer Dashboard Component
const LawyerDashboard = ({ user, token }) => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [savingLive, setSavingLive] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchLiveStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/dashboard/recent-activity`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const res = await axios.get(`${API}/live/status/${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setIsLive(res.data.is_live || false);
    } catch (e) {
      // If no status exists, default to false
      setIsLive(false);
    }
  };

  const toggleLiveStatus = async (checked) => {
    setSavingLive(true);
    try {
      const res = await axios.post(`${API}/live/status/go-live`, {
        lawyer_id: user.id,
        is_live: checked,
        rate_per_minute: user.rate_per_minute || 30,
        name: user.name,
        photo_url: user.photo_url,
        court: user.court,
        specialization: user.practice_field
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        setIsLive(checked);
        toast.success(checked ? 'You are now LIVE! Clients can see your profile.' : 'You are now offline');
      } else {
        toast.error('Failed to update status');
      }
    } catch (e) {
      toast.error('Failed to update live status');
      console.error(e);
    } finally {
      setSavingLive(false);
    }
  };

  const statCards = [
    { title: 'Total Cases', value: stats?.total_cases || 0, icon: Briefcase, color: 'text-primary' },
    { title: 'Active Cases', value: stats?.active_cases || 0, icon: TrendingUp, color: 'text-green-600' },
    { title: 'Total Clients', value: stats?.total_clients || 0, icon: Users, color: 'text-blue-600' },
    { title: "Today's Hearings", value: stats?.todays_hearings || 0, icon: Calendar, color: 'text-orange-600' },
  ];

  const formatDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'dd/MM/yyyy'); } catch { return dateStr; }
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
        <h1 className="text-4xl font-bold text-foreground mb-2">Lawyer Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}! Here's your practice overview.</p>
      </div>

      {/* Go Live Toggle */}
      <Card className={`border-2 ${isLive ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 ${isLive ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' : 'bg-gray-300 dark:bg-gray-700'}`}>
                <Video className={`h-7 w-7 ${isLive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Go Live for Consultations</h3>
                <p className="text-sm text-muted-foreground">
                  {isLive ? 'You are visible to clients on the homepage' : 'Toggle ON to start accepting live video consultations'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isLive && <Badge className="bg-red-500 text-white animate-pulse">LIVE NOW</Badge>}
              <Switch 
                id="live-toggle" 
                checked={isLive} 
                onCheckedChange={toggleLiveStatus}
                disabled={savingLive}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Card */}
      {stats && stats.total_revenue > 0 && (
        <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 uppercase tracking-wider mb-1">Total Earnings</p>
                <p className="text-4xl font-bold font-mono">₹{stats.total_revenue.toLocaleString('en-IN')}</p>
              </div>
              <IndianRupee className="h-14 w-14 opacity-80" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Hearings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Upcoming Hearings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity?.upcoming_hearings?.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.upcoming_hearings.map((hearing) => (
                <div key={hearing.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-mono font-semibold">{hearing.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{hearing.client_name}</p>
                    <p className="text-sm text-muted-foreground">{hearing.court_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-orange-600">{formatDate(hearing.next_hearing_date)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{hearing.case_stage}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No upcoming hearings</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity?.recent_cases?.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.recent_cases.map((caseItem) => (
                <div key={caseItem.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-mono font-semibold">{caseItem.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{caseItem.client_name}</p>
                    <p className="text-sm text-muted-foreground">{caseItem.case_type}</p>
                  </div>
                  <Badge variant="outline">{caseItem.case_stage}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No cases yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Client Dashboard Component
const ClientDashboard = ({ user, token }) => {
  const navigate = useNavigate();
  const [myCases, setMyCases] = useState([]);
  const [upcomingHearings, setUpcomingHearings] = useState([]);
  const [liveLawyers, setLiveLawyers] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const [casesRes, lawyersRes, walletRes] = await Promise.all([
        axios.get(`${API}/client/my-cases`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { cases: [] } })),
        axios.get(`${API}/live/lawyers/live`).catch(() => ({ data: { lawyers: [] } })),
        axios.get(`${API}/live/wallet/${user.id}`).catch(() => ({ data: { balance: 0 } }))
      ]);
      
      setMyCases(casesRes.data.cases || []);
      setLiveLawyers(lawyersRes.data.lawyers || []);
      setWallet(walletRes.data);
      
      // Extract upcoming hearings from cases
      const hearings = (casesRes.data.cases || [])
        .filter(c => c.next_hearing_date)
        .map(c => ({ ...c, hearing_date: c.next_hearing_date }))
        .sort((a, b) => new Date(a.hearing_date) - new Date(b.hearing_date))
        .slice(0, 5);
      setUpcomingHearings(hearings);
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
        <p className="text-muted-foreground">Welcome, {user?.name}! Here's your legal updates.</p>
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
              <IndianRupee className="h-10 w-10 text-green-600" />
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
              Lawyers Available Now
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm">{lawyer.rating}</span>
                    </div>
                    <span className="font-bold text-green-600">₹{lawyer.rate_per_minute}/min</span>
                  </div>
                  <Button size="sm" className="w-full mt-3 bg-red-500 hover:bg-red-600" onClick={() => navigate(`/consultation/${lawyer.id}`)}>
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
                    <Badge variant="outline" className="mt-1">{hearing.case_stage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No upcoming hearings</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myCases.length > 0 ? (
            <div className="space-y-4">
              {myCases.slice(0, 5).map((caseItem) => (
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
    </div>
  );
};

// Main Dashboard Component - Routes based on role
const Dashboard = ({ userRole = 'lawyer' }) => {
  const token = localStorage.getItem('vakildot_token');
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');
  
  // Use actual userRole from user object if available
  const actualRole = user?.user_role || userRole;

  if (actualRole === 'client') {
    return <ClientDashboard user={user} token={token} />;
  }

  return <LawyerDashboard user={user} token={token} />;
};

export default Dashboard;
