const { processTaskInput, getFilteredTasks } = require('../index');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      if (!req.body.project || !req.body.taskTitle) {
        return res.status(400).json({ success: false, error: 'Project and taskTitle are required' });
      }
      return res.json(await processTaskInput(req.body));
    }
    
    if (req.method === 'GET') {
      return res.json(await getFilteredTasks(req.query));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in tasks API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

