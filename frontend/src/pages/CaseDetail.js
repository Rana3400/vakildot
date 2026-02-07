import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Scale, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Firebase Imports
import { firestore } from '../firebase'; 
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const WEBHOOK_URL = "https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n";

  useEffect(() => {
    fetchCaseInfo();
  }, [caseId]);

  const fetchCaseInfo = async () => {
    try {
      setLoading(true);
      // 1. Fetch Case details from Firestore
      const caseRef = doc(firestore, 'cases', caseId);
      const caseSnap = await getDoc(caseRef);

      if (caseSnap.exists()) {
        setCaseData({ id: caseSnap.id, ...caseSnap.data() });
      } else {
        toast.error("Case record not found");
        navigate('/cases');
        return;
      }

      // 2. Fetch Timeline (if you have a sub-collection for events)
      const timelineRef = collection(firestore, 'cases', caseId, 'timeline');
      const q = query(timelineRef, orderBy('event_date', 'desc'));
      const timelineSnap = await getDocs(q);
      setTimeline(timelineSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error(error);
      toast.error('Failed to sync case data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualReminder = async () => {
    try {
      toast.info('Triggering manual notification...');
      const payload = {
        client_name: caseData.client_name,
        case_number: caseData.case_number,
        hearing_date: caseData.next_hearing_date,
        hearing_time: caseData.next_hearing_time || '10:00 AM',
        court_name: caseData.court_name,
        trigger_source: 'Manual_Reminder_Button'
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Notification sent to Make.com successfully!');
      }
    } catch (error) {
      toast.error('Network error while sending reminder');
    }
  };

  if (loading) return <div className="p-20 text-center font-mono">Loading VakilDot Case File...</div>;
  if (!caseData) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cases')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono uppercase tracking-tighter text-primary">
              {caseData.case_number}
            </h1>
            <p className="text-muted-foreground font-medium">{caseData.client_name}</p>
          </div>
        </div>
        <Button onClick={handleManualReminder} className="bg-orange-500 hover:bg-orange-600">
          <Bell className="h-4 w-4 mr-2" /> Send Reminder Now
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Hearing Status Card */}
            <Card className="md:col-span-1 border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Next Hearing (Tarikh)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-black text-red-600 font-mono">
                  {caseData.next_hearing_date}
                </p>
                <p className="text-sm font-bold text-red-500 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {caseData.next_hearing_time || '10:00 AM'}
                </p>
              </CardContent>
            </Card>

            {/* Core Info */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Legal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Case Type</label>
                  <p className="font-semibold">{caseData.case_type}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Case Stage</label>
                  <p className="font-semibold">{caseData.case_stage}</p>
                </div>
                <div className="col-span-2 border-t pt-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Court & Judge</label>
                  <p className="font-semibold">{caseData.court_name}</p>
                  <p className="text-sm text-muted-foreground">{caseData.judge_name || 'Judge Name not assigned'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Case Summary / Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed italic">
                {caseData.case_description || 'No additional description provided for this case.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Historical Timeline</CardTitle></CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="relative border-l-2 border-primary/20 ml-4 pl-8 space-y-8">
                  {timeline.map((entry) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-[41px] top-1 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                      <p className="text-xs font-bold font-mono text-primary uppercase">{entry.event_date}</p>
                      <p className="font-bold text-lg mt-1">{entry.event_type}</p>
                      <p className="text-muted-foreground text-sm">{entry.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground italic">
                  No timeline records found. Timeline updates automatically on hearing changes.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CaseDetail;