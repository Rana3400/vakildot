import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Phone, Clock, DollarSign, Star, MessageSquare, 
  Video, Play, Download, ChevronRight, Calendar,
  User, Gavel, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CallHistory = () => {
  const navigate = useNavigate();
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [chatTranscript, setChatTranscript] = useState([]);
  const [stats, setStats] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');
  const token = localStorage.getItem('vakildot_token');

  useEffect(() => {
    fetchCallHistory();
    fetchStats();
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchCallHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/calls/history/${user.id}?role=${user.user_role}`, getAuthHeaders());
      setCallHistory(res.data.history || []);
    } catch (e) {
      console.error('Failed to fetch call history');
      // Dummy data for testing
      setCallHistory([
        {
          session_id: 'session_1',
          client_name: 'Rahul Sharma',
          lawyer_name: 'Adv. Priya Sharma',
          start_time: new Date().toISOString(),
          duration_minutes: 15,
          total_amount: 300,
          rating: 5,
          recording_status: 'completed',
          chat_message_count: 12
        },
        {
          session_id: 'session_2',
          client_name: 'Amit Kumar',
          lawyer_name: 'Adv. Rajesh Kumar',
          start_time: new Date(Date.now() - 86400000).toISOString(),
          duration_minutes: 8,
          total_amount: 160,
          rating: 4,
          recording_status: 'completed',
          chat_message_count: 5
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const endpoint = user.user_role === 'lawyer' 
        ? `${API}/calls/stats/lawyer/${user.id}` 
        : `${API}/calls/history/${user.id}?role=client`;
      const res = await axios.get(endpoint, getAuthHeaders());
      
      if (user.user_role === 'lawyer') {
        setStats(res.data);
      } else {
        // Calculate client stats from history
        const history = res.data.history || [];
        setStats({
          total_calls: history.length,
          total_minutes: history.reduce((acc, c) => acc + (c.duration_minutes || 0), 0),
          total_spent: history.reduce((acc, c) => acc + (c.total_amount || 0), 0)
        });
      }
    } catch (e) {
      // Dummy stats
      setStats({
        total_calls: 25,
        total_minutes: 180,
        total_earnings: 5400,
        total_spent: 2500,
        average_rating: 4.7
      });
    }
  };

  const fetchCallDetail = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/calls/detail/${sessionId}`, getAuthHeaders());
      setSelectedCall(res.data.call_record);
      setChatTranscript(res.data.chat_transcript || []);
      setShowDetailModal(true);
    } catch (e) {
      // Show with existing data
      const call = callHistory.find(c => c.session_id === sessionId);
      setSelectedCall(call);
      setChatTranscript([]);
      setShowDetailModal(true);
    }
  };

  const formatDuration = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Call History</h1>
          <p className="text-muted-foreground">View your past consultations and recordings</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_calls}</p>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(stats.total_minutes)}</p>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ₹{(user.user_role === 'lawyer' ? stats.total_earnings : stats.total_spent)?.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.user_role === 'lawyer' ? 'Total Earnings' : 'Total Spent'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.user_role === 'lawyer' && stats.average_rating && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Star className="h-6 w-6 text-amber-600 fill-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.average_rating}</p>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Call List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Recent Consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading history...</p>
            </div>
          ) : callHistory.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No calls yet</h3>
              <p className="text-muted-foreground">Your consultation history will appear here</p>
              <Button className="mt-4" onClick={() => navigate('/')}>
                Find a Lawyer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {callHistory.map((call, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => fetchCallDetail(call.session_id)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-white shadow">
                      <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white">
                        {(user.user_role === 'lawyer' ? call.client_name : call.lawyer_name)?.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {user.user_role === 'lawyer' ? call.client_name : call.lawyer_name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(call.start_time)}
                        </span>
                        <span>{formatTime(call.start_time)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.duration_minutes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {call.rating && (
                          <Badge variant="outline" className="text-amber-600">
                            <Star className="h-3 w-3 mr-1 fill-amber-500" />
                            {call.rating}
                          </Badge>
                        )}
                        {call.chat_message_count > 0 && (
                          <Badge variant="outline">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {call.chat_message_count} messages
                          </Badge>
                        )}
                        {call.recording_status === 'completed' && (
                          <Badge variant="outline" className="text-green-600">
                            <Play className="h-3 w-3 mr-1" />
                            Recording
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      ₹{call.total_amount}
                    </p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="chat">
                  Chat Transcript
                  {chatTranscript.length > 0 && (
                    <Badge className="ml-2" variant="secondary">{chatTranscript.length}</Badge>
                  )}
                </TabsTrigger>
                {selectedCall.recording_status === 'completed' && (
                  <TabsTrigger value="recording">Recording</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="details">
                <div className="space-y-6">
                  {/* Participants */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{selectedCall.client_name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedCall.client_name}</p>
                        <p className="text-sm text-muted-foreground">Client</p>
                      </div>
                    </div>
                    <Video className="h-6 w-6 text-muted-foreground" />
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">{selectedCall.lawyer_name}</p>
                        <p className="text-sm text-muted-foreground">Lawyer</p>
                      </div>
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{selectedCall.lawyer_name?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Call Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                      <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(selectedCall.start_time)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                      <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(selectedCall.duration_minutes)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                      <DollarSign className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">₹{selectedCall.total_amount}</p>
                    </div>
                    {selectedCall.rating && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                        <Star className="h-5 w-5 mx-auto mb-2 text-amber-500 fill-amber-500" />
                        <p className="text-sm text-muted-foreground">Rating</p>
                        <p className="font-medium">{selectedCall.rating}/5</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat">
                <ScrollArea className="h-[400px] pr-4">
                  {chatTranscript.length > 0 ? (
                    <div className="space-y-4">
                      {chatTranscript.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.sender_role === 'lawyer' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_role === 'lawyer'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`}
                          >
                            <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                            <p>{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No chat messages during this call</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {selectedCall.recording_status === 'completed' && (
                <TabsContent value="recording">
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Call Recording Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Duration: {formatDuration(selectedCall.duration_minutes)}
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        Play Recording
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallHistory;
