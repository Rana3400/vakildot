import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarDays, Plus, Check, Clock, Gavel, FileText, 
  Trash2, Edit2, ArrowLeft, Filter, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailyTasks = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('vakildot_token');
  const user = JSON.parse(localStorage.getItem('vakildot_user') || '{}');
  
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    case_name: '', case_number: '', court_name: '', judge_name: '',
    hearing_date: '', hearing_time: '', task_type: 'hearing',
    notes: '', priority: 'medium'
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTasks();
    fetchSummary();
  }, [filterDate, filterStatus]);

  const fetchTasks = async () => {
    try {
      let url = `${API}/tasks`;
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await axios.get(url, { headers });
      setTasks(res.data.tasks || []);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API}/tasks/today-summary`, { headers });
      setSummary(res.data);
    } catch (e) {
      console.error('Failed to fetch summary:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.case_name || !formData.hearing_date) {
      toast.error('Case name aur hearing date required hai');
      return;
    }

    try {
      if (editingTask) {
        await axios.put(`${API}/tasks/${editingTask.id}`, formData, { headers });
        toast.success('Task updated!');
      } else {
        await axios.post(`${API}/tasks`, formData, { headers });
        toast.success('Task added!');
      }
      resetForm();
      fetchTasks();
      fetchSummary();
    } catch (e) {
      toast.error('Failed to save task');
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await axios.put(`${API}/tasks/${task.id}`, { status: newStatus }, { headers });
      fetchTasks();
      fetchSummary();
      toast.success(newStatus === 'completed' ? 'Task complete!' : 'Task reopened');
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { headers });
      fetchTasks();
      fetchSummary();
      toast.success('Task deleted');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const startEdit = (task) => {
    setEditingTask(task);
    setFormData({
      case_name: task.case_name || '',
      case_number: task.case_number || '',
      court_name: task.court_name || '',
      judge_name: task.judge_name || '',
      hearing_date: task.hearing_date || '',
      hearing_time: task.hearing_time || '',
      task_type: task.task_type || 'hearing',
      notes: task.notes || '',
      priority: task.priority || 'medium'
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      case_name: '', case_number: '', court_name: '', judge_name: '',
      hearing_date: '', hearing_time: '', task_type: 'hearing',
      notes: '', priority: 'medium'
    });
    setEditingTask(null);
    setShowForm(false);
  };

  const today = new Date().toISOString().split('T')[0];

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400',
    low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400'
  };

  const typeIcons = {
    hearing: <Gavel className="h-4 w-4" />,
    filing: <FileText className="h-4 w-4" />,
    meeting: <CalendarDays className="h-4 w-4" />,
    other: <Clock className="h-4 w-4" />
  };

  const typeLabels = { hearing: 'Hearing', filing: 'Filing', meeting: 'Meeting', other: 'Other' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="daily-tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/lawyer-dashboard')} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Case Diary</h1>
          <p className="text-muted-foreground mt-1">Apni daily hearings aur tasks manage karein</p>
        </div>
        <Button 
          data-testid="add-task-btn"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-[#1a1a2e] hover:bg-[#16213e] text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </Button>
      </div>

      {/* Morning Summary Card */}
      {summary && summary.total_today > 0 && (
        <Card className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white" data-testid="today-summary">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm opacity-80">Today's Schedule</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">
                  {summary.total_today} Tasks Today
                </p>
                <div className="flex flex-wrap gap-3 mt-2 text-sm opacity-90">
                  {summary.hearings_today > 0 && (
                    <span className="flex items-center gap-1"><Gavel className="h-3 w-3" /> {summary.hearings_today} Hearings</span>
                  )}
                  {summary.filings_today > 0 && (
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {summary.filings_today} Filings</span>
                  )}
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {summary.completed_today} Done</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {summary.pending_today} Pending</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-2 border-primary/20" data-testid="task-form">
          <CardHeader>
            <CardTitle className="text-lg">{editingTask ? 'Edit Task' : 'New Task / Hearing'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Case Name *</Label>
                  <Input data-testid="task-case-name" placeholder="e.g., Ram vs State of Punjab" value={formData.case_name}
                    onChange={e => setFormData(p => ({...p, case_name: e.target.value}))} />
                </div>
                <div>
                  <Label>Case Number</Label>
                  <Input data-testid="task-case-number" placeholder="e.g., CRM-M-1234/2026" value={formData.case_number}
                    onChange={e => setFormData(p => ({...p, case_number: e.target.value}))} />
                </div>
                <div>
                  <Label>Court Name</Label>
                  <Input data-testid="task-court-name" placeholder="e.g., District Court Ludhiana" value={formData.court_name}
                    onChange={e => setFormData(p => ({...p, court_name: e.target.value}))} />
                </div>
                <div>
                  <Label>Judge Name</Label>
                  <Input data-testid="task-judge-name" placeholder="e.g., Hon'ble Justice Sharma" value={formData.judge_name}
                    onChange={e => setFormData(p => ({...p, judge_name: e.target.value}))} />
                </div>
                <div>
                  <Label>Hearing Date *</Label>
                  <Input data-testid="task-hearing-date" type="date" value={formData.hearing_date}
                    onChange={e => setFormData(p => ({...p, hearing_date: e.target.value}))} />
                </div>
                <div>
                  <Label>Hearing Time</Label>
                  <Input data-testid="task-hearing-time" type="time" value={formData.hearing_time}
                    onChange={e => setFormData(p => ({...p, hearing_time: e.target.value}))} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.task_type} onValueChange={v => setFormData(p => ({...p, task_type: v}))}>
                    <SelectTrigger data-testid="task-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hearing">Hearing</SelectItem>
                      <SelectItem value="filing">Filing</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData(p => ({...p, priority: v}))}>
                    <SelectTrigger data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea data-testid="task-notes" placeholder="Case details, arguments, reminders..." value={formData.notes}
                  onChange={e => setFormData(p => ({...p, notes: e.target.value}))} rows={3} />
              </div>
              <div className="flex gap-3">
                <Button type="submit" data-testid="save-task-btn" className="bg-[#1a1a2e] hover:bg-[#16213e] text-white">
                  {editingTask ? 'Update Task' : 'Save Task'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="w-auto" placeholder="Date" data-testid="filter-date" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]" data-testid="filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => { setFilterDate(today); }}>Today</Button>
        <Button variant="ghost" size="sm" onClick={() => { setFilterDate(''); setFilterStatus('all'); }}>Clear</Button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No tasks found</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first hearing or task</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="mt-4 bg-[#1a1a2e] hover:bg-[#16213e] text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="task-list">
          {tasks.map(task => (
            <Card key={task.id} className={`transition-all hover:shadow-md ${task.status === 'completed' ? 'opacity-70' : ''}`}
              data-testid={`task-item-${task.id}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button onClick={() => toggleStatus(task)} data-testid={`toggle-task-${task.id}`}
                    className={`mt-1 flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors
                      ${task.status === 'completed' 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-primary dark:border-gray-600'}`}>
                    {task.status === 'completed' && <Check className="h-3 w-3" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`font-semibold ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.case_name}
                      </span>
                      {task.case_number && (
                        <Badge variant="outline" className="text-xs font-mono">{task.case_number}</Badge>
                      )}
                      <Badge className={`text-xs ${priorityColors[task.priority || 'medium']}`}>
                        {task.priority === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {(task.priority || 'medium').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {typeIcons[task.task_type || 'hearing']}
                        {typeLabels[task.task_type || 'hearing']}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {task.court_name && <span className="flex items-center gap-1"><Gavel className="h-3 w-3" />{task.court_name}</span>}
                      {task.judge_name && <span>Judge: {task.judge_name}</span>}
                      {task.hearing_date && (
                        <span className={`flex items-center gap-1 font-medium ${task.hearing_date === today ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                          <CalendarDays className="h-3 w-3" />
                          {task.hearing_date}
                          {task.hearing_date === today && ' (Today)'}
                        </span>
                      )}
                      {task.hearing_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.hearing_time}</span>}
                    </div>

                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded p-2">{task.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(task)} data-testid={`edit-task-${task.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" 
                      onClick={() => deleteTask(task.id)} data-testid={`delete-task-${task.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming Tasks */}
      {summary?.upcoming_tasks?.length > 0 && !filterDate && (
        <Card data-testid="upcoming-tasks">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-blue-500" /> Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.upcoming_tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.case_name}</p>
                    <p className="text-xs text-muted-foreground">{task.court_name} {task.judge_name ? `| ${task.judge_name}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{task.hearing_date}</p>
                    {task.hearing_time && <p className="text-xs text-muted-foreground">{task.hearing_time}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyTasks;
