import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Billing = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    fee_type: 'per_hearing',
    description: '',
    due_date: ''
  });
  const token = localStorage.getItem('vakildesk_token');

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/billing/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Failed to load clients');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/billing/invoices`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Invoice created successfully!');
      setDialogOpen(false);
      fetchInvoices();
      setFormData({ client_id: '', amount: '', fee_type: 'per_hearing', description: '', due_date: '' });
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-success text-white';
      case 'pending':
        return 'bg-tarikh-upcoming text-white';
      case 'overdue':
        return 'bg-destructive text-white';
      default:
        return 'bg-muted text-foreground';
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
    return <div className="flex items-center justify-center h-64">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-1">Track payments and generate invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-invoice-button">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Generate a new invoice for your client</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))} required>
                  <SelectTrigger data-testid="invoice-client-select">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                  data-testid="invoice-amount-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Fee Type *</Label>
                <Select value={formData.fee_type} onValueChange={(value) => setFormData(prev => ({ ...prev, fee_type: value }))} required>
                  <SelectTrigger data-testid="invoice-fee-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_hearing">Per Hearing</SelectItem>
                    <SelectItem value="fixed">Fixed Fee</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  data-testid="invoice-due-date-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Invoice description"
                  rows={3}
                  data-testid="invoice-description-input"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="submit-invoice-button">Create Invoice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4" data-testid="invoices-list">
        {invoices.length > 0 ? (
          invoices.map((invoice) => (
            <Card key={invoice.id} data-testid={`invoice-card-${invoice.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">{invoice.client_name}</h3>
                      <span className={`px-3 py-1 text-xs rounded-sm ${getStatusColor(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{invoice.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Fee Type: {invoice.fee_type.replace(/_/g, ' ')}
                    </p>
                    {invoice.case_number && (
                      <p className="text-sm text-muted-foreground">Case: {invoice.case_number}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">Due: {formatDate(invoice.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-2xl font-bold font-mono text-foreground">
                      <IndianRupee className="h-5 w-5" />
                      {invoice.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No invoices yet. Create your first invoice to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Billing;