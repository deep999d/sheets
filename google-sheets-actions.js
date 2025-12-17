const { google } = require('googleapis');
const sheets = google.sheets('v4');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const MASTER_TAB_NAME = 'Master Tasks';

async function getSheetsClient() {
  const keyContent = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let keyData = keyContent;

  if (keyContent && typeof keyContent === 'string' && keyContent.trim().startsWith('{')) {
    try {
      keyData = JSON.parse(keyContent);
    } catch (e) {
      keyData = keyContent;
    }
  }

  return new google.auth.GoogleAuth({
    ...(typeof keyData === 'object' ? { credentials: keyData } : { keyFile: keyData }),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function addTaskToSheets(taskData) {
  const auth = await getSheetsClient();
  const timestamp = new Date().toISOString();
  const row = [
    timestamp,
    taskData.project || '',
    taskData.area || '',
    taskData.trade || '',
    taskData.taskTitle || '',
    taskData.taskDetails || '',
    taskData.assignedTo || '',
    taskData.priority || 'Medium',
    taskData.dueDate || '',
    taskData.photoNeeded ? 'Yes' : 'No',
    'Open',
    '',
    '',
  ];

  await ensureProjectTabExists(auth, taskData.project);

  const appendRow = async (range) => {
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] },
    });
  };

  await Promise.all([
    appendRow(`${MASTER_TAB_NAME}!A:M`),
    appendRow(`${taskData.project}!A:M`),
  ]);

  return { success: true, taskId: timestamp };
}

async function ensureProjectTabExists(auth, projectName) {
  const sheetsClient = sheets.spreadsheets;
  const spreadsheet = await sheetsClient.get({ auth, spreadsheetId: SPREADSHEET_ID });
  const existingTabs = spreadsheet.data.sheets.map(s => s.properties.title);
  
  if (existingTabs.includes(projectName)) return;

  await sheetsClient.batchUpdate({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{ addSheet: { properties: { title: projectName } } }],
    },
  });

  const headers = ['Timestamp', 'Project', 'Area', 'Trade', 'Task Title', 'Task Details', 'Assigned To', 'Priority', 'Due Date', 'Photo Needed', 'Status', 'Photo URL', 'Notes'];
  await sheets.spreadsheets.values.update({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${projectName}!A1:M1`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [headers] },
  });

  const sheetId = spreadsheet.data.sheets.find(s => s.properties.title === projectName).properties.sheetId;
  await sheetsClient.batchUpdate({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.2, green: 0.4, blue: 0.6 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      }],
    },
  });
}

async function getTasks(filters = {}) {
  const auth = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${MASTER_TAB_NAME}!A:M`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0];
  let tasks = rows.slice(1).map(row => {
    const task = {};
    headers.forEach((header, index) => {
      task[header.toLowerCase().replace(/\s+/g, '')] = row[index] || '';
    });
    return task;
  });

  if (filters.project) tasks = tasks.filter(t => t.project?.toLowerCase().includes(filters.project.toLowerCase()));
  if (filters.trade) tasks = tasks.filter(t => t.trade?.toLowerCase().includes(filters.trade.toLowerCase()));
  if (filters.assignedTo) tasks = tasks.filter(t => t.assignedto?.toLowerCase().includes(filters.assignedTo.toLowerCase()));
  if (filters.status) tasks = tasks.filter(t => t.status?.toLowerCase() === filters.status.toLowerCase());

  return tasks;
}

async function getSubcontractorTasks(assignedTo) {
  return getTasks({ assignedTo, status: 'Open' });
}

async function createProjectTab(projectName) {
  await ensureProjectTabExists(await getSheetsClient(), projectName);
  return { success: true, message: `Project tab '${projectName}' created successfully` };
}

module.exports = {
  addTaskToSheets,
  getTasks,
  getSubcontractorTasks,
  createProjectTab,
};

