import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Video, VideoOff, Mic, MicOff, Phone, Clock, Wallet, Shield, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CallChat from '@/components/CallChat';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID;

const ConsultationRoom = () => {
  const { lawyerId } = useParams();
  const navigate = useNavigate();
  const [lawyer, setLawyer] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [inCall, setInCall] = useState(false);
  const [timer, setTimer] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const timerRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');

  useEffect(() => {
    fetchLawyerDetails();
    fetchWallet();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lawyerId]);

  const fetchLawyerDetails = async () => {
    try {
      const res = await axios.get(`${API}/live/lawyers/live`);
      const found = res.data.lawyers.find(l => l.id === lawyerId);
      setLawyer(found || {
        id: lawyerId,
        name: 'Advocate',
        rate_per_minute: 30,
        specialization: 'Legal Consultation',
        is_verified: true
      });
    } catch (e) {
      console.error('Failed to fetch lawyer');
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API}/live/wallet/${user.id}`);
      setWallet(res.data);
    } catch (e) {
      setWallet({ balance: 500 }); // Dummy for testing
    }
  };

  const startCall = async () => {
    if (!lawyer) return;
    
    const minBalance = lawyer.rate_per_minute * 5;
    if (wallet.balance < minBalance) {
      toast.error(`Minimum ₹${minBalance} required (5 minutes). Please recharge.`);
      navigate('/wallet');
      return;
    }

    try {
      const channelName = `vakildot_${lawyerId}_${Date.now()}`;
      const newSessionId = `session_${Date.now()}_${user.id?.slice(0, 8)}`;
      
      // Start call session for history
      await axios.post(`${API}/calls/start?session_id=${newSessionId}&client_id=${user.id}&client_name=${user.name}&lawyer_id=${lawyerId}&lawyer_name=${lawyer.name}&channel_name=${channelName}&rate_per_minute=${lawyer.rate_per_minute}`);
      
      const res = await axios.post(`${API}/live/session/start`, {
        client_id: user.id,
        lawyer_id: lawyerId,
        channel_name: channelName
      });

      if (res.data.success) {
        setSessionId(newSessionId);
        setInCall(true);
        toast.success('Call connected!');
        
        // Start billing timer
        timerRef.current = setInterval(() => {
          setTimer(prev => {
            const newTime = prev + 1;
            // Deduct every minute
            if (newTime % 60 === 0) {
              deductMinute();
            }
            return newTime;
          });
        }, 1000);
      }
    } catch (e) {
      toast.error('Failed to start call');
    }
  };

  const deductMinute = async () => {
    if (!lawyer) return;
    
    try {
      const res = await axios.post(`${API}/live/wallet/deduct?user_id=${user.id}&amount=${lawyer.rate_per_minute}&description=Consultation with ${lawyer.name}`);
      if (res.data.success) {
        setTotalCost(prev => prev + lawyer.rate_per_minute);
        setWallet(prev => ({ ...prev, balance: res.data.new_balance }));
        
        // Auto-end if balance is low
        if (res.data.new_balance < lawyer.rate_per_minute) {
          toast.warning('Low balance! Call will end.');
          endCall();
        }
      }
    } catch (e) {
      if (e.response?.status === 400) {
        toast.error('Insufficient balance!');
        endCall();
      }
    }
  };

  const endCall = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setInCall(false);
    setChatOpen(false);
    
    // End call session in backend
    if (sessionId) {
      try {
        await axios.post(`${API}/calls/end?session_id=${sessionId}&duration_seconds=${timer}&total_amount=${totalCost}`);
      } catch (e) {
        console.error('Failed to end session');
      }
    }
    
    toast.success(`Call ended. Total: ₹${totalCost}`);
    
    // Show summary
    setTimeout(() => {
      alert(`Call Summary:\nDuration: ${formatTime(timer)}\nTotal Cost: ₹${totalCost}\nLawyer Share (80%): ₹${(totalCost * 0.8).toFixed(2)}\nPlatform Fee (20%): ₹${(totalCost * 0.2).toFixed(2)}`);
      navigate('/call-history');
    }, 500);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!lawyer) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Lawyer Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-green-500">
              <AvatarImage src={lawyer.photo} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {lawyer.name?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{lawyer.name}</h1>
                {lawyer.is_verified && <Shield className="h-5 w-5 text-blue-500" />}
              </div>
              <p className="text-muted-foreground">{lawyer.specialization}</p>
              <p className="text-sm text-muted-foreground">{lawyer.court}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{lawyer.rating || 4.8}</span>
                </div>
                <Badge variant="outline">₹{lawyer.rate_per_minute}/min</Badge>
                {lawyer.is_asset_recovery_expert && (
                  <Badge variant="secondary">Asset Recovery Expert</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-2xl font-bold text-green-600">₹{wallet.balance?.toFixed(2)}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/wallet')}>
                <Wallet className="h-4 w-4 mr-1" />Add Money
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Area */}
      <Card className="overflow-hidden">
        <div className={`aspect-video bg-gray-900 relative flex items-center justify-center ${inCall ? '' : 'bg-gradient-to-br from-gray-800 to-gray-900'}`}>
          {inCall ? (
            <>
              {/* Video placeholder - In production, Agora video would render here */}
              <div className="text-white text-center">
                <Video className="h-24 w-24 mx-auto mb-4 opacity-50" />
                <p className="text-xl">Video call in progress...</p>
                <p className="text-sm opacity-70 mt-2">Agora App ID: {AGORA_APP_ID?.slice(0, 8)}...</p>
              </div>

              {/* Timer & Cost Overlay */}
              <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-xl">{formatTime(timer)}</span>
                </div>
                <p className="text-sm text-green-400">₹{totalCost} spent</p>
              </div>

              {/* Balance Warning */}
              {wallet.balance < lawyer.rate_per_minute * 3 && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg animate-pulse">
                  Low Balance!
                </div>
              )}
            </>
          ) : (
            <div className="text-white text-center p-8">
              <Video className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold mb-2">Ready to Connect?</h3>
              <p className="text-gray-400 mb-4">Start a video consultation with {lawyer.name}</p>
              <p className="text-sm text-yellow-400 mb-4">
                Rate: ₹{lawyer.rate_per_minute}/minute | Min balance: ₹{lawyer.rate_per_minute * 5} (5 mins)
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4">
          <div className="flex items-center justify-center gap-4">
            {inCall && (
              <>
                <Button 
                  variant={audioEnabled ? "secondary" : "destructive"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>
                <Button 
                  variant={videoEnabled ? "secondary" : "destructive"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                >
                  {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                </Button>
              </>
            )}
            
            {inCall ? (
              <Button 
                variant="destructive"
                size="lg"
                className="rounded-full h-14 px-8"
                onClick={endCall}
              >
                <Phone className="h-6 w-6 mr-2 rotate-[135deg]" />
                End Call
              </Button>
            ) : (
              <Button 
                size="lg"
                className="rounded-full h-14 px-8 bg-green-600 hover:bg-green-700"
                onClick={startCall}
              >
                <Video className="h-6 w-6 mr-2" />
                Start Consultation
              </Button>
            )}

            {inCall && (
              <Button 
                variant={chatOpen ? "default" : "secondary"}
                size="lg"
                className={`rounded-full h-14 w-14 ${chatOpen ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                onClick={() => setChatOpen(!chatOpen)}
              >
                <MessageSquare className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Billing Info */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Billing Information</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">₹{lawyer.rate_per_minute}</p>
              <p className="text-sm text-muted-foreground">Per Minute</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-2xl font-bold text-green-600">80%</p>
              <p className="text-sm text-muted-foreground">To Lawyer</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">20%</p>
              <p className="text-sm text-muted-foreground">Platform Fee</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Component */}
      {sessionId && (
        <CallChat
          sessionId={sessionId}
          userId={user.id}
          userName={user.name}
          userRole={user.user_role}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          otherPartyName={lawyer?.name}
        />
      )}
    </div>
  );
};

export default ConsultationRoom;
