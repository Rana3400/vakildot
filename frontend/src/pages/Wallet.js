import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, Plus, History, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WalletPage = () => {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const token = localStorage.getItem('vakildot_token');
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');

  useEffect(() => {
    fetchWallet();
    fetchHistory();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API}/live/wallet/${user.id}`);
      setBalance(res.data.balance || 0);
    } catch (e) {
      console.error('Failed to fetch wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/live/billing/history/${user.id}`);
      setHistory(res.data.history || []);
    } catch (e) {
      console.error('Failed to fetch history');
    }
  };

  const handleRecharge = async (amount) => {
    try {
      const res = await axios.post(`${API}/live/wallet/recharge`, {
        user_id: user.id,
        amount: parseFloat(amount)
      });
      if (res.data.success) {
        toast.success(`₹${amount} added to wallet!`);
        setBalance(res.data.new_balance);
        setDialogOpen(false);
        setRechargeAmount('');
        fetchHistory();
      }
    } catch (e) {
      toast.error('Recharge failed');
    }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000];

  if (loading) return <div className="flex items-center justify-center h-64">Loading wallet...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">Manage your consultation balance</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Available Balance</p>
              <p className="text-4xl font-bold font-mono mt-2">₹{balance.toFixed(2)}</p>
              <p className="text-sm opacity-80 mt-2">
                ≈ {Math.floor(balance / 30)} minutes @ ₹30/min
              </p>
            </div>
            <Wallet className="h-16 w-16 opacity-50" />
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-6 bg-white text-primary hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />Add Money
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recharge Wallet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map(amt => (
                    <Button 
                      key={amt} 
                      variant="outline" 
                      onClick={() => setRechargeAmount(amt.toString())}
                      className={rechargeAmount === amt.toString() ? 'border-primary' : ''}
                    >
                      ₹{amt}
                    </Button>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Label>Custom Amount</Label>
                  <Input 
                    type="number" 
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Test Mode:</strong> This is a dummy payment gateway. Click "Pay Now" to add test credits instantly.
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => handleRecharge(rechargeAmount)}
                  disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{rechargeAmount || '0'} (Test Mode)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">80%</p>
            <p className="text-sm text-muted-foreground mt-1">Goes to Lawyer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-600">20%</p>
            <p className="text-sm text-muted-foreground mt-1">Platform Fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-orange-600">5 min</p>
            <p className="text-sm text-muted-foreground mt-1">Minimum Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {tx.type === 'recharge' ? (
                      <ArrowDownRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium capitalize">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">{tx.description || new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Bal: ₹{tx.balance_after?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Add money to your wallet to start consultations</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletPage;
