import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Upload, Save, Mail, Phone, MapPin, Briefcase, Building, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PRACTICE_FIELDS = ['Criminal Law', 'Civil Law', 'Constitutional Law', 'Corporate Law', 'Family Law', 'Property Law', 'Tax Law', 'Labour Law', 'Intellectual Property', 'Banking & Finance', 'Environmental Law', 'Cyber Law', 'Consumer Protection', 'Immigration Law', 'Human Rights'];
const INDIAN_COURTS = ['Supreme Court of India', 'Delhi High Court', 'Bombay High Court', 'Calcutta High Court', 'Madras High Court', 'Karnataka High Court', 'Gujarat High Court', 'Allahabad High Court', 'Punjab & Haryana High Court', 'Rajasthan High Court', 'Kerala High Court', 'Telangana High Court', 'District Court', 'Sessions Court', 'Magistrate Court', 'Consumer Forum', 'Labour Court', 'Family Court', 'Tribunal'];

const Settings = ({ user }) => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    mobile: '',
    practice_field: '',
    court: '',
    lawyer_type: '',
    chamber_number: '',
    address: '',
    bio: '',
    photo_url: ''
  });
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('vakildot_token');

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        practice_field: user.practice_field || '',
        court: user.court || '',
        lawyer_type: user.lawyer_type || '',
        chamber_number: user.chamber_number || '',
        address: user.address || '',
        bio: user.bio || '',
        photo_url: user.photo_url || ''
      });
    }
  }, [user]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/profile/upload-photo`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setProfile(p => ({ ...p, photo_url: res.data.photo_url }));
      toast.success('Photo uploaded!');
    } catch (error) {
      toast.error('Failed to upload photo');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/profile`, profile, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.setItem('vakildot_user', JSON.stringify({ ...user, ...profile }));
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!window.confirm('All your data including cases, clients, and documents will be permanently deleted. Continue?')) return;
    
    try {
      await axios.delete(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.clear();
      window.location.href = '/';
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profile Information</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {/* Photo Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={profile.photo_url} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{profile.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                <Upload className="h-4 w-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <h3 className="font-semibold">{profile.name || 'Your Name'}</h3>
              <p className="text-sm text-muted-foreground">{profile.lawyer_type || 'Advocate'}</p>
              <p className="text-xs text-muted-foreground mt-1">Click the camera icon to upload a new photo</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><User className="h-4 w-4" />Full Name *</Label>
              <Input value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email *</Label>
              <Input type="email" value={profile.email} onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Phone className="h-4 w-4" />Mobile</Label>
              <Input value={profile.mobile} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Phone number cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building className="h-4 w-4" />Chamber Number</Label>
              <Input value={profile.chamber_number} onChange={(e) => setProfile(p => ({ ...p, chamber_number: e.target.value }))} placeholder="Chamber No." />
            </div>
          </div>

          {/* Professional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Practice Field</Label>
              <Select value={profile.practice_field} onValueChange={(v) => setProfile(p => ({ ...p, practice_field: v }))}>
                <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                <SelectContent>
                  {PRACTICE_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building className="h-4 w-4" />Primary Court</Label>
              <Select value={profile.court} onValueChange={(v) => setProfile(p => ({ ...p, court: v }))}>
                <SelectTrigger><SelectValue placeholder="Select court" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_COURTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2"><User className="h-4 w-4" />Type</Label>
              <Select value={profile.lawyer_type} onValueChange={(v) => setProfile(p => ({ ...p, lawyer_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Advocate or Practitioner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Advocate">Advocate</SelectItem>
                  <SelectItem value="Practitioner">Practitioner</SelectItem>
                  <SelectItem value="Senior Advocate">Senior Advocate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address & Bio */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" />Office Address</Label>
            <Textarea value={profile.address} onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))} placeholder="Your office/chamber address" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Bio / About</Label>
            <Textarea value={profile.bio} onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Brief description about your practice..." rows={3} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <Button variant="destructive" onClick={handleDeleteAccount}>
            <LogOut className="h-4 w-4 mr-2" />Delete My Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
