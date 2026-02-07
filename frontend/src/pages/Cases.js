import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Firebase Imports
import { firestore, auth } from '../firebase'; 
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const Cases = ({ userRole = 'lawyer' }) => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    case_number: '',
    case_type: '',
    court_name: '',
    case_stage: 'Filed',
    next_hearing_date: '',
    case_description: ''
  });

  const navigate = useNavigate();
  const WEBHOOK_URL = "https://hook.eu1.make.com/sk7z17b8jxdwifdxa5736lmbk5bp2c7n";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // 1. Fetch Clients (Dropdown ke liye)
      const clientQ = query(collection(firestore, 'clients'), where('lawyer_id', '==', currentUser.uid));
      const clientSnap = await getDocs(clientQ);
      const clientList = clientSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientList);

      // 2. Fetch Cases
      const caseQ = query(collection(firestore, 'cases'), where('lawyer_id', '==', currentUser.uid));
      const caseSnap = await getDocs(caseQ);
      const caseList = caseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCases(caseList);

    } catch (error) {
      toast.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      const currentUser = auth.currentUser;
      const selectedClient = clients.find(c => c.id === formData.client_id);

      // Save to Firestore
      const docRef = await addDoc(collection(firestore, 'cases'), {
        ...formData,
        client_name: selectedClient?.name || 'Unknown Client',
        lawyer_id: currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Trigger Webhook for Automation
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          client_name: selectedClient?.name,
          client_phone: selectedClient?.mobile,
          trigger: 'new_case_created'
        })
      });

      toast.success('Case Created & Notification Sent!');
      setDialogOpen(false);
      fetchData(); // Refresh list
    } catch (error) {
      toast.error('Failed to create case');
    }
  };

  const handleDeleteCase = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this case?")) {
      await deleteDoc(doc(firestore, 'cases', id));
      toast.success('Case deleted');
      fetchData();
    }
  };

  const filteredCases = cases.filter(c => 
    c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center">Loading Case Files...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Court Cases</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Case</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>File New Case</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select onValueChange={(val) => setFormData({...formData, client_id: val})} required>
                  <SelectTrigger><SelectValue placeholder="Choose Client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Case Number (e.g. 123/2026)" onChange={e => setFormData({...formData, case_number: e.target.value})} required />
              <Input placeholder="Court Name" onChange={e => setFormData({...formData, court_name: e.target.value})} required />
              <Input type="date" label="Next Hearing" onChange={e => setFormData({...formData, next_hearing_date: e.target.value})} required />
              <Textarea placeholder="Brief Case Summary" onChange={e => setFormData({...formData, case_description: e.target.value})} />
              <Button type="submit" className="w-full">Create Case File</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search by case no or client name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCases.map((c) => (
          <Card key={c.id} className="cursor-pointer group hover:border-primary transition-all" onClick={() => navigate(`/cases/${c.id}`)}>
            <CardContent className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Scale size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{c.case_number}</h3>
                  <p className="text-sm text-muted-foreground">{c.client_name} • {c.court_name}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Next Hearing</p>
                  <p className="font-mono font-bold text-red-500">{c.next_hearing_date}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => handleDeleteCase(e, c.id)}>
                  <Trash2 size={18} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Cases;