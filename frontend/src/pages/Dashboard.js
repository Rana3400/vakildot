import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Calendar, IndianRupee, AlertCircle, TrendingUp, Video } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ userRole = 'lawyer' }) => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const token = localStorage.getItem('vakildot_token');
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');

  useEffect(() => {
    fetchDashboardData();
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

  const toggleLiveStatus = async (checked) => {
    setIsLive(checked);
    try {
      await axios.post(`${API}/live/status/go-live`, {
        lawyer_id: user.id,
        is_live: checked,
        rate_per_minute: 30
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(checked ? 'You are now LIVE!' : 'You are now offline');
    } catch (e) {
      toast.error('Failed to update status');
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
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your practice overview.</p>
      </div>

      {/* Go Live Toggle for Lawyers */}
      {userRole === 'lawyer' && (
        <Card className="border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <Video className={`h-6 w-6 ${isLive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Go Live</h3>
                  <p className="text-sm text-muted-foreground">Toggle to start accepting live consultations</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="live-toggle" className={isLive ? 'text-red-500 font-bold' : ''}>
                  {isLive ? 'LIVE NOW' : 'Offline'}
                </Label>
                <Switch 
                  id="live-toggle" 
                  checked={isLive} 
                  onCheckedChange={toggleLiveStatus}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} data-testid={`stat-card-${index}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-sm bg-muted flex items-center justify-center ${stat.color}`}>
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
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-3xl font-bold font-mono">₹{stats.total_revenue.toLocaleString('en-IN')}</p>
              </div>
              <IndianRupee className="h-12 w-12 opacity-80" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Hearings */}
      <Card data-testid="upcoming-hearings-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-tarikh-urgent" />
            Upcoming Hearings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity?.upcoming_hearings?.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.upcoming_hearings.map((hearing) => (
                <div key={hearing.id} className="flex items-start justify-between p-4 border border-border rounded-sm hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-foreground">{hearing.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{hearing.client_name}</p>
                    <p className="text-sm text-muted-foreground">{hearing.court_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-tarikh-urgent">{formatDate(hearing.next_hearing_date)}</p>
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
      <Card data-testid="recent-cases-card">
        <CardHeader>
          <CardTitle>Recent Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity?.recent_cases?.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.recent_cases.map((caseItem) => (
                <div key={caseItem.id} className="flex items-start justify-between p-4 border border-border rounded-sm hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-foreground">{caseItem.case_number}</p>
                    <p className="text-sm text-muted-foreground mt-1">{caseItem.client_name}</p>
                    <p className="text-sm text-muted-foreground">{caseItem.case_type}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-muted text-foreground text-xs rounded-sm">
                      {caseItem.case_stage}
                    </span>
                  </div>
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

export default Dashboard;