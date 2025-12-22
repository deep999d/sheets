const { addTaskToSheets, getTasks, getSubcontractorTasks, createProjectTab, initializeMasterTab, addContractor, updateTask } = require('./google-sheets-actions');
const EmailAutomation = require('./email-automation');

async function processTaskInput(taskData) {
  try {
    const result = await addTaskToSheets(taskData);
    return { success: true, task: result };
  } catch (error) {
    console.error('Error processing task input:', error);
    return { success: false, error: error.message };
  }
}

async function processMultipleTasks(tasksArray) {
  try {
    // Process tasks sequentially to avoid race conditions with row counting
    const results = [];
    for (const task of tasksArray) {
      const result = await addTaskToSheets(task);
      results.push(result);
    }
    return { 
      success: true, 
      tasksCreated: results.length,
      tasks: results 
    };
  } catch (error) {
    console.error('Error processing multiple tasks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get tasks with optional filters
 */
async function getFilteredTasks(filters = {}) {
  try {
    const tasks = await getTasks(filters);
    return {
      success: true,
      count: tasks.length,
      tasks
    };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get tasks for a specific subcontractor
 */
async function getSubcontractorTaskList(assignedTo) {
  try {
    const tasks = await getSubcontractorTasks(assignedTo);
    return {
      success: true,
      subcontractor: assignedTo,
      count: tasks.length,
      tasks
    };
  } catch (error) {
    console.error('Error getting subcontractor tasks:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a new project tab
 */
async function createNewProjectTab(projectName) {
  try {
    const result = await createProjectTab(projectName);
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Error creating project tab:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add a new contractor to the Contractors tab
 */
async function addNewContractor(contractorData) {
  try {
    const result = await addContractor(contractorData);
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Error adding contractor:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send weekly emails to all subcontractors
 */
async function sendWeeklyEmails(config) {
  try {
    const emailAutomation = new EmailAutomation(config);
    const results = await emailAutomation.sendWeeklyEmails();
    return {
      success: true,
      emailsSent: results.filter(r => r.success).length,
      results
    };
  } catch (error) {
    console.error('Error sending weekly emails:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processTaskInput,
  processMultipleTasks,
  getFilteredTasks,
  getSubcontractorTaskList,
  createNewProjectTab,
  sendWeeklyEmails,
  addTaskToSheets,
  getTasks,
  getSubcontractorTasks,
  createProjectTab,
  initializeMasterTab,
  addContractor: addNewContractor,
  updateTaskInSheets
};

if (require.main === module) {
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.post('/api/initialize', async (req, res) => {
    try {
      const result = await initializeMasterTab();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post('/api/contractors', async (req, res) => {
    if (!req.body.name) return res.status(400).json({ error: 'Contractor name is required' });
    try {
      res.json(await addNewContractor(req.body));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post('/api/tasks', async (req, res) => {
    if (Array.isArray(req.body)) {
      return res.json(await processMultipleTasks(req.body));
    }
    if (!req.body.project || !req.body.taskTitle) return res.status(400).json({ error: 'Project and taskTitle are required' });
    try {
      res.json(await processTaskInput(req.body));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.put('/api/tasks', async (req, res) => {
    if (!req.body.taskId) return res.status(400).json({ error: 'taskId is required' });
    try {
      res.json(await updateTaskInSheets(req.body.taskId, req.body));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get('/api/tasks', async (req, res) => {
    try {
      res.json(await getFilteredTasks(req.query));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get('/api/subcontractor/:assignedTo', async (req, res) => {
    try {
      res.json(await getSubcontractorTaskList(req.params.assignedTo));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post('/api/projects', async (req, res) => {
    if (!req.body.projectName) return res.status(400).json({ error: 'Project name is required' });
    try {
      res.json(await createNewProjectTab(req.body.projectName));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post('/api/emails/weekly', async (req, res) => {
    try {
      res.json(await sendWeeklyEmails(req.body.config || {}));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

