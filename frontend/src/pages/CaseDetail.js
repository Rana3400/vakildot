import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('vakildesk_token');

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      const [caseRes, timelineRes] = await Promise.all([
        axios.get(`${API}/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/cases/${caseId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCaseData(caseRes.data);
      setTimeline(timelineRes.data);
    } catch (error) {
      toast.error('Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    try {
      const response = await axios.post(`${API}/reminders/send?case_id=${caseId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      response.data.messages.forEach(msg => toast.info(msg));
      toast.success('Reminders sent successfully!');
    } catch (error) {
      toast.error('Failed to send reminders');
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading case details...</div>;
  }

  if (!caseData) {
    return <div>Case not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cases')} data-testid="back-button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono text-foreground">{caseData.case_number}</h1>
            <p className="text-muted-foreground">{caseData.client_name}</p>
          </div>
        </div>
        <Button onClick={handleSendReminder} data-testid="send-reminder-button">
          <Bell className="h-4 w-4 mr-2" />
          Send Reminder Now
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Case Type</p>
                  <p className="font-medium">{caseData.case_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Case Stage</p>
                  <p className="font-medium">{caseData.case_stage}</p>
                </div>
                {caseData.fir_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">FIR Number</p>
                    <p className="font-medium font-mono">{caseData.fir_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Court Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Court Name</p>
                  <p className="font-medium">{caseData.court_name}</p>
                </div>
                {caseData.judge_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Judge</p>
                    <p className="font-medium">{caseData.judge_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-tarikh-urgent/10">
              <CardHeader>
                <CardTitle>Next Hearing (Tarikh)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-tarikh-urgent">
                  {formatDate(caseData.next_hearing_date)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reminder Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{caseData.reminder_enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                {caseData.reminder_enabled && (
                  <div>
                    <p className="text-sm text-muted-foreground">Types</p>
                    <p className="font-medium">{caseData.reminder_types.join(', ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {caseData.case_description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{caseData.case_description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((entry) => (
                    <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 w-32">
                        <p className="text-sm font-mono text-muted-foreground">{formatDate(entry.event_date)}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{entry.event_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">By: {entry.created_by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No timeline entries yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CaseDetail;