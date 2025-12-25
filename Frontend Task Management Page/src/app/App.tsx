import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TaskTable } from './components/TaskTable';
import { Task } from './types';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { apiService } from './services/api';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTasks();
      if (response.success) {
        const mappedTasks = response.tasks.map((task: any) => ({
          id: task.timestamp || task.taskId || Date.now().toString(),
          timestamp: task.timestamp ? new Date(task.timestamp) : new Date(),
          project: task.project || '',
          area: task.area || '',
          trade: task.trade || '',
          taskTitle: task.taskTitle || task['task title'] || '',
          taskDetails: task.taskDetails || task['task details'] || '',
          assignedTo: task.assignedTo || task['assigned to'] || '',
          priority: (task.priority || 'Medium') as Task['priority'],
          dueDate: task.dueDate || task['due date'] ? new Date(task.dueDate || task['due date']) : null,
          photoNeeded: task.photoNeeded === 'Yes' || task.photoNeeded === true || task['photo needed'] === 'Yes',
          status: (task.status || 'Open') as Task['status'],
          photoURL: task.photoUrl || task['photo url'] || task.photoURL,
          notes: task.notes || '',
        }));
        setTasks(mappedTasks);
      } else {
        toast.error(response.error || 'Failed to load tasks');
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error(error.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updateData: any = {
        taskId: taskId,
        status: updates.status,
        priority: updates.priority,
        dueDate: updates.dueDate ? updates.dueDate.toISOString().split('T')[0] : undefined,
        photoNeeded: updates.photoNeeded,
        notes: updates.notes,
        taskTitle: updates.taskTitle,
        taskDetails: updates.taskDetails,
        assignedTo: updates.assignedTo,
        area: updates.area,
        trade: updates.trade,
      };

      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const response = await apiService.updateTask(taskId, updateData);
      if (response.success) {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
        toast.success('Task updated successfully');
      } else {
        toast.error(response.error || 'Failed to update task');
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error(error.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      await apiService.updateTask(taskId, { status: 'Closed' });
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task closed');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.message || 'Failed to close task');
    }
  };

  const handleAddTask = async (task: Omit<Task, 'id' | 'timestamp'>) => {
    try {
      const taskData: any = {
        project: task.project,
        area: task.area || '',
        trade: task.trade || '',
        taskTitle: task.taskTitle,
        taskDetails: task.taskDetails || '',
        assignedTo: task.assignedTo || '',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
        photoNeeded: task.photoNeeded || false,
      };

      const response = await apiService.addTask(taskData);
      if (response.success && response.task?.taskId) {
        const newTask: Task = {
          ...task,
          id: response.task.taskId,
          timestamp: new Date(),
        };
        setTasks([newTask, ...tasks]);
        toast.success('Task added successfully');
        await loadTasks();
      } else {
        toast.error(response.error || 'Failed to add task');
      }
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast.error(error.message || 'Failed to add task');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="size-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Construction Command Center</h1>
                <p className="text-sm text-gray-600">Master task tracking and management system</p>
              </div>
            </div>
            <button
              onClick={loadTasks}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="table">Master Task List</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            <TaskTable 
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
            />
          </TabsContent>

          <TabsContent value="dashboard">
            <Dashboard tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
