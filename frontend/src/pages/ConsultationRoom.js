import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Video, VideoOff, Mic, MicOff, Phone, Clock, Wallet, Shield, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CallChat from '@/components/CallChat';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [remoteUsers, setRemoteUsers] = useState([]);
  const timerRef = useRef(null);
  const clientRef = useRef(null);
  const localTrackRef = useRef({ video: null, audio: null });
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');

  useEffect(() => {
    fetchLawyerDetails();
    fetchWallet();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      leaveChannel();
    };
  }, [lawyerId]);

  const fetchLawyerDetails = async () => {
    try {
      const res = await axios.get(`${API}/live/lawyers/live`);
      const found = res.data.lawyers.find(l => l.id === lawyerId);
      setLawyer(found || {
        id: lawyerId, name: 'Advocate', rate_per_minute: 20,
        specialization: 'Legal Consultation', is_verified: true
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
      setWallet({ balance: 0 });
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

      // Get Agora token from backend
      const tokenRes = await axios.get(`${API}/live/agora-token?channel_name=${channelName}&uid=0`);
      const { app_id, token: agoraToken } = tokenRes.data;

      if (!app_id) {
        toast.error('Video service not configured');
        return;
      }

      // Start call session
      await axios.post(`${API}/calls/start?session_id=${newSessionId}&client_id=${user.id}&client_name=${user.name}&lawyer_id=${lawyerId}&lawyer_name=${lawyer.name}&channel_name=${channelName}&rate_per_minute=${lawyer.rate_per_minute}`);

      await axios.post(`${API}/live/session/start`, {
        client_id: user.id, lawyer_id: lawyerId, channel_name: channelName
      });

      // Initialize Agora
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === 'video' && remoteVideoRef.current) {
          remoteUser.videoTrack.play(remoteVideoRef.current);
        }
        if (mediaType === 'audio') {
          remoteUser.audioTrack.play();
        }
        setRemoteUsers(prev => [...prev.filter(u => u.uid !== remoteUser.uid), remoteUser]);
      });

      client.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'video') {
          setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        }
      });

      client.on('user-left', (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      });

      // Join channel
      await client.join(app_id, channelName, agoraToken || null, 0);

      // Create and publish local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localTrackRef.current = { audio: audioTrack, video: videoTrack };

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }
      await client.publish([audioTrack, videoTrack]);

      setSessionId(newSessionId);
      setInCall(true);
      toast.success('Call connected!');

      // Start billing timer
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          const newTime = prev + 1;
          if (newTime % 60 === 0) deductMinute();
          return newTime;
        });
      }, 1000);

    } catch (e) {
      console.error('Call start error:', e);
      toast.error('Failed to start call: ' + (e.message || 'Unknown error'));
      leaveChannel();
    }
  };

  const leaveChannel = async () => {
    try {
      if (localTrackRef.current.audio) {
        localTrackRef.current.audio.stop();
        localTrackRef.current.audio.close();
      }
      if (localTrackRef.current.video) {
        localTrackRef.current.video.stop();
        localTrackRef.current.video.close();
      }
      if (clientRef.current) {
        await clientRef.current.leave();
      }
    } catch (e) {
      console.error('Leave error:', e);
    }
    localTrackRef.current = { video: null, audio: null };
    clientRef.current = null;
    setRemoteUsers([]);
  };

  const toggleVideo = async () => {
    if (localTrackRef.current.video) {
      await localTrackRef.current.video.setEnabled(!videoEnabled);
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localTrackRef.current.audio) {
      await localTrackRef.current.audio.setEnabled(!audioEnabled);
      setAudioEnabled(!audioEnabled);
    }
  };

  const deductMinute = async () => {
    if (!lawyer) return;
    try {
      const res = await axios.post(`${API}/live/wallet/deduct?user_id=${user.id}&amount=${lawyer.rate_per_minute}&lawyer_id=${lawyerId}&session_id=${sessionId || 'unknown'}`);
      if (res.data.success) {
        setTotalCost(prev => prev + lawyer.rate_per_minute);
        setWallet(prev => ({ ...prev, balance: res.data.new_balance }));
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
    
    await leaveChannel();
    setInCall(false);
    setChatOpen(false);

    if (sessionId) {
      try {
        await axios.post(`${API}/calls/end?session_id=${sessionId}&duration_seconds=${timer}&total_amount=${totalCost}`);
      } catch (e) {
        console.error('Failed to end session');
      }
    }

    toast.success(`Call ended. Total: ₹${totalCost}`);
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
    <div data-testid="consultation-room" className="max-w-4xl mx-auto space-y-6">
      {/* Lawyer Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-green-500">
              <AvatarImage src={lawyer.profile_photo} />
              <AvatarFallback className="text-xl sm:text-2xl bg-primary text-primary-foreground">
                {lawyer.name?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">{lawyer.name}</h1>
                {lawyer.is_verified && <Shield className="h-5 w-5 text-blue-500" />}
              </div>
              <p className="text-muted-foreground text-sm">{lawyer.specialization}</p>
              <p className="text-sm text-muted-foreground">{lawyer.court}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium text-sm">{lawyer.rating || 4.8}</span>
                </div>
                <Badge variant="outline">₹{lawyer.rate_per_minute}/min</Badge>
              </div>
            </div>
            <div className="text-left sm:text-right">
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
        <div className={`aspect-video bg-gray-900 relative ${inCall ? '' : 'flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900'}`}>
          {inCall ? (
            <>
              {/* Remote Video (big) */}
              <div ref={remoteVideoRef} className="absolute inset-0 bg-gray-900" data-testid="remote-video">
                {remoteUsers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p>Waiting for lawyer to join...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Local Video (small PiP) */}
              <div ref={localVideoRef} data-testid="local-video"
                className="absolute bottom-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-lg overflow-hidden border-2 border-white shadow-xl bg-gray-800 z-10"
              />

              {/* Timer & Cost */}
              <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg z-10">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-xl" data-testid="call-timer">{formatTime(timer)}</span>
                </div>
                <p className="text-sm text-green-400">₹{totalCost} spent</p>
              </div>

              {/* Low Balance Warning */}
              {wallet.balance < lawyer.rate_per_minute * 3 && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg animate-pulse z-10">
                  Low Balance!
                </div>
              )}
            </>
          ) : (
            <div className="text-white text-center p-8">
              <Video className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold mb-2">Ready to Connect?</h3>
              <p className="text-gray-400 mb-4">Start a video consultation with {lawyer.name}</p>
              <p className="text-sm text-yellow-400">
                Rate: ₹{lawyer.rate_per_minute}/min | Min balance: ₹{lawyer.rate_per_minute * 5} (5 mins)
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {inCall && (
              <>
                <Button 
                  data-testid="toggle-audio-btn"
                  variant={audioEnabled ? "secondary" : "destructive"}
                  size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14"
                  onClick={toggleAudio}
                >
                  {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button 
                  data-testid="toggle-video-btn"
                  variant={videoEnabled ? "secondary" : "destructive"}
                  size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14"
                  onClick={toggleVideo}
                >
                  {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
              </>
            )}
            
            {inCall ? (
              <Button 
                data-testid="end-call-btn"
                variant="destructive" size="lg"
                className="rounded-full h-12 sm:h-14 px-6 sm:px-8"
                onClick={endCall}
              >
                <Phone className="h-5 w-5 mr-2 rotate-[135deg]" />
                End Call
              </Button>
            ) : (
              <Button 
                data-testid="start-call-btn"
                size="lg"
                className="rounded-full h-12 sm:h-14 px-6 sm:px-8 bg-green-600 hover:bg-green-700"
                onClick={startCall}
              >
                <Video className="h-5 w-5 mr-2" />
                Start Consultation
              </Button>
            )}

            {inCall && (
              <Button 
                data-testid="toggle-chat-btn"
                variant={chatOpen ? "default" : "secondary"}
                size="lg"
                className={`rounded-full h-12 w-12 sm:h-14 sm:w-14 ${chatOpen ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                onClick={() => setChatOpen(!chatOpen)}
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Chat */}
      {sessionId && (
        <CallChat
          sessionId={sessionId} userId={user.id} userName={user.name}
          userRole={user.user_role} isOpen={chatOpen}
          onClose={() => setChatOpen(false)} otherPartyName={lawyer?.name}
        />
      )}
    </div>
  );
};

export default ConsultationRoom;
