import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scale, Video, Star, Shield, ChevronLeft, ChevronRight, Users, UserCheck, Moon, Sun, Briefcase, Building, Home, Gavel, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Welcome = () => {
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState([]);
  const [states, setStates] = useState([]);
  const [courts, setCourts] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchStates();
    fetchLiveLawyers();
  }, []);

  useEffect(() => {
    fetchLiveLawyers();
  }, [selectedState, selectedCourt]);

  useEffect(() => {
    if (selectedState) fetchCourts(selectedState);
    else { setCourts([]); setSelectedCourt(''); }
  }, [selectedState]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const fetchStates = async () => {
    try {
      const res = await axios.get(`${API}/live/filters/states`);
      setStates(res.data.states);
    } catch (e) {}
  };

  const fetchCourts = async (state) => {
    try {
      const res = await axios.get(`${API}/live/filters/courts/${state}`);
      setCourts(res.data.courts);
    } catch (e) {}
  };

  const fetchLiveLawyers = async () => {
    try {
      let url = `${API}/live/lawyers/live`;
      const params = new URLSearchParams();
      if (selectedState) params.append('state', selectedState);
      if (selectedCourt) params.append('court', selectedCourt);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await axios.get(url);
      setLawyers(res.data.lawyers);
    } catch (e) {}
  };

  const scrollContainer = (direction) => {
    const container = document.getElementById('lawyers-slider');
    if (container) container.scrollBy({ left: direction === 'left' ? -350 : 350, behavior: 'smooth' });
  };

  // Professional Law Firm Color Classes
  const theme = {
    light: {
      bg: 'bg-gradient-to-b from-slate-50 to-white',
      headerBg: 'bg-white/95 backdrop-blur-md',
      cardBg: 'bg-white',
      sectionBg: 'bg-slate-50',
      text: 'text-slate-900',
      textMuted: 'text-slate-600',
      border: 'border-slate-200',
      accentText: 'text-amber-600',
    },
    dark: {
      bg: 'bg-gradient-to-b from-slate-950 to-slate-900',
      headerBg: 'bg-slate-950/95 backdrop-blur-md',
      cardBg: 'bg-slate-800/80',
      sectionBg: 'bg-slate-900',
      text: 'text-white',
      textMuted: 'text-slate-300',
      border: 'border-slate-700',
      accentText: 'text-amber-400',
    }
  };

  const t = darkMode ? theme.dark : theme.light;

  return (
    <div className={`min-h-screen ${t.bg} ${t.text}`}>
      {/* Header */}
      <header className={`${t.headerBg} ${t.border} border-b sticky top-0 z-50 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
              <Scale className={`h-7 w-7 ${t.accentText}`} />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight">VakilDot</span>
              <p className={`text-[10px] uppercase tracking-widest ${t.textMuted}`}>Legal Excellence</p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#about" className={`text-sm font-medium ${t.textMuted} hover:${t.text} transition-colors`}>About</a>
            <a href="#lawyers" className={`text-sm font-medium ${t.textMuted} hover:${t.text} transition-colors`}>Find Lawyer</a>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setDarkMode(!darkMode)}
              className={`rounded-full ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
            </Button>
            <Button 
              className={`${darkMode ? 'bg-amber-500 hover:bg-amber-600 text-slate-900' : 'bg-slate-900 hover:bg-slate-800 text-white'} font-semibold px-6`}
              onClick={() => navigate('/signin')}
            >
              Sign In
            </Button>
          </nav>
        </div>
      </header>

      {/* SECTION 1: Join VakilDot Today - FIRST */}
      <section className={`py-20 px-4 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-slate-100 via-white to-slate-100'}`}>
        <div className="max-w-5xl mx-auto">
          <h1 className={`text-5xl md:text-6xl font-bold text-center mb-4 ${t.text}`}>
            Join <span className={t.accentText}>VakilDot</span> Today
          </h1>
          <p className={`text-center text-xl mb-12 ${t.textMuted}`}>India's Premier Legal Consultation Platform</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Lawyer Card - 3D */}
            <Card 
              className={`cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 ${
                darkMode 
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-amber-500/50' 
                  : 'bg-white border-slate-200 hover:border-amber-500'
              }`}
              style={{ boxShadow: darkMode ? '0 25px 50px -15px rgba(0,0,0,0.5)' : '0 25px 50px -15px rgba(0,0,0,0.1)' }}
              onClick={() => navigate('/signup/lawyer')}
            >
              <CardContent className="pt-12 pb-12 text-center">
                <div className={`h-24 w-24 mx-auto mb-8 rounded-2xl flex items-center justify-center transform rotate-3 ${
                  darkMode 
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30' 
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg shadow-slate-900/30'
                }`}>
                  <UserCheck className={`h-12 w-12 ${darkMode ? 'text-slate-900' : 'text-white'}`} />
                </div>
                <h3 className={`text-2xl font-bold mb-3 ${t.text}`}>Join as Lawyer</h3>
                <p className={`mb-8 ${t.textMuted}`}>
                  Go live, consult clients, manage cases, and earn per minute
                </p>
                <Button 
                  size="lg" 
                  className={`w-full h-14 text-base font-semibold ${
                    darkMode 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900' 
                      : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white'
                  }`}
                >
                  Sign Up as Lawyer
                </Button>
              </CardContent>
            </Card>

            {/* Client Card - 3D */}
            <Card 
              className={`cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 ${
                darkMode 
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-amber-500/50' 
                  : 'bg-white border-slate-200 hover:border-amber-500'
              }`}
              style={{ boxShadow: darkMode ? '0 25px 50px -15px rgba(0,0,0,0.5)' : '0 25px 50px -15px rgba(0,0,0,0.1)' }}
              onClick={() => navigate('/signup/client')}
            >
              <CardContent className="pt-12 pb-12 text-center">
                <div className={`h-24 w-24 mx-auto mb-8 rounded-2xl flex items-center justify-center transform -rotate-3 ${
                  darkMode 
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg' 
                    : 'bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg'
                }`}>
                  <Users className={`h-12 w-12 ${darkMode ? 'text-white' : 'text-slate-700'}`} />
                </div>
                <h3 className={`text-2xl font-bold mb-3 ${t.text}`}>Join as Client</h3>
                <p className={`mb-8 ${t.textMuted}`}>
                  Get instant legal advice from verified lawyers via video call
                </p>
                <Button 
                  size="lg" 
                  variant="outline"
                  className={`w-full h-14 text-base font-semibold ${
                    darkMode 
                      ? 'border-slate-600 text-white hover:bg-slate-800' 
                      : 'border-slate-300 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Sign Up as Client
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 2: Live Legal Consultations */}
      <section className={`py-16 px-4 ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <Badge className={`mb-6 px-4 py-2 text-sm font-medium ${darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse inline-block"></span>
            {lawyers.length} Lawyers Online Now
          </Badge>
          
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${t.text}`}>
            Live Legal <span className={t.accentText}>Consultations</span>
          </h2>
          <p className={`text-xl mb-8 ${t.textMuted}`}>Talk to a Verified Lawyer Now • Pay Per Minute</p>
          
          {/* Join Live Stream Button */}
          <Button 
            data-testid="join-live-stream-btn"
            size="lg" 
            className="mb-10 px-10 py-7 text-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 transform hover:scale-105 transition-all duration-300"
            onClick={() => navigate('/signin')}
          >
            <Video className="h-6 w-6 mr-3" />
            Join Live Stream
          </Button>
          
          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <Select value={selectedState || 'all'} onValueChange={(v) => setSelectedState(v === 'all' ? '' : v)}>
              <SelectTrigger className={`w-[220px] h-12 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} shadow-md`}>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={selectedCourt || 'all'} onValueChange={(v) => setSelectedCourt(v === 'all' ? '' : v)} disabled={!selectedState}>
              <SelectTrigger className={`w-[240px] h-12 ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} shadow-md`}>
                <SelectValue placeholder="Select Court" />
              </SelectTrigger>
              <SelectContent className={darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <SelectItem value="all">All Courts</SelectItem>
                {courts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* SECTION 3: Live Lawyers Slider */}
      <section id="lawyers" className={`py-12 px-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-4 w-4 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
            <h2 className={`text-3xl font-bold ${t.text}`}>Live Now</h2>
            <Badge className="bg-red-500 text-white px-3 py-1">{lawyers.length} Online</Badge>
          </div>

          <div className="relative">
            <Button 
              variant="outline" 
              size="icon" 
              className={`absolute -left-2 top-1/2 -translate-y-1/2 z-10 rounded-full h-14 w-14 shadow-xl ${darkMode ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'}`}
              onClick={() => scrollContainer('left')}
            >
              <ChevronLeft className="h-7 w-7" />
            </Button>

            <div id="lawyers-slider" className="flex gap-6 overflow-x-auto px-4 py-6" style={{ scrollbarWidth: 'none' }}>
              {lawyers.map(lawyer => (
                <Card 
                  key={lawyer.id} 
                  className={`w-[300px] flex-shrink-0 cursor-pointer overflow-hidden transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 ${
                    darkMode 
                      ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 hover:border-amber-500/50' 
                      : 'bg-white border-slate-200 hover:border-amber-500'
                  } shadow-xl hover:shadow-2xl`}
                  style={{ boxShadow: darkMode ? '0 20px 40px -15px rgba(0,0,0,0.5)' : '0 20px 40px -15px rgba(0,0,0,0.15)' }}
                  onClick={() => navigate('/signin')}
                >
                  {/* Card Header with Profile */}
                  <div className={`relative h-52 ${darkMode ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className={`absolute inset-0 rounded-full ${darkMode ? 'bg-amber-500/20' : 'bg-amber-100'} blur-xl scale-110`}></div>
                        <Avatar className="h-36 w-36 border-4 border-white shadow-2xl relative z-10">
                          {lawyer.profile_photo && <AvatarImage src={lawyer.profile_photo} alt={lawyer.name} className="object-cover" />}
                          <AvatarFallback className={`text-4xl font-bold ${darkMode ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900' : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'}`}>
                            {lawyer.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    <Badge className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 shadow-lg shadow-red-500/50">
                      <span className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse"></span>
                      LIVE
                    </Badge>
                    
                    {lawyer.is_verified && (
                      <Badge className={`absolute top-4 right-4 ${darkMode ? 'bg-amber-500 text-slate-900' : 'bg-slate-900 text-white'} px-3 py-1.5 shadow-lg`}>
                        <Shield className="h-3 w-3 mr-1" />
                        VERIFIED
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="pt-5 pb-6">
                    <h3 className={`font-bold text-xl mb-1 ${t.text}`}>{lawyer.name}</h3>
                    <p className={`text-sm ${t.textMuted} flex items-center gap-1`}>
                      <Gavel className="h-3 w-3" />
                      {lawyer.court}
                    </p>
                    
                    <div className={`flex items-center justify-between mt-4 py-3 border-t border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <span className={`font-semibold ${t.text}`}>{lawyer.rating}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${t.textMuted}`}>
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Available</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-bold ${t.accentText}`}>₹{lawyer.rate_per_minute}</span>
                        <span className={`text-xs ${t.textMuted}`}>/min</span>
                      </div>
                    </div>
                    
                    <Button 
                      className={`w-full mt-4 h-12 text-base font-semibold ${
                        darkMode 
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 shadow-lg shadow-amber-500/30' 
                          : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white shadow-lg shadow-slate-900/30'
                      }`}
                    >
                      <Video className="h-5 w-5 mr-2" />
                      Join Stream
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              className={`absolute -right-2 top-1/2 -translate-y-1/2 z-10 rounded-full h-14 w-14 shadow-xl ${darkMode ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-white hover:bg-slate-50'}`}
              onClick={() => scrollContainer('right')}
            >
              <ChevronRight className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 4: Asset Recovery */}
      <section className={`py-20 px-4 ${darkMode ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'}`}>
        <div className="max-w-6xl mx-auto">
          <Badge className="block w-fit mx-auto mb-6 bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-1.5">
            <Award className="h-4 w-4 mr-2 inline" />
            Specialized Service
          </Badge>
          <h2 className="text-4xl font-bold text-center mb-4 text-white">Asset Recovery Services</h2>
          <p className="text-center mb-14 text-slate-300">Recover your unclaimed assets with expert legal help</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Briefcase, title: 'IEPF Shares', desc: 'Recover unclaimed shares & dividends', color: 'from-blue-500 to-blue-600' },
              { icon: Shield, title: 'Insurance', desc: 'Unclaimed insurance policies', color: 'from-green-500 to-green-600' },
              { icon: Building, title: 'Bank Deposits', desc: 'Dormant bank accounts', color: 'from-purple-500 to-purple-600' },
              { icon: Home, title: 'Property', desc: 'Ancestral property claims', color: 'from-orange-500 to-orange-600' }
            ].map((item, i) => (
              <Card 
                key={i} 
                className="cursor-pointer bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 text-center backdrop-blur-sm"
                style={{ boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)' }}
                onClick={() => navigate('/asset-recovery')}
              >
                <CardContent className="pt-10 pb-10">
                  <div className={`h-16 w-16 mx-auto mb-5 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold px-10 h-14 shadow-lg shadow-amber-500/30"
              onClick={() => navigate('/asset-recovery')}
            >
              Check Your Eligibility
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 5: About */}
      <section id="about" className={`py-20 px-4 ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className={`inline-flex items-center justify-center p-4 rounded-2xl mb-8 ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
            <Scale className={`h-10 w-10 ${t.accentText}`} />
          </div>
          <h2 className={`text-4xl font-bold mb-6 ${t.text}`}>About VakilDot</h2>
          <p className={`text-lg leading-relaxed ${t.textMuted}`}>
            VakilDot is India's premier Legal-Tech platform connecting clients with verified advocates through instant video consultations. 
            Our pay-per-minute model ensures fair billing, while our Asset Recovery division specializes in reclaiming unclaimed shares, 
            insurance policies, bank deposits, and ancestral properties. Trusted by advocates across District Courts, High Courts, 
            and the Supreme Court of India.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 ${darkMode ? 'bg-slate-900 border-t border-slate-800' : 'bg-slate-900'}`}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Scale className="h-7 w-7 text-amber-500" />
            </div>
            <span className="text-2xl font-bold text-white">VakilDot</span>
          </div>
          <p className="text-sm text-slate-400">The Digital Munshi for Indian Advocates</p>
          <div className="flex justify-center gap-6 mt-6 text-sm text-slate-500">
            <span>© 2024 VakilDot</span>
            <span>•</span>
            <a href="#" className="hover:text-amber-500 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-amber-500 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
