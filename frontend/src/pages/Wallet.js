import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Wallet, Plus, History, CreditCard, ArrowUpRight, ArrowDownRight, IndianRupee, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID;

const WalletPage = () => {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const token = localStorage.getItem('vakildot_token');
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');

  useEffect(() => {
    fetchWallet();
    fetchHistory();
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
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

  const handleRazorpayPayment = useCallback(async (amount) => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setPaying(true);
    try {
      // Step 1: Create Razorpay order on backend
      const orderRes = await axios.post(`${API}/live/razorpay/create-order`, {
        amount: numAmount,
        user_id: user.id
      });

      if (!orderRes.data.success) {
        toast.error('Failed to create payment order');
        setPaying(false);
        return;
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: RAZORPAY_KEY,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: 'VakilDot',
        description: `Wallet Recharge - ₹${numAmount}`,
        order_id: orderRes.data.order_id,
        handler: async (response) => {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await axios.post(`${API}/live/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              user_id: user.id,
              amount: numAmount
            });

            if (verifyRes.data.success) {
              toast.success(`₹${numAmount} added to wallet!`);
              setBalance(verifyRes.data.new_balance);
              setDialogOpen(false);
              setRechargeAmount('');
              fetchHistory();
            }
          } catch (verifyErr) {
            toast.error('Payment verification failed. Contact support.');
          }
          setPaying(false);
        },
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.mobile || ''
        },
        theme: {
          color: '#0f172a'
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast.info('Payment cancelled');
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          toast.error(`Payment failed: ${resp.error.description}`);
          setPaying(false);
        });
        rzp.open();
      } else {
        toast.error('Payment gateway loading... Please try again.');
        setPaying(false);
      }
    } catch (e) {
      toast.error('Failed to initiate payment');
      setPaying(false);
    }
  }, [user]);

  const quickAmounts = [100, 200, 500, 1000, 2000];

  if (loading) return <div className="flex items-center justify-center h-64">Loading wallet...</div>;

  return (
    <div data-testid="wallet-page" className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">Manage your consultation balance</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-70">Available Balance</p>
              <p className="text-4xl font-bold font-mono mt-2">₹{balance.toFixed(2)}</p>
              <p className="text-sm opacity-70 mt-2">
                ≈ {Math.floor(balance / 30)} minutes @ ₹30/min
              </p>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <IndianRupee className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-money-btn" className="mt-6 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                <Plus className="h-4 w-4 mr-2" />Add Money
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Recharge Wallet
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map(amt => (
                    <Button 
                      key={amt} 
                      variant="outline" 
                      data-testid={`quick-amount-${amt}`}
                      onClick={() => setRechargeAmount(amt.toString())}
                      className={rechargeAmount === amt.toString() ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''}
                    >
                      ₹{amt}
                    </Button>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Label>Custom Amount</Label>
                  <Input 
                    data-testid="custom-amount-input"
                    type="number" 
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                  />
                </div>

                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Secured by <strong>Razorpay</strong>. UPI, Cards, Net Banking accepted.
                  </p>
                </div>

                <Button 
                  data-testid="pay-now-btn"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white" 
                  onClick={() => handleRazorpayPayment(rechargeAmount)}
                  disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0 || paying}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {paying ? 'Processing...' : `Pay ₹${rechargeAmount || '0'}`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

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
