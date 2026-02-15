import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Video, Star, Shield, Clock, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LiveLawyersSlider = () => {
  const [lawyers, setLawyers] = useState([]);
  const [states, setStates] = useState([]);
  const [courts, setCourts] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    } finally {
      setLoading(false);
    }
  };

  const scrollContainer = (direction) => {
    const container = document.getElementById('lawyers-slider');
    if (container) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-red-500 animate-pulse" />
            Live Lawyers
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Connect instantly with verified advocates</p>
        </div>
        <Badge variant="destructive" className="animate-pulse">
          {lawyers.length} Online Now
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-muted/50 p-4 rounded-lg">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All States</SelectItem>
            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        
        <Select value={selectedCourt} onValueChange={setSelectedCourt} disabled={!selectedState}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select Court" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Courts</SelectItem>
            {courts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {(selectedState || selectedCourt) && (
          <Button variant="ghost" size="sm" onClick={() => { setSelectedState(''); setSelectedCourt(''); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background shadow-lg"
          onClick={() => scrollContainer('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div 
          id="lawyers-slider"
          className="flex gap-4 overflow-x-auto scrollbar-hide px-10 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            <div className="flex gap-4">
              {[1,2,3,4].map(i => (
                <Card key={i} className="w-72 flex-shrink-0 animate-pulse">
                  <CardContent className="pt-6 h-48 bg-muted"></CardContent>
                </Card>
              ))}
            </div>
          ) : lawyers.length > 0 ? (
            lawyers.map(lawyer => (
              <Card 
                key={lawyer.id} 
                className="w-72 flex-shrink-0 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-primary"
                onClick={() => navigate(`/consultation/${lawyer.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-green-500">
                        <AvatarImage src={lawyer.photo} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {lawyer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{lawyer.name}</h3>
                        {lawyer.is_verified && <Shield className="h-4 w-4 text-blue-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{lawyer.specialization}</p>
                      <p className="text-xs text-muted-foreground truncate">{lawyer.court}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{lawyer.rating}</span>
                      <span className="text-xs text-muted-foreground">({lawyer.total_consultations})</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">₹{lawyer.rate_per_minute}</p>
                      <p className="text-xs text-muted-foreground">/minute</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {lawyer.is_asset_recovery_expert && (
                      <Badge variant="secondary" className="text-xs">Asset Recovery</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{lawyer.state}</Badge>
                  </div>

                  <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
                    <Video className="h-4 w-4 mr-2" />
                    Consult Now
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="w-full text-center py-12 text-muted-foreground">
              No lawyers available for selected filters
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background shadow-lg"
          onClick={() => scrollContainer('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default LiveLawyersSlider;
