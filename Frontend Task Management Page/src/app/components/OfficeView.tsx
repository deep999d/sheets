import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Task, Project, TaskStatus } from '../types';
import { Search, Filter, Download, Trash2, Calendar, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface OfficeViewProps {
  tasks: Task[];
  projects: Project[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export function OfficeView({ tasks, projects, onUpdateTask, onDeleteTask }: OfficeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterTrade, setFilterTrade] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Get unique values for filters
  const trades = useMemo(() => Array.from(new Set(tasks.map(t => t.trade))), [tasks]);
  const assignees = useMemo(() => Array.from(new Set(tasks.map(t => t.assignedTo))), [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = searchQuery === '' || 
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProject = filterProject === 'all' || task.projectId === filterProject;
      const matchesTrade = filterTrade === 'all' || task.trade === filterTrade;
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesAssignee = filterAssignee === 'all' || task.assignedTo === filterAssignee;

      return matchesSearch && matchesProject && matchesTrade && matchesStatus && matchesAssignee;
    });
  }, [tasks, searchQuery, filterProject, filterTrade, filterStatus, filterAssignee]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter(t => t.status === 'open').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'completed').length;
    const highPriority = tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'completed').length;

    return { total, open, inProgress, completed, overdue, highPriority };
  }, [tasks]);

  // Get tasks by age
  const oldestOpenTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'open')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 5);
  }, [tasks]);

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    onUpdateTask(taskId, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : undefined,
    });
    toast.success('Task status updated');
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDeleteTask(taskId);
      toast.success('Task deleted');
    }
  };

  const handleExportTasks = () => {
    // Simulate CSV export
    const csv = [
      ['Project', 'Description', 'Trade', 'Assigned To', 'Status', 'Priority', 'Created', 'Due Date', 'Location'],
      ...filteredTasks.map(t => [
        t.projectName,
        t.description,
        t.trade,
        t.assignedTo,
        t.status,
        t.priority,
        t.createdAt.toLocaleDateString(),
        t.dueDate?.toLocaleDateString() || '',
        t.location || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Tasks exported to CSV');
  };

  const getDaysOpen = (createdAt: Date) => {
    const days = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-600 mt-1">Total Tasks</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.open}</div>
              <div className="text-xs text-gray-600 mt-1">Open</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
              <div className="text-xs text-gray-600 mt-1">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-gray-600 mt-1">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-xs text-gray-600 mt-1">Overdue</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.highPriority}</div>
              <div className="text-xs text-gray-600 mt-1">High Priority</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Oldest Open Tasks Alert */}
      {oldestOpenTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <Clock className="size-5" />
              Oldest Open Items - Needs Attention
            </CardTitle>
            <CardDescription className="text-orange-700">
              These tasks have been open the longest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {oldestOpenTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded border border-orange-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{task.projectName}</Badge>
                      <Badge variant="destructive">{getDaysOpen(task.createdAt)} days old</Badge>
                    </div>
                    <p className="text-sm">{task.description}</p>
                    <p className="text-xs text-gray-600 mt-1">{task.trade} • {task.assignedTo}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(task.id, 'in-progress')}
                  >
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tasks</CardTitle>
              <CardDescription>Master view of all items across projects</CardDescription>
            </div>
            <Button onClick={handleExportTasks} variant="outline">
              <Download className="size-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTrade} onValueChange={setFilterTrade}>
              <SelectTrigger>
                <SelectValue placeholder="All Trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades.map(trade => (
                  <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assignees.map(assignee => (
                  <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tasks Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          task.priority === 'urgent' || task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'secondary' : 'outline'
                        }>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{task.projectName}</TableCell>
                      <TableCell className="max-w-md">
                        <div>
                          <p className="text-sm">{task.description}</p>
                          {task.location && (
                            <p className="text-xs text-gray-500 mt-1">📍 {task.location}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{task.trade}</TableCell>
                      <TableCell>{task.assignedTo}</TableCell>
                      <TableCell>
                        <span className={getDaysOpen(task.createdAt) > 7 ? 'text-red-600 font-semibold' : ''}>
                          {getDaysOpen(task.createdAt)}d
                        </span>
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span className={
                            task.dueDate < new Date() && task.status !== 'completed'
                              ? 'text-red-600 font-semibold'
                              : ''
                          }>
                            {task.dueDate.toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
