const { sendWeeklyEmails } = require('../../index');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    return res.json(await sendWeeklyEmails(req.body.config || {}));
  } catch (error) {
    console.error('Error in weekly emails API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

