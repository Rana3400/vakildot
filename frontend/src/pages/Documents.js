import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, Trash2, Download, Eye, FolderOpen, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCase, setSelectedCase] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem('vakildot_token');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [docsRes, casesRes] = await Promise.all([
        axios.get(`${API}/documents`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/cases`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDocuments(docsRes.data);
      setCases(casesRes.data);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedCase) {
      toast.error('Please select a case first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/documents/upload?case_id=${selectedCase}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded!');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`${API}/documents/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Document deleted');
      fetchData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(`${API}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return <FileText className="h-8 w-8 text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <File className="h-8 w-8 text-blue-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="h-8 w-8 text-blue-600" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getCaseName = (caseId) => {
    const c = cases.find(cs => cs.id === caseId);
    return c ? `${c.case_number} - ${c.client_name}` : 'Unknown Case';
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading documents...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">Upload and manage case documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4 mr-2" />Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Case *</Label>
                <Select value={selectedCase} onValueChange={setSelectedCase}>
                  <SelectTrigger><SelectValue placeholder="Choose a case" /></SelectTrigger>
                  <SelectContent>
                    {cases.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.case_number} - {c.client_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Document File *</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, Images, Word Documents</p>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleUpload}
                  />
                </div>
              </div>

              {uploading && (
                <div className="text-center text-sm text-muted-foreground">
                  Uploading document...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {getFileIcon(doc.filename)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" title={doc.filename}>{doc.filename}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{getCaseName(doc.case_id)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4 mr-1" />Download
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Documents Yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first case document to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />Upload Document
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Documents;
