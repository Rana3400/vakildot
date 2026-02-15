import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, DollarSign, Phone, AlertTriangle, FileText, 
  CheckCircle, XCircle, Clock, TrendingUp, Shield, 
  Search, Filter, MoreVertical, Eye, Ban, UserCheck,
  Scale, LogOut, Settings, BarChart3, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('vakildot_admin_token'));
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    if (adminToken) {
      setIsAuthenticated(true);
      fetchDashboardData();
    }
  }, [adminToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/admin/login`, loginForm);
      if (res.data.success) {
        localStorage.setItem('vakildot_admin_token', res.data.token);
        setAdminToken(res.data.token);
        setIsAuthenticated(true);
        toast.success('Admin login successful');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vakildot_admin_token');
    setAdminToken(null);
    setIsAuthenticated(false);
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, txRes, disputesRes, leadsRes, verifyRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`, getAuthHeaders()),
        axios.get(`${API}/admin/users?limit=100`, getAuthHeaders()),
        axios.get(`${API}/admin/transactions?limit=50`, getAuthHeaders()),
        axios.get(`${API}/admin/disputes`, getAuthHeaders()),
        axios.get(`${API}/admin/leads`, getAuthHeaders()),
        axios.get(`${API}/admin/verification/pending`, getAuthHeaders())
      ]);
      
      setDashboardStats(statsRes.data);
      setUsers(usersRes.data.users || []);
      setTransactions(txRes.data.transactions || []);
      setDisputes(disputesRes.data.disputes || []);
      setLeads(leadsRes.data.leads || []);
      setPendingVerifications(verifyRes.data.lawyers || []);
    } catch (e) {
      console.error('Failed to fetch data:', e);
      if (e.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      await axios.post(`${API}/admin/users/action`, {
        user_id: userId,
        action: action,
        reason: actionReason
      }, getAuthHeaders());
      
      toast.success(`User ${action} successful`);
      setShowUserModal(false);
      setActionReason('');
      fetchDashboardData();
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const handleVerification = async (lawyerId, status) => {
    try {
      await axios.post(`${API}/admin/verification/update`, {
        lawyer_id: lawyerId,
        status: status,
        notes: actionReason
      }, getAuthHeaders());
      
      toast.success(`Lawyer ${status}`);
      setActionReason('');
      fetchDashboardData();
    } catch (e) {
      toast.error('Verification update failed');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.mobile?.includes(searchQuery) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = userFilter === 'all' || user.user_role === userFilter;
    return matchesSearch && matchesFilter;
  });

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-slate-700">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Scale className="h-10 w-10 text-amber-500" />
              <span className="text-3xl font-bold text-white">VakilDot</span>
            </div>
            <CardTitle className="text-white">Admin Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Admin Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(p => ({ ...p, email: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white"
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(p => ({ ...p, password: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="h-8 w-8 text-amber-500" />
            <div>
              <span className="text-xl font-bold">VakilDot Admin</span>
              <Badge className="ml-2 bg-amber-500/20 text-amber-400">Admin Panel</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-300 hover:text-white">
              View Site
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-300 hover:text-white">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Users</p>
                    <h3 className="text-3xl font-bold">{dashboardStats.users?.total_lawyers + dashboardStats.users?.total_clients}</h3>
                    <p className="text-xs text-blue-200 mt-1">
                      {dashboardStats.users?.total_lawyers} Lawyers • {dashboardStats.users?.total_clients} Clients
                    </p>
                  </div>
                  <Users className="h-12 w-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Revenue</p>
                    <h3 className="text-3xl font-bold">₹{dashboardStats.revenue?.total_revenue?.toLocaleString()}</h3>
                    <p className="text-xs text-green-200 mt-1">
                      Platform: ₹{dashboardStats.revenue?.platform_earnings?.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Total Calls</p>
                    <h3 className="text-3xl font-bold">{dashboardStats.calls?.total_calls}</h3>
                    <p className="text-xs text-purple-200 mt-1">
                      Today: {dashboardStats.calls?.today_calls}
                    </p>
                  </div>
                  <Phone className="h-12 w-12 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Pending Actions</p>
                    <h3 className="text-3xl font-bold">
                      {(dashboardStats.users?.pending_verification || 0) + (dashboardStats.disputes?.pending || 0)}
                    </h3>
                    <p className="text-xs text-orange-200 mt-1">
                      {dashboardStats.users?.pending_verification} Verifications • {dashboardStats.disputes?.pending} Disputes
                    </p>
                  </div>
                  <AlertTriangle className="h-12 w-12 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white dark:bg-slate-800 p-1 rounded-lg shadow">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />Users
            </TabsTrigger>
            <TabsTrigger value="verification" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" />Verification
              {pendingVerifications.length > 0 && (
                <Badge className="ml-2 bg-red-500">{pendingVerifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 mr-2" />Transactions
            </TabsTrigger>
            <TabsTrigger value="disputes" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <AlertTriangle className="h-4 w-4 mr-2" />Disputes
            </TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Briefcase className="h-4 w-4 mr-2" />Asset Leads
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{tx.client_name} → {tx.lawyer_name}</p>
                          <p className="text-sm text-muted-foreground">{tx.duration_minutes} mins</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">₹{tx.total_amount}</p>
                          <p className="text-xs text-muted-foreground">Platform: ₹{tx.platform_share?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Verifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingVerifications.slice(0, 5).map((lawyer, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{lawyer.name?.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{lawyer.name}</p>
                            <p className="text-sm text-muted-foreground">{lawyer.court || 'Court N/A'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleVerification(lawyer.id, 'approved')}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleVerification(lawyer.id, 'rejected')}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingVerifications.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No pending verifications</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="lawyer">Lawyers</SelectItem>
                        <SelectItem value="client">Clients</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.photo_url} />
                          <AvatarFallback className="bg-slate-200">{user.name?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            <Badge variant={user.user_role === 'lawyer' ? 'default' : 'secondary'}>
                              {user.user_role}
                            </Badge>
                            {user.is_verified && <Badge variant="outline" className="text-green-600"><Shield className="h-3 w-3 mr-1" />Verified</Badge>}
                            {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.mobile} • {user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedUser(user); setShowUserModal(true); }}>
                          <Eye className="h-4 w-4 mr-1" />View
                        </Button>
                        {!user.is_banned ? (
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleUserAction(user.id, 'ban')}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleUserAction(user.id, 'unban')}>
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>Lawyer Verification Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingVerifications.map((lawyer, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={lawyer.photo_url} />
                            <AvatarFallback className="text-xl">{lawyer.name?.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-semibold">{lawyer.name}</h3>
                            <p className="text-muted-foreground">{lawyer.mobile} • {lawyer.email}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span><strong>Court:</strong> {lawyer.court || 'N/A'}</span>
                              <span><strong>Practice:</strong> {lawyer.practice_field || 'N/A'}</span>
                              <span><strong>Type:</strong> {lawyer.lawyer_type || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleVerification(lawyer.id, 'approved')}>
                            <CheckCircle className="h-4 w-4 mr-2" />Approve
                          </Button>
                          <Button variant="destructive" onClick={() => handleVerification(lawyer.id, 'rejected')}>
                            <XCircle className="h-4 w-4 mr-2" />Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingVerifications.length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <p className="text-xl font-medium">All caught up!</p>
                      <p className="text-muted-foreground">No pending verifications</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Client</th>
                        <th className="text-left py-3 px-4">Lawyer</th>
                        <th className="text-right py-3 px-4">Duration</th>
                        <th className="text-right py-3 px-4">Amount</th>
                        <th className="text-right py-3 px-4">Platform Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="py-3 px-4 text-sm">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{tx.client_name}</td>
                          <td className="py-3 px-4">{tx.lawyer_name}</td>
                          <td className="py-3 px-4 text-right">{tx.duration_minutes} min</td>
                          <td className="py-3 px-4 text-right font-medium text-green-600">₹{tx.total_amount}</td>
                          <td className="py-3 px-4 text-right text-amber-600">₹{tx.platform_share?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Dispute Management</CardTitle>
              </CardHeader>
              <CardContent>
                {disputes.length > 0 ? (
                  <div className="space-y-4">
                    {disputes.map((dispute, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant={dispute.status === 'pending' ? 'destructive' : 'secondary'}>
                              {dispute.status}
                            </Badge>
                            <h4 className="font-medium mt-2">{dispute.complaint_type}</h4>
                            <p className="text-sm text-muted-foreground">{dispute.description}</p>
                          </div>
                          {dispute.status === 'pending' && (
                            <Button>Resolve</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <p className="text-xl font-medium">No disputes</p>
                    <p className="text-muted-foreground">All clear!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Asset Leads Tab */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>Asset Recovery Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leads.map((lead, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{lead.name}</h4>
                            <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>{lead.status}</Badge>
                            <Badge variant="outline">{lead.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{lead.phone} • {lead.email}</p>
                          <p className="text-sm mt-1">Probability: <strong>{lead.probability}%</strong></p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Contact</Button>
                          <Button size="sm">Convert</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No leads yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Detail Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedUser.photo_url} />
                  <AvatarFallback className="text-2xl">{selectedUser.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.mobile} • {selectedUser.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge>{selectedUser.user_role}</Badge>
                    {selectedUser.is_verified && <Badge variant="outline" className="text-green-600">Verified</Badge>}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-muted-foreground">Court</p>
                  <p className="font-medium">{selectedUser.court || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-muted-foreground">Practice Field</p>
                  <p className="font-medium">{selectedUser.practice_field || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedUser.is_banned ? 'Banned' : 'Active'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Action Reason (optional)</label>
                <Textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason for action..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserModal(false)}>Close</Button>
            {selectedUser && !selectedUser.is_banned && (
              <Button variant="destructive" onClick={() => handleUserAction(selectedUser.id, 'ban')}>
                <Ban className="h-4 w-4 mr-2" />Ban User
              </Button>
            )}
            {selectedUser && selectedUser.is_banned && (
              <Button className="bg-green-600" onClick={() => handleUserAction(selectedUser.id, 'unban')}>
                <UserCheck className="h-4 w-4 mr-2" />Unban User
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
