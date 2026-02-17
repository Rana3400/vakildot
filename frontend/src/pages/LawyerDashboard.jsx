import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Calendar, IndianRupee, AlertCircle, TrendingUp, Video, Gavel, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LawyerDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('vakildot_token');
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');
  
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [savingLive, setSavingLive] = useState(false);

  useEffect(() => {
    // Verify user is a lawyer
    if (user.user_role === 'client') {
      navigate('/client-dashboard');
      return;
    }
    
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
        <p className="text-muted-foreground">Welcome back, {user?.name}! Manage your practice here.</p>
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
              <Switch id="live-toggle" checked={isLive} onCheckedChange={toggleLiveStatus} disabled={savingLive} />
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
                <div key={hearing.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${hearing.id}`)}>
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
                <div key={caseItem.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${caseItem.id}`)}>
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

export default LawyerDashboard;
