import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scale, Video, Star, Shield, ChevronLeft, ChevronRight, Users, UserCheck, Phone } from 'lucide-react';
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

  useEffect(() => {
    fetchStates();
    fetchLiveLawyers();
  }, []);

  useEffect(() => {
    fetchLiveLawyers();
  }, [selectedState, selectedCourt]);

  useEffect(() => {
    if (selectedState) {
      fetchCourts(selectedState);
    } else {
      setCourts([]);
      setSelectedCourt('');
    }
  }, [selectedState]);

  const fetchStates = async () => {
    try {
      const res = await axios.get(`${API}/live/filters/states`);
      setStates(res.data.states);
    } catch (e) {
      console.error('Failed to load states');
    }
  };

  const fetchCourts = async (state) => {
    try {
      const res = await axios.get(`${API}/live/filters/courts/${state}`);
      setCourts(res.data.courts);
    } catch (e) {
      console.error('Failed to load courts');
    }
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
    } catch (e) {
      console.error('Failed to load lawyers');
    }
  };

  const scrollContainer = (direction) => {
    const container = document.getElementById('lawyers-slider');
    if (container) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">VakilDot</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#lawyers" className="text-sm font-medium hover:text-primary">Find Lawyers</a>
            <a href="#courts" className="text-sm font-medium hover:text-primary">Courts</a>
            <a href="#about" className="text-sm font-medium hover:text-primary">About</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/signin')}>Sign In</Button>
            <Button onClick={() => navigate('/signup/lawyer')} className="bg-cyan-500 hover:bg-cyan-600">
              <Video className="h-4 w-4 mr-2" />Join Live Stream
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Live Consultations */}
      <section className="py-12 px-4 bg-gradient-to-r from-cyan-100 to-blue-100">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Live Legal Consultations
          </h1>
          <p className="text-xl text-gray-600 mb-8">Talk to a Verified Lawyer Now</p>
          
          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Select value={selectedState} onValueChange={(v) => setSelectedState(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={selectedCourt} onValueChange={(v) => setSelectedCourt(v === 'all' ? '' : v)} disabled={!selectedState}>
              <SelectTrigger className="w-[220px] bg-white">
                <SelectValue placeholder="Select Court Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courts</SelectItem>
                {courts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Video className="h-4 w-4 mr-2" />Join a Live Stream
            </Button>
          </div>
        </div>
      </section>

      {/* Live Lawyers Slider */}
      <section id="lawyers" className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold">Live Now</h2>
              <Badge variant="destructive">{lawyers.length} Online</Badge>
            </div>
          </div>

          <div className="relative">
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full h-12 w-12"
              onClick={() => scrollContainer('left')}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div 
              id="lawyers-slider"
              className="flex gap-6 overflow-x-auto px-2 py-4 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {lawyers.map(lawyer => (
                <Card 
                  key={lawyer.id} 
                  className="w-[280px] flex-shrink-0 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-cyan-400 overflow-hidden"
                  onClick={() => navigate('/signin')}
                >
                  <div className="relative">
                    {/* Lawyer Image Placeholder */}
                    <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                      <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                        <AvatarImage src={lawyer.photo} />
                        <AvatarFallback className="text-4xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                          {lawyer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {/* Live Badge */}
                      <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                        <span className="h-2 w-2 bg-white rounded-full mr-1 animate-pulse"></span>
                        LIVE
                      </Badge>
                      {/* Verified Badge */}
                      {lawyer.is_verified && (
                        <Badge className="absolute top-3 right-3 bg-blue-500 text-white">
                          <Shield className="h-3 w-3 mr-1" />VERIFIED
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardContent className="pt-4">
                    <h3 className="font-bold text-lg">{lawyer.name}</h3>
                    <p className="text-sm text-gray-500">{lawyer.court}</p>
                    <p className="text-xs text-gray-400 mt-1">{lawyer.specialization}</p>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{lawyer.rating}</span>
                        <span className="text-xs text-gray-400">({lawyer.total_consultations})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-green-600">₹{lawyer.rate_per_minute}</span>
                        <span className="text-xs text-gray-400">/min</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600">
                      <Video className="h-4 w-4 mr-2" />Join Stream
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full h-12 w-12"
              onClick={() => scrollContainer('right')}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Sign Up Options */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Join VakilDot Today</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Lawyer Card */}
            <Card 
              className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-cyan-400"
              onClick={() => navigate('/signup/lawyer')}
            >
              <CardContent className="pt-10 pb-10 text-center">
                <div className="h-20 w-20 bg-gray-900 text-white rounded-lg flex items-center justify-center mx-auto mb-6">
                  <UserCheck className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Join as Lawyer</h3>
                <p className="text-gray-500 mb-6">
                  Go live, consult clients, manage cases, and earn per minute
                </p>
                <Button size="lg" className="w-full bg-gray-900 hover:bg-gray-800">
                  Sign Up as Lawyer
                </Button>
              </CardContent>
            </Card>

            {/* Client Card */}
            <Card 
              className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-cyan-400"
              onClick={() => navigate('/signup/client')}
            >
              <CardContent className="pt-10 pb-10 text-center">
                <div className="h-20 w-20 bg-cyan-500 text-white rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Users className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Join as Client</h3>
                <p className="text-gray-500 mb-6">
                  Get instant legal advice from verified lawyers via video call
                </p>
                <Button size="lg" variant="outline" className="w-full">
                  Sign Up as Client
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose VakilDot?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Instant Video Consultation</h3>
              <p className="text-gray-500">Connect with verified lawyers in real-time via HD video calls</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Verified Advocates</h3>
              <p className="text-gray-500">All lawyers are Bar Council verified with proven track records</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Pay Per Minute</h3>
              <p className="text-gray-500">Fair billing - pay only for the time you consult</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">VakilDot</span>
          </div>
          <p className="text-gray-400 mb-4">The Digital Munshi for Indian Advocates</p>
          <p className="text-sm text-gray-500">
            Trusted by advocates across District Courts, High Courts, and Supreme Court of India
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
