import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Mic, MicOff, Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { Task, Project, TaskPriority } from '../types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface SupervisorViewProps {
  tasks: Task[];
  projects: Project[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddProject: (project: Omit<Project, 'id'>) => void;
}

const trades = ['Framing', 'Electrical', 'Plumbing', 'HVAC', 'Drywall', 'Paint', 'Flooring', 'Tile', 'Cabinets', 'Landscaping', 'Other'];
const subcontractors = ['ABC Framing Co', 'Bright Electric', 'Best Plumbing Inc', 'Cool Air Systems', 'Perfect Walls LLC', 'Premier Painting', 'Floor Masters', 'Tile Pro', 'Custom Cabinets Inc'];

export function SupervisorView({ tasks, projects, onAddTask, onUpdateTask, onAddProject }: SupervisorViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [trade, setTrade] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [location, setLocation] = useState('');
  const [dueDate, setDueDate] = useState('');

  // New project dialog
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [newProjectPhase, setNewProjectPhase] = useState('');
  const [showProjectDialog, setShowProjectDialog] = useState(false);

  const handleVoiceToggle = () => {
    if (!isRecording) {
      // Start recording simulation
      setIsRecording(true);
      toast.info('Voice recording started - speak naturally while you walk');
    } else {
      // Stop recording and process
      setIsRecording(false);
      if (voiceInput) {
        setDescription(voiceInput);
        toast.success('Voice input captured');
      }
    }
  };

  const handleQuickCreate = () => {
    if (!selectedProject || !description || !trade || !assignedTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;

    const newTask: Omit<Task, 'id' | 'createdAt'> = {
      projectId: selectedProject,
      projectName: project.name,
      description,
      trade,
      assignedTo,
      priority,
      status: 'open',
      createdBy: 'Current Supervisor', // In real app, would be from auth
      location,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    onAddTask(newTask);
    
    // Reset form
    setDescription('');
    setVoiceInput('');
    setTrade('');
    setAssignedTo('');
    setPriority('medium');
    setLocation('');
    setDueDate('');

    toast.success('Task created successfully');
  };

  const handleAddProject = () => {
    if (!newProjectName || !newProjectAddress) {
      toast.error('Please fill in project name and address');
      return;
    }

    onAddProject({
      name: newProjectName,
      address: newProjectAddress,
      status: 'in-progress',
      phase: newProjectPhase || 'Planning',
    });

    setNewProjectName('');
    setNewProjectAddress('');
    setNewProjectPhase('');
    setShowProjectDialog(false);
    toast.success('Project added successfully');
  };

  const myTasks = tasks.filter(task => task.createdBy === 'Current Supervisor' || task.createdBy === 'John Martinez' || task.createdBy === 'Sarah Chen' || task.createdBy === 'Mike Johnson');

  return (
    <div className="space-y-6">
      {/* Quick Task Creation */}
      <Card>
        <CardHeader>
          <CardTitle>Site Walkthrough Input</CardTitle>
          <CardDescription>
            Speak naturally or type as you walk. No forms, no stopping - just capture what you see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Voice Input (Simulated)</Label>
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleVoiceToggle}
                className="ml-auto"
              >
                {isRecording ? <MicOff className="size-4 mr-2" /> : <Mic className="size-4 mr-2" />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
            </div>
            {isRecording && (
              <Textarea
                placeholder="Speak or type: 'West wall in master bedroom, framing studs not plumb, ABC Framing needs to fix before drywall...'"
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                className="min-h-24 border-red-300 bg-red-50"
              />
            )}
          </div>

          {/* Project Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <div className="flex gap-2">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Plus className="size-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Project</DialogTitle>
                      <DialogDescription>Create a new project to track tasks against</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name *</Label>
                        <Input
                          id="project-name"
                          placeholder="e.g., 123 Oak Street"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-address">Address *</Label>
                        <Input
                          id="project-address"
                          placeholder="e.g., 123 Oak Street, Austin, TX"
                          value={newProjectAddress}
                          onChange={(e) => setNewProjectAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-phase">Current Phase</Label>
                        <Input
                          id="project-phase"
                          placeholder="e.g., Framing, Drywall, Paint"
                          value={newProjectPhase}
                          onChange={(e) => setNewProjectPhase(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddProject} className="w-full">Add Project</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Master Bedroom - West Wall"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Task Details */}
          <div className="space-y-2">
            <Label htmlFor="description">Issue Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what needs to be fixed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade">Trade *</Label>
              <Select value={trade} onValueChange={setTrade}>
                <SelectTrigger id="trade">
                  <SelectValue placeholder="Select trade" />
                </SelectTrigger>
                <SelectContent>
                  {trades.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="assignedTo">
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  {subcontractors.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(val) => setPriority(val as TaskPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleQuickCreate} className="w-full" size="lg">
            <Plus className="size-4 mr-2" />
            Create Task
          </Button>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Recent Tasks</CardTitle>
          <CardDescription>Tasks you've created from site walkthroughs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No tasks created yet</p>
            ) : (
              myTasks.slice(0, 10).map(task => (
                <div key={task.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          task.status === 'completed' ? 'default' :
                          task.status === 'in-progress' ? 'secondary' :
                          task.status === 'blocked' ? 'destructive' : 'outline'
                        }>
                          {task.status === 'completed' && <Check className="size-3 mr-1" />}
                          {task.status === 'in-progress' && <Clock className="size-3 mr-1" />}
                          {task.status === 'blocked' && <AlertCircle className="size-3 mr-1" />}
                          {task.status}
                        </Badge>
                        <Badge variant={
                          task.priority === 'urgent' || task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'secondary' : 'outline'
                        }>
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">{task.projectName}</span>
                      </div>
                      <p className="text-sm">{task.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <span>{task.trade} • {task.assignedTo}</span>
                        {task.location && <span>📍 {task.location}</span>}
                      </div>
                    </div>
                    {task.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateTask(task.id, { 
                          status: task.status === 'open' ? 'in-progress' : 'completed',
                          completedAt: task.status === 'in-progress' ? new Date() : undefined
                        })}
                      >
                        {task.status === 'open' ? 'Start' : 'Complete'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
