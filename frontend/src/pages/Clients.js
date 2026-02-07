import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Firebase Imports
import { firestore, auth } from '../firebase'; 
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', mobile: '', email: '', address: '', notes: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const q = query(collection(firestore, 'clients'), where('lawyer_id', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const clientList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientList);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const currentUser = auth.currentUser;
      await addDoc(collection(firestore, 'clients'), {
        ...formData,
        lawyer_id: currentUser.uid,
        createdAt: serverTimestamp()
      });
      toast.success('Client created successfully!');
      setDialogOpen(false);
      fetchClients();
      setFormData({ name: '', mobile: '', email: '', address: '', notes: '' });
    } catch (error) {
      toast.error('Failed to create client');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile?.includes(searchTerm)
  );

  if (loading) return <div className="flex items-center justify-center h-64 font-mono">Loading VakilDot Database...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">Clients</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <Input placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              <Input placeholder="Mobile" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} required />
              <Input placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <Textarea placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              <Button type="submit" className="w-full">Create Client</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Input className="pl-10" placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/clients/${client.id}`)}>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold">{client.name}</h3>
              <p className="text-sm text-muted-foreground">+91 {client.mobile}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Clients;