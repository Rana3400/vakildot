import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scale, Video, Star, Shield, ChevronLeft, ChevronRight, Users, UserCheck, Moon, Sun, Briefcase, Building, Landmark, Home } from 'lucide-react';
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

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">VakilDot</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#about" className="text-sm font-medium hover:opacity-70">About</a>
            <a href="#lawyers" className="text-sm font-medium hover:opacity-70">Find Lawyer</a>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant={darkMode ? "outline" : "default"} onClick={() => navigate('/signin')}>Sign In</Button>
          </nav>
        </div>
      </header>

      {/* Join VakilDot - Sign Up Cards FIRST */}
      <section className={`py-12 px-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-3">Join VakilDot Today</h1>
          <p className={`text-center mb-10 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>India's Premier Legal Consultation Platform</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Lawyer Card */}
            <Card className={`cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-gray-500 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} onClick={() => navigate('/signup/lawyer')}>
              <CardContent className="pt-10 pb-10 text-center">
                <div className={`h-20 w-20 ${darkMode ? 'bg-white text-black' : 'bg-black text-white'} rounded-lg flex items-center justify-center mx-auto mb-6`}>
                  <UserCheck className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Join as Lawyer</h3>
                <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Go live, consult clients, manage cases, and earn per minute
                </p>
                <Button size="lg" className={`w-full ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                  Sign Up as Lawyer
                </Button>
              </CardContent>
            </Card>

            {/* Client Card */}
            <Card className={`cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-gray-500 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} onClick={() => navigate('/signup/client')}>
              <CardContent className="pt-10 pb-10 text-center">
                <div className={`h-20 w-20 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-lg flex items-center justify-center mx-auto mb-6`}>
                  <Users className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Join as Client</h3>
                <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Get instant legal advice from verified lawyers via video call
                </p>
                <Button size="lg" variant="outline" className="w-full">Sign Up as Client</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Consultations */}
      <section className={`py-12 px-4 ${darkMode ? 'bg-black' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2">Live Legal Consultations</h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Talk to a Verified Lawyer Now</p>
          
          {/* Join Live Stream Button - For Clients */}
          <Button 
            data-testid="join-live-stream-btn"
            size="lg" 
            className={`mb-8 px-8 py-6 text-lg ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white`}
            onClick={() => navigate('/signin')}
          >
            <Video className="h-5 w-5 mr-2" />
            Join Live Stream
          </Button>
          
          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Select value={selectedState || 'all'} onValueChange={(v) => setSelectedState(v === 'all' ? '' : v)}>
              <SelectTrigger className={`w-[200px] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={selectedCourt || 'all'} onValueChange={(v) => setSelectedCourt(v === 'all' ? '' : v)} disabled={!selectedState}>
              <SelectTrigger className={`w-[220px] ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                <SelectValue placeholder="Select Court" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courts</SelectItem>
                {courts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Live Lawyers Slider */}
      <section id="lawyers" className={`py-8 px-4 ${darkMode ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-2xl font-bold">Live Now</h2>
            <Badge variant="destructive">{lawyers.length} Online</Badge>
          </div>

          <div className="relative">
            <Button variant="outline" size="icon" className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 rounded-full h-12 w-12" onClick={() => scrollContainer('left')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div id="lawyers-slider" className="flex gap-6 overflow-x-auto px-2 py-4" style={{ scrollbarWidth: 'none' }}>
              {lawyers.map(lawyer => (
                <Card key={lawyer.id} className={`w-[280px] flex-shrink-0 hover:shadow-2xl transition-all cursor-pointer border-2 ${darkMode ? 'bg-gray-900 border-gray-800 hover:border-gray-600' : 'bg-white hover:border-black'}`} onClick={() => navigate('/signin')}>
                  <div className="relative">
                    <div className={`h-48 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center relative`}>
                      <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                        <AvatarFallback className={`text-4xl ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                          {lawyer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Badge className="absolute top-3 left-3 bg-red-500"><span className="h-2 w-2 bg-white rounded-full mr-1 animate-pulse"></span>LIVE</Badge>
                      {lawyer.is_verified && <Badge className="absolute top-3 right-3 bg-black text-white"><Shield className="h-3 w-3 mr-1" />VERIFIED</Badge>}
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-bold text-lg">{lawyer.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{lawyer.court}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{lawyer.rating}</span>
                      </div>
                      <span className="text-lg font-bold">₹{lawyer.rate_per_minute}<span className="text-xs font-normal">/min</span></span>
                    </div>
                    <Button className={`w-full mt-4 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                      <Video className="h-4 w-4 mr-2" />Join Stream
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="outline" size="icon" className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 rounded-full h-12 w-12" onClick={() => scrollContainer('right')}>
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Asset Recovery Section */}
      <section className={`py-16 px-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Asset Recovery Services</h2>
          <p className={`text-center mb-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recover your unclaimed assets with expert legal help</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Briefcase, title: 'IEPF Shares', desc: 'Recover unclaimed shares & dividends' },
              { icon: Shield, title: 'Insurance', desc: 'Unclaimed insurance policies' },
              { icon: Building, title: 'Bank Deposits', desc: 'Dormant bank accounts' },
              { icon: Home, title: 'Property', desc: 'Ancestral property claims' }
            ].map((item, i) => (
              <Card key={i} className={`cursor-pointer hover:shadow-xl transition-all text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} onClick={() => navigate('/asset-recovery')}>
                <CardContent className="pt-8 pb-8">
                  <item.icon className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-white' : 'text-black'}`} />
                  <h3 className="font-bold">{item.title}</h3>
                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button size="lg" variant="outline" onClick={() => navigate('/asset-recovery')}>Check Your Eligibility</Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className={`py-16 px-4 ${darkMode ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">About VakilDot</h2>
          <p className={`text-lg leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            VakilDot is India's premier Legal-Tech platform connecting clients with verified advocates through instant video consultations. 
            Our pay-per-minute model ensures fair billing, while our Asset Recovery division specializes in reclaiming unclaimed shares, 
            insurance policies, bank deposits, and ancestral properties. Trusted by advocates across District Courts, High Courts, 
            and the Supreme Court of India.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-4 ${darkMode ? 'bg-gray-950 border-t border-gray-800' : 'bg-gray-100'}`}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">VakilDot</span>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>The Digital Munshi for Indian Advocates</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
